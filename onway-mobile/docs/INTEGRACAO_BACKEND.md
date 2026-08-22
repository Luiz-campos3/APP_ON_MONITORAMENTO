# Integração do app com o backend OnWay (API do cliente)

Guia para conectar o app mobile (Expo/React Native) à API `/api/v3/app/*` do
backend. Cobre configuração de rede, autenticação Bearer, endpoints e um cliente
HTTP pronto. Salve este arquivo em `docs/` do projeto do app.

---

## 1. Base URL da API

A API do app vive sob **`/api/v3/app`**. A base URL muda por ambiente:

| Ambiente | Base URL |
|---|---|
| **Produção (pública) — ATIVO** | `https://app.onwaytech.cloud` |
| ~~Teste via VPN (Tailscale)~~ — **DESLIGADO** | ~~`https://monitoramento-vps.tailec3b7b.ts.net`~~ |

> A API é pública no **mesmo host do portal web**. Borda: Cloudflare Tunnel →
> Traefik → nginx → backend. Não há porta aberta na VPS; o TLS é da Cloudflare
> (cert válido, HSTS). O proxy Tailscale antigo foi desativado (`tailscale serve`
> sem config) — a URL `*.ts.net` está morta e **não deve** ser usada.

**Configure via env do Expo** (`.env` na raiz do projeto do app):
```bash
EXPO_PUBLIC_API_URL=https://app.onwaytech.cloud
```
Vars com prefixo `EXPO_PUBLIC_` ficam acessíveis em `process.env.EXPO_PUBLIC_API_URL`.
Os perfis do `eas.json` já definem essa env nos builds. O app **recusa** URLs que
não comecem com `https://` (erro de configuração em runtime).

### Rede / pré-requisitos
- **Nenhuma VPN é necessária para a API** — ela responde publicamente. O
  Tailscale continua útil apenas para alcançar o **Metro** (bundler de dev)
  quando ele roda na VPS; veja `TESTE_VIA_TAILSCALE.md`.
- **HTTPS resolve o ATS do iOS** — cert válido da Cloudflare, sem exceção de App
  Transport Security. Não use `http://`.
- **Sem certificate pinning** — o certificado é da borda Cloudflare e rotaciona;
  pinning quebraria o app em campo.
- **CORS:** não se aplica a app nativo (fetch do RN não sofre CORS). O backend
  está com `CORS_ORIGINS` restrito de propósito — **não** teste com
  `expo start --web` contra produção, o navegador será bloqueado.
- **Limites da borda:** upload máx. **25 MB** (nginx), corpo JSON máx. **1 MB**,
  `proxy_read_timeout` de 120s (relevante para o OCR de faturas).
- **Rate limit por IP:** 300 req/15min na API geral; 10/15min em login+refresh
  (somente falhas contam); 20/15min em uploads/OCR. Trate `429` com backoff —
  nunca retry imediato em loop.

---

## 2. Autenticação (Bearer nativo)

Fluxo: **login** devolve `accessToken` (JWT curto, ~15 min) + `refreshToken`
(opaco, rotativo). O app guarda os dois de forma segura, manda
`Authorization: Bearer <accessToken>` nas chamadas, e usa o `refreshToken` para
renovar quando o access expira.

- **Guardar tokens:** use `expo-secure-store` (Keychain/Keystore). **Nunca**
  AsyncStorage/localStorage para tokens.
- **Rotação:** cada `/refresh` invalida o `refreshToken` anterior e devolve um
  novo. Reutilizar um refresh já usado **revoga a família inteira** (medida
  anti-roubo) → o app cai para a tela de login.
- **Mensagens genéricas:** senha errada e e-mail inexistente retornam o mesmo
  `401 "Credenciais inválidas"` (não revele "e-mail não existe" na UI).
- **Proteção contra força bruta (contrato REAL, revisado com o backend em
  20/08/2026):** existem **duas camadas**:
  1. **Lockout por conta** (chave = e-mail, independente de IP): **5 falhas de
     credencial → 15 min de bloqueio**. Barra ataque distribuído/com rotação de
     IP. *(Correção: a Fase A havia concluído erradamente que não existia — o
     teste nunca o disparou porque o 429 por IP abaixo intercepta a requisição
     **antes** do controller, então o contador da conta mal incrementa.)*
  2. **Rate limit da borda por IP**: ~10 falhas/15 min em login/refresh →
     `429 "Muitas tentativas de login, aguarde."` com `Retry-After`.
  Fragilidades conhecidas no backend (a decidir lá): o contador da conta não
  decai com o tempo (só zera com login OK) e o balde é **compartilhado com o
  login do portal web** — falhas no app podem travar o portal. Ver
  `EXECUCAO_FASE_A.md`.
- **`mustChangePassword`:** vem no login/`/me`; quando `true`, leve o usuário a
  trocar a senha via `POST /auth/change-password`.

### Endpoints de auth

```
POST /api/v3/app/auth/login            body: { email, password }
POST /api/v3/app/auth/refresh          body: { refreshToken }
POST /api/v3/app/auth/logout           body: { refreshToken }
POST /api/v3/app/auth/change-password  body: { currentPassword, newPassword } (Bearer)
```

### Contrato de erros confirmado no aceite A2 (19/08/2026, contra produção)

| Situação | Resposta real |
|---|---|
| **Forma do envelope de erro** | `{status:'error', message, errors:{code, details?}}` — o código fica **aninhado em `errors.code`** (objeto), **não** na raiz. O app lê via `readErrorCode`. *(Correção: a Fase A anotou `errors:[]`/"sem code" por não ter inspecionado o valor — o `code` sempre esteve lá.)* |
| `mustChangePassword` ativo × rota de dados | `403`, `errors.code = 'PASSWORD_CHANGE_REQUIRED'`, message "Troca de senha obrigatória" |
| Rotas liberadas durante troca forçada | `/me`, `/auth/change-password`, `/auth/refresh`, `/auth/logout` |
| `change-password` com senha atual errada | `403`, `errors.code = 'SENHA_ATUAL_INVALIDA'`, message "Senha atual inválida" (**não** 401) |
| `change-password` OK | `200`; **não** rotaciona tokens no corpo (sessão atual segue válida) |
| Refresh | rotaciona: novo access + novo refresh a cada chamada |
| Refresh após logout | `401` (sessão realmente encerrada) |
| Usina com id de formato inválido (não-UUID) | `400 "id da usina inválido"` |
| Usina de outro cliente (UUID válido) | `404 "Usina não encontrada"` |

**Resposta de login/refresh** (envelope padrão):
```json
{
  "status": "success",
  "message": "login ok",
  "data": {
    "usuario": {
      "id": "uuid",
      "nome": "Luiz Gustavo de Campos (TESTE)",
      "email": "luiz.onwayenergy@gmail.com",
      "tipo": "cliente_app",
      "mustChangePassword": true
    },
    "accessToken": "eyJ...",
    "refreshToken": "base64url..."
  }
}
```

---

## 3. Endpoints de dados (todos exigem `Authorization: Bearer`)

O **escopo é resolvido no servidor** pelo token — o app **nunca** envia
`clienteId`. Usina de outro cliente responde `404`.

```
GET /api/v3/app/me
GET /api/v3/app/dashboard
GET /api/v3/app/usinas
GET /api/v3/app/usinas/:usinaId
GET /api/v3/app/usinas/:usinaId/historico?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
```

### Chamados (contrato confirmado com o backend, 20/08/2026 — v1.6.0)

> Fonte canônica no repo do backend: `src/docs/app_chamados_api.md` (8 seções
> com exemplos). Resumo conferido contra o código abaixo.

```
GET  /api/v3/app/chamados                      lista paginada (todas as usinas)
GET  /api/v3/app/chamados/:chamadoId           detalhe com timeline
GET  /api/v3/app/usinas/:usinaId/chamados      lista de uma usina
GET  /api/v3/app/chamados/:chamadoId/anexo     baixa a foto (binário puro, SEM envelope)
POST /api/v3/app/usinas/:usinaId/chamados      abre um chamado (escopo = usina)
```

- **Criação é aninhada na usina** (o servidor deriva cliente/contrato dela; o
  app nunca envia `clienteId`). Usina de outro cliente → `404`.
- **Paginação** (listas): `?page` (1), `?limit` (20, teto rígido **50**),
  `?usinaId=<uuid>` opcional na lista geral. Resposta:
  `data.data[]` + `data.paginacao{page,limit,total}` (total do escopo inteiro).
- **POST** aceita `multipart/form-data` (com foto) ou `application/json` (sem):
  | Campo | Obrig. | Nota |
  |---|---|---|
  | `descricaoProblema` | **sim** | **mínimo 5 caracteres** (validar no cliente → evita round-trip; erro real é `400 "Descreva o problema (mínimo 5 caracteres)."`) |
  | `categoria` / `subcategoria` / `natureza` | não | string livre, truncada em 120; a triagem interna pode reclassificar |
  | `urgencia` | não | ex.: "alta" (40 chars) — é a "prioridade" |

  Não há campo de título/assunto: o protocolo é o `numero` (`CH-0043`) gerado
  pelo servidor.
- **Foto:** campo `foto`, **uma por chamado**, no mesmo POST. PNG/JPG/PDF,
  **≤ 10 MB** (acima → `400 "Arquivo excede 10MB"`, **não** 413 — comprimir no
  app). Extensão fora da lista **não dá erro**: o chamado é criado sem anexo e
  responde `201` com `temAnexo:false` — **checar `temAnexo` na resposta**.
- **Criação** responde `201` com o objeto Chamado completo (dá para inserir na
  lista local sem refetch). Campos (camelCase): `id`, `numero`, `status`,
  `statusLabel`, `encerrado`, `categoria`, `subcategoria`, `natureza`,
  `urgencia`, `descricaoProblema`, `usinaId`, `usinaNome`, `canalOrigem`,
  `dataCriacao`, `dataFechamento`, `temAnexo`, `criadoEm`.
- **Detalhe** traz `timeline[] = [{em: ISO, titulo}]` — só marcos públicos de
  estado ("Chamado aberto", "Em triagem", "Em atendimento", "O.S. gerada",
  "Chamado resolvido"). **Não há histórico de mensagens nem canal de resposta
  texto da operação → cliente** (feature nova, decisão de produto). Desenhar a
  tela como "acompanhe o andamento", não "converse com o suporte".
- **Status** (9, estáveis): usar o `status` bruto na lógica, exibir
  `statusLabel`, e usar `encerrado` (bool) em vez de comparar strings. Nasce em
  `novo`. `aguardando_cliente` é bom candidato a badge de destaque. O app **não
  transiciona estado** (nem cancela).
- **Rate limit do POST:** 20/15min por IP (mensagem da API fala "importações" —
  **não exibir a mensagem crua**, usar texto próprio). Leituras caem no global
  de 300/15min.

### `/me`
```json
{ "status":"success", "data": {
  "usuario": { "id":"...", "nome":"...", "email":"...", "tipo":"cliente_app", "mustChangePassword":false },
  "clientes": [ { "id":"uuid", "nome":"Luiz Gustavo de Campos (TESTE)" } ]
}}
```

### `/dashboard`
```json
{ "status":"success", "data": {
  "quantidadeUsinas": 4,
  "potenciaTotalKwp": 123.45,
  "geracaoMesKwh": 6789.0,
  "usinasNormais": 3,
  "usinasComAlerta": 1,
  "ultimaAtualizacao": "2026-07-06T12:00:00.000Z"
}}
```

### `/usinas` (lista) e `/usinas/:id` (mesmo objeto)
```json
{ "status":"success", "data": [ {
  "id": "uuid",
  "nome": "IE UFV-X01",
  "cidade": "…",
  "fabricante": "Sungrow",
  "status": "ok",
  "temAlerta": false,
  "alertaMensagem": "Operação Normal",
  "monitoramentoAtivo": true,
  "potenciaKwp": 30.0,
  "potenciaPlacaKwp": 33.6,
  "qtdPlacas": 60,
  "geracaoAtual": 12.3,
  "geracaoAcumuladaKwh": 45678.9,
  "geracaoMesKwh": 1500.0,
  "expectativaMensalKwh": 1800.0,
  "expectativaMesAteHojeKwh": 1180.0,
  "fonteExpectativa": "historico",
  "expectativaAnualKwh": 21600.0,
  "ultimaLeitura": "2026-07-06T11:50:00.000Z",
  "fonteLeitura": "sungrow"
} ] }
```
> Nunca vêm credenciais de portal, `vendor_plant_id` ou payload bruto.

**Status/alerta da usina (confirmado 22/08/2026, ISS-031).** O campo real é
`temAlerta` (boolean) + `alertaMensagem` (string) — **`alerta` nunca existiu** (o app
corrigiu a leitura; o fallback ao legado é código morto inofensivo). Vêm do `mapUsina`,
idênticos na lista e no detalhe.
- `status`: **`'ok' | 'warning' | 'error' | null`** — sinal mais rico; reflete o status
  do **portal do fabricante** (os 7 coletores gravam `usinas.status`). Distribuição em
  22/08: 318 ok, 44 warning, 161 error, 2 null.
- `temAlerta` é literalmente **`status !== 'ok'`** → dá para distinguir atenção
  (`warning`) de crítico (`error`) sem campo novo (follow-up de UI no app).
- `alertaMensagem`: texto do alerta; **"Operação Normal"** quando ok (não é vazio);
  **`null` só** quando a usina nunca foi coletada (`status` null → `temAlerta` true, msg
  null). O app deve **tolerar mensagem nula**. Não usar `alertaMensagem != null` como
  proxy de alerta — o booleano é `temAlerta`.
- ⚠️ **Fonte independente da Central de Alertas** (`/alertas`): portal do fabricante e
  feed podem discordar (`baixa_geracao`/`sem_comunicacao` do feed **não** acendem
  `temAlerta`). Se o selo "Atenção" deve refletir o feed, o critério tem que ser o feed.

**Expectativa de geração (issue #36 / PR #40, deployado e validado contra a conta
de teste em 20/08/2026).** Derivada de `usina_leitura` (P80 do rendimento
específico do histórico da própria usina), vendor-independent:
- `expectativaMesAteHojeKwh` (number | null): esperado **acumulado até ONTEM** — é
  o **denominador do "% da previsão"** (o app compara `geracaoMesKwh` mês-até-hoje
  com este, nunca com o mês cheio, senão toda usina pareceria ruim no início do mês).
- `expectativaMensalKwh` (number | null): **meta do mês cheio** (só para exibir; não
  é denominador do %). Antes do #40 este campo não vinha para 6/7 fabricantes.
- `fonteExpectativa` (`'historico'` | `'sem_historico'`): quando `sem_historico`
  (usina sem série suficiente) **os dois kWh vêm `null`** — o app degrada com rótulo
  próprio ("Sem histórico ainda"), sem número inventado.
- `expectativaAnualKwh`: **morto** (null p/ quase toda a frota) — o app não usa.

Validação ao vivo (4 usinas Sungrow da conta de teste, 20/08): 5 campos presentes,
`fonteExpectativa=historico`, `geracaoMes/mesAteHoje` = 105–109%, `mesAteHoje` ≈ 61%
do mês cheio (≈ 19 de 31 dias). Cobertura: 342 de 525 usinas com expectativa viva.

### `/usinas/:id/historico`
`inicio`/`fim` (opcionais) ativam a visão "período" (intervalo máx. 366 dias).
```json
{ "status":"success", "data": {
  "historico": {
    "dia": [/* 24 valores kWh/hora */],
    "diasHorarios": [ { "data":"2026-07-06", "label":"Hoje", "total":12.3, "horas":[/*24*/] } ],
    "semana": [/*7*/], "semanaLabels": ["01/07","…","Hoje"],
    "mes": [/*dias do mês*/], "mesLabels": [],
    "ano": [/*meses*/], "anoLabels": ["jan/26","…"],
    "custom": [], "customLabels": [],
    "ultimaLeitura": "2026-07-06T11:50:00.000Z",
    "ultimaFonte": "sungrow"
  },
  "fonte": "sungrow",        // ou "sem_dados" quando não há leitura
  "computedAt": "2026-07-06T12:00:00.000Z"
}}
```

### OCR de fatura (`POST /usinas/:usinaId/faturas/ocr`)

Confirmado no aceite A2 (19/08/2026). Multipart no campo **`arquivo`** (PDF ou
imagem, ≤ 25 MB). Processa em ~3 s (limite 120 s). **Não grava** — devolve para
confirmação. Resposta (`data`), com os campos **aninhados em `campos`** e em
**snake_case** (⚠️ não confundir com o camelCase do `ApiInvoice`):

```json
{ "status": "success", "message": "Fatura lida — revise antes de confirmar.",
  "data": {
    "campos": {
      "mes_ano": "05/2026", "consumo_kwh": 340, "injetado_kwh": 415,
      "valor_pago": 192.5, "preco_unitario": null, "concessionaria": "NEOENERGIA",
      "titular_nome": null, "unidade_consumidora": null,
      "confianca": { "mes_ano": "alta", "valor_pago": "alta" }
    },
    "avisos": [],
    "titularidade": { "status": "indeterminado", "motivo": "…" },
    "ocr_ref": "…"
  }}
```

O app traduz isso via `toOcrExtraction` (`domain/contract.ts`) — `mes_ano`
"MM/YYYY" é normalizado para a chave "YYYY-MM".

### Sessões (contrato v1.6.1 confirmado contra produção, 20/08/2026)

Uma entrada **por aparelho (família)**, não por linha (o id da linha rotaciona a
cada refresh; `familyId` é estável). Ficam atrás do gate de troca de senha (403
`PASSWORD_CHANGE_REQUIRED` com `mustChangePassword` ativo).

```
GET    /api/v3/app/me/sessions             lista as sessões ativas do usuário
DELETE /api/v3/app/me/sessions/:familyId   revoga uma família (idempotente)
DELETE /api/v3/app/me/sessions             desconecta as OUTRAS (a atual sobrevive)
```

- **GET** → `data: { data: [ {familyId, dispositivo, iniciadaEm, ultimoUso,
  expiraEm, isCurrent} ], total }`. `dispositivo` é o user-agent cru (pobre até
  o registro de push trazer marca/modelo); `isCurrent` vem da comparação com o
  claim `sid` do token. Sem paginação, sem IP.
- **DELETE :familyId** → `data: { familyId, linhasRevogadas, eraAtual }`.
  `eraAtual:true` = o usuário desconectou o próprio aparelho → o app cai ao
  login (o access token morre na próxima chamada). **Idempotente**: revogar já
  revogada → 200 com `linhasRevogadas:0`. `400 "id de sessão inválido"` (uuid
  malformado), `404 "Sessão não encontrada"` (família que não é sua).
- **DELETE (sem id)** → `data: { sessoesRevogadas }` (conta famílias).
- **Revogação mata o access token na hora** (o middleware checa `sid` a cada
  request): o aparelho revogado recebe `401 "Sessão invalidada"` — tratar como
  qualquer 401 (refresh 1×, falha, limpa tokens, login).

### Central de alertas (contrato v1.7.1 validado contra produção, 20/08/2026)

**Feed unificado**, montado no servidor: linhas da tabela `alertas` (`origem:'tabela'`)
+ comunicação/estado derivado ao vivo de `usinas.status` para **todos os vendors**
(`origem:'derivado'`). Decisão do crux: derivar em vez de materializar "sem comunicação"
mantém o app honesto sem despejar ~190 alertas de usinas paradas há anos. O feed já
vem **ordenado** (não lido → crítico → mais recente).

```
GET  /api/v3/app/alertas?status=aberto|resolvido|todos&page=1&limit=20   (default aberto)
GET  /api/v3/app/alertas/:id                    detalhe (alheio/inexistente → 404)
POST /api/v3/app/alertas/marcar-lidos           body {ids?} (sem ids = todos os abertos)
```

- **GET lista** → `data: { alertas: [ {…} ], total, naoLidos, paginacao:{page,limit,total} }`.
  Objeto por alerta (13 campos, validados 1:1 contra produção):
  `id, usinaId, usinaNome, cidade, tipo, severidade('critical'|'warning'), titulo,
  mensagem, status('aberto'|'resolvido'), abertoEm, resolvidoEm, lido, origem('tabela'|'derivado')`.
  `titulo`/`mensagem` já vêm **prontos do servidor** (não hardcodar copy no app).
- **Taxonomia de `tipo`:** `sem_comunicacao` (critical, derivado de `status='error'`),
  `baixa_geracao` (tabela), `atencao_operacional` (warning, derivado de `status='warning'`;
  ex.: "Inversor em espera", "Usina não comissionada"), e os de tabela só-histórico
  `sem_conexao_envoy`/`micro_baixa_producao`/`micro_falha_producao`/`problema_medidor`.
  `sla_vencido` **não** entra (operacional; sem `usina_id`). O app tolera `tipo`
  desconhecido (ícone de sino como fallback).
- **Alerta `derivado` não tem estado resolvido**: some do feed ao recuperar. Filtros
  `resolvido`/`todos` valem **só para linhas de tabela**. `abertoEm` do derivado é a
  última **geração** (não a última leitura). Uma usina pode aparecer **2×** com
  diagnósticos diferentes (ex.: `baixa_geracao` tabela + `sem_comunicacao` derivado).
- **GET :id** → mesmo objeto. `alertaId` derivado é estável enquanto a condição
  existir; se a usina recuperar antes do toque → **404** → o app trata como "já
  resolvido" e cai para `/plant/[id]`.
- **POST marcar-lidos** → `data: { naoLidos }`. `lido` é **por usuário**. Idempotente,
  teto de 500 ids, id alheio silenciosamente ignorado. Sem `ids` = marca todos os
  abertos do usuário.
- **Deep link (push):** `data = {tipo:'alerta', usinaId, alertaId}`.

### Exclusão de conta (I9 — PR #42 / v1.7.3, validado contra produção 22/08/2026)

`POST /api/v3/app/me/exclusao` `{ currentPassword }` — reautenticação obrigatória, escopo
do próprio usuário, **ANTES** do gate de troca de senha (Apple exige caminho sem obstáculo).
Soft-delete com anonimização: conta = **login** (dados comerciais do cliente são retidos por
lei; a conta irmã do mesmo cliente não é afetada).

200 (imediato/irreversível) — textos **prontos do servidor** (a edição jurídica do I4 nos
`retido[]` aparece automaticamente no app):
```json
{ "modo": "imediato", "dataEfetiva": "2026-08-22T19:44:43.665Z", "sessoesRevogadas": 4,
  "removido": [ "Acesso ao aplicativo (login desativado imediatamente)",
    "Nome, e-mail e telefone da conta", "Senha e segundo fator",
    "Sessões e dispositivos conectados", "Preferências e marcações de leitura de alertas" ],
  "retido": [
    { "item": "Faturas e documentos fiscais", "prazo": "5 anos", "porque": "CTN arts. 173/174." },
    { "item": "Contrato e registros de execução (O.S., chamados)", "prazo": "5 anos após o término do contrato", "porque": "LGPD art. 16, I e III." },
    { "item": "Dados de geração das usinas", "prazo": "enquanto durar a relação com o titular", "porque": "São da usina/cliente, não da conta de acesso." },
    { "item": "Registro de auditoria da própria exclusão", "prazo": "5 anos", "porque": "LGPD art. 37." } ],
  "politicaVersao": "exclusao-conta-app/2026-08" }
```
Erros: **403** `errors.code=SENHA_ATUAL_INVALIDA` (senha errada), 400 (sem senha), 401 (sessão morta).
App: `mobileApi.deleteAccount(currentPassword)` + `settings/delete-account.tsx` (aviso →
reentrada de senha → POST → tela final com `removido[]`/`retido[]`/`dataEfetiva` → logout).
**Validado 6/6 ao vivo** (conta descartável): senha errada→403; exclusão→200; login excluído→401;
conta irmã intacta (loga e vê 4 usinas).

### Códigos de erro
| Código | Quando |
|---|---|
| `400` | validação (ex.: data inválida, intervalo > 366 dias, id de usina não-UUID) |
| `401` | sem/token inválido/expirado, ou credenciais inválidas |
| `403` | troca de senha obrigatória (`errors.code=PASSWORD_CHANGE_REQUIRED`) · senha atual inválida no change-password (`errors.code=SENHA_ATUAL_INVALIDA`) — distinguir pelo **`errors.code`** |
| `404` | usina/chamado fora do escopo do usuário |
| `429` | rate limit por IP (login/refresh 10/15min; POST chamados 20/15min; global 300/15min) |

Erro padrão: `{ "status":"error", "message":"…", "errors": { "code":"…", "details"?:… } }`
— o código fica **aninhado em `errors.code`** (objeto), não na raiz. O lockout
por conta (5 falhas/15min por e-mail) responde no login, não nas rotas de dados.

---

## 4. Cliente HTTP pronto (Expo)

Instale:
```bash
npx expo install expo-secure-store
```

`src/api/client.ts` (ou `.js` — remova os tipos):
```ts
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const ACCESS = 'onway.accessToken';
const REFRESH = 'onway.refreshToken';

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}

async function raw(path: string, opts: RequestInit = {}, access?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(access ? { authorization: `Bearer ${access}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// --- Auth ---
export async function login(email: string, password: string) {
  const { status, body } = await raw('/api/v3/app/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  if (status !== 200) throw new Error(body?.message || 'Falha no login');
  await saveTokens(body.data.accessToken, body.data.refreshToken);
  return body.data.usuario;
}

async function refresh(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
  if (!refreshToken) throw new Error('sem sessão');
  const { status, body } = await raw('/api/v3/app/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  });
  if (status !== 200) { await clearTokens(); throw new Error('sessão expirada'); }
  await saveTokens(body.data.accessToken, body.data.refreshToken);
  return body.data.accessToken;
}

export async function logout() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
  if (refreshToken) {
    await raw('/api/v3/app/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  }
  await clearTokens();
}

// --- GET autenticado com retry automático no 401 (refresh 1x) ---
export async function apiGet(path: string) {
  let access = await SecureStore.getItemAsync(ACCESS);
  let { status, body } = await raw(path, {}, access ?? undefined);
  if (status === 401) {
    access = await refresh();               // tenta renovar
    ({ status, body } = await raw(path, {}, access));
  }
  if (status >= 400) throw new Error(body?.message || `Erro ${status}`);
  return body.data;
}

// --- Helpers de tela ---
export const getMe        = () => apiGet('/api/v3/app/me');
export const getDashboard = () => apiGet('/api/v3/app/dashboard');
export const getUsinas    = () => apiGet('/api/v3/app/usinas');
export const getUsina     = (id: string) => apiGet(`/api/v3/app/usinas/${id}`);
export const getHistorico = (id: string, inicio?: string, fim?: string) =>
  apiGet(`/api/v3/app/usinas/${id}/historico${inicio && fim ? `?inicio=${inicio}&fim=${fim}` : ''}`);
```

Uso numa tela:
```ts
import { login, getUsinas, getDashboard } from '../api/client';

await login('luiz.onwayenergy@gmail.com', 'SENHA_DE_TESTE'); // senha vem por canal seguro, não commitar
const dash = await getDashboard();   // { quantidadeUsinas: 4, ... }
const usinas = await getUsinas();    // 4 usinas
```

---

## 5. Checklist para o primeiro teste

1. `EXPO_PUBLIC_API_URL=https://app.onwaytech.cloud` (sem VPN, funciona em 4G).
2. `npx expo start` → abrir no Expo Go ou dev client.
3. `login(...)` com a conta de teste → esperar **4 usinas** em `/usinas`,
   `quantidadeUsinas: 4` no dashboard, detalhe e histórico OK.
4. Tentar abrir uma usina de outro cliente (UUID aleatório) → deve dar `404`.
5. Errar a senha várias vezes → `429 "Muitas tentativas de login, aguarde."`
   com `Retry-After ~30s` (rate limit **por IP**). Há **também** lockout **por conta**
   (chave = e-mail, 5 falhas/15min — ver §2), independente do IP. ⚠️ evitar em
   demonstrações com vários aparelhos: cada falha conta e pode travar a conta de teste.
6. Esperar o access token expirar (~15 min) → refresh transparente, sem voltar
   ao login.

> **Segurança:** a senha de teste é entregue por canal seguro (chat), **não**
> deve ser commitada.
