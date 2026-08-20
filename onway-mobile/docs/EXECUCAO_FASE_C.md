# Registro de Execução — Fase C (Alertas reais, push e sessões)

> Autorizada pelo usuário em 20/08/2026. Fase **backend-first**: o app só avança
> depois dos contratos. Mesma regra: cada execução documentada, desvios
> registrados, nenhuma fase nova sem autorização.

## Status

| Frente | Estado (após resposta do backend, 20/08) |
|---|---|
| Prompt de contratos | ✅ Enviado e respondido |
| **Sessões** | 🟡 Máquina pronta no portal; falta o backend portar 2 rotas p/ `authenticateApp` (tamanho P, "uma tarde"). Recomendado **1º** |
| **Alertas** | 🟠 Tabela + jobs existem mas **CONGELADOS** (bug de produção); precisa fechar ciclo de vida + produtor de conectividade + leitura por usuário + 4 rotas (tamanho G). Recomendado **2º** |
| **Push** | ⛔ Do zero (tamanho GG); nasce junto com preferências |
| **Preferências** | ⛔ Só coluna `usuarios.notif` morta; nascem com o push |
| Trabalho no app | ⏸ Backend constrói as rotas primeiro; push exige **dev build**, não Expo Go |

Pré-requisito técnico já resolvido na Fase A: a camada HTTP aceita PATCH/DELETE.

## Resposta do backend (20/08/2026) — resumo e correção de entendimento

**Nada da Fase C existe na API do app hoje.** Fundações por item:

- **Correção importante (premissa errada no plano):** os alertas que o app
  mostra hoje **não são derivação local falsa**. `temAlerta`, `status` e
  `alertaMensagem` (de `/usinas` e `/dashboard`) são **calculados no servidor a
  cada coleta** (regras por fabricante: Sungrow/Enphase) e persistidos. Ou seja,
  a fonte da verdade de "esta usina está com problema" **já é do servidor e está
  viva**. O `toPlantAlerts` do app só formata isso. **Consequência:** não trocar
  ingenuamente essa derivação viva pela tabela `alertas` — ver bug abaixo.

- **⚠️ Bug de produção nos alertas (independe do app):** a tabela `alertas` +
  jobs BullMQ existem, mas **os alertas nunca se resolvem sozinhos** (não há
  `UPDATE ... status='resolvido'` em lugar nenhum). Com o índice único parcial +
  `ON CONFLICT DO NOTHING`, cada usina trava 1 alerta aberto por tipo **para
  sempre**. Efeito: os 50 alertas `baixa_geracao` são todos de **29/07**; o job
  roda de hora em hora há 3 semanas e **não gera nada novo**. Como fonte de push
  hoje, emitiria **zero** notificações. Afeta o **portal interno agora**, não só
  o app. O backend ofereceu tratar como **correção própria e prioritária** —
  decisão do usuário.

- **Sessões:** a máquina está inteira (tabela `user_sessions`, rotação por
  família, `revokeOwn`/`revokeFamily`, e as rotas equivalentes no portal). É só
  portar 2 handlers para `authenticateApp`. A conta de teste tem **6 sessões
  ativas** agora — a tela já teria o que mostrar.

- **Push e Preferências:** do zero. `usuarios.notif` (jsonb) existe mas é campo
  morto, sem categorias e sem consumo no envio.

## Decisões de app que o backend pediu (para não construir contra suposição)

**1. Mapa de deep link `onwayclient://` (para fixar o `data` do push).** Rotas do
app (Expo Router; grupos entre parênteses somem da URL):

| tipo do evento | `data` do push | Tela de destino no app |
|---|---|---|
| `alerta` | `{ tipo:'alerta', usinaId, alertaId? }` | `usinaId` → `/plant/<usinaId>`; sem ele → aba Alertas |
| `chamado` | `{ tipo:'chamado', chamadoId, usinaId? }` | `/tickets/<chamadoId>` |
| `fatura` | `{ tipo:'fatura', faturaId, usinaId? }` | `faturaId` → `/invoices/<faturaId>`; senão `/plant/<usinaId>` |

Rotas de detalhe confirmadas no app: `/plant/[id]`, `/tickets/[id]`,
`/invoices/[id]`; aba de alertas em `/(tabs)/alerts`. O app roteia pelo `tipo` +
id (não precisa de URL crua). **Chaves curtas e estáveis; `usinaId` sempre que
fizer sentido, para contexto sem round-trip.** O texto da push **não** leva PII
(regra escrita: nome da usina + natureza do evento; valor em R$ fica atrás do
toque).

**2. Sessões — revogar por FAMÍLIA, não por id.** Concordo com a recomendação do
backend: para o usuário, "sessão" = dispositivo. O `id` da linha rotaciona a
cada refresh (um DELETE por id daria 404 logo depois), então expor `familyId`
como identificador estável e revogar por família (`revokeFamily`). `isCurrent`
sai de graça comparando o claim `sid` do access token. Expor `ultimoUso`
(created_at da linha viva) e "iniciada em" (linha mais antiga da família). E o
botão "desconectar outros dispositivos" = `DELETE /me/sessions` (sem id).

**3. Ordem aprovada (recomendação):** Sessões → Alertas (bug do ciclo de vida
primeiro) → Push + Preferências juntos.

## Contratos PROPOSTOS pelo backend (ainda não construídos — não são reais)

> Só entram no `INTEGRACAO_BACKEND.md` quando existirem e forem validados contra
> produção (mesma disciplina das fases A/B).

- **Sessões:** `GET /api/v3/app/me/sessions` (id/familyId, dispositivo, criada
  em, ultimoUso, isCurrent) · `DELETE /me/sessions/:familyId` · `DELETE
  /me/sessions` (outras).
- **Alertas:** `GET /alertas?status=&page=&limit=` (data.data[]+paginacao;
  id, usinaId, usinaNome, tipo, severidade, titulo, mensagem, abertoEm,
  resolvidoEm, lido) · `GET /alertas/nao-lidos` → {total} · `PATCH /alertas/:id`
  {lido:true} · `POST /alertas/marcar-todos-lidos`.
- **Push:** `POST /api/v3/app/devices` {expoPushToken, plataforma, appVersion,
  modelo?} (upsert por token) · `DELETE /devices` {expoPushToken}.
- **Preferências:** `GET/PATCH /api/v3/app/me/preferencias` — categorias
  propostas: `alertas_usina`, `chamados`, `faturas` (bool, default on).

## Prompt enviado ao backend (20/08/2026)

```text
Contexto: estou iniciando a Fase C do app OnWay Cliente — alertas reais, push
notifications e sessões. A API é `https://app.onwaytech.cloud/api/v3/app`.
Preciso dos contratos reais; leia o código e responda, sem mudar comportamento
sem confirmar comigo. O app já suporta PATCH/DELETE.

1. ALERTAS (hoje o app DERIVA alertas localmente da lista de usinas — quero a
   fonte da verdade no servidor)
   - Existe `GET /api/v3/app/alertas`? Rotas e métodos.
   - Qual é a REGRA OFICIAL que gera um alerta (usina offline, baixa geração,
     falha)? É avaliada no servidor? Com que critério/limiar e com que
     frequência?
   - Campos de um alerta: id, usinaId, tipo/categoria, severidade, título,
     mensagem, timestamp, lido/não-lido.
   - Como marcar como lido (ex.: PATCH /alertas/:id) e há contador de não lidos?
   - Paginação e escopo (só as usinas do cliente).

2. DISPOSITIVOS / PUSH
   - Existe registro de push token? Ex.: POST/DELETE /devices — campos
     (expoPushToken, plataforma ios/android, versão do app, modelo?). Um usuário
     pode ter vários dispositivos? A remoção é por token ou por id?
   - O backend envia via Expo Push API? Processa os receipts e limpa tokens
     inválidos (DeviceNotRegistered)?
   - Qual o PAYLOAD da notificação, em especial o campo `data` para DEEP LINK
     (ex.: { tipo, usinaId, alertaId })? O app precisa das chaves exatas para
     rotear o toque para a tela certa (scheme `onwayclient`).
   - Confirmar que o TEXTO da notificação não leva PII/dado sensível (aparece na
     tela bloqueada).

3. PREFERÊNCIAS DE NOTIFICAÇÃO
   - Existe endpoint de preferências por usuário? Quais categorias
     (ex.: usina_offline, relatorio_mensal, atendimento)? GET/PUT/PATCH.
   - O envio respeita essas preferências no servidor?

4. SESSÕES
   - `GET /api/v3/app/me/sessions` (ou equivalente): campos por sessão (id,
     dispositivo/user-agent, criada em, último uso, isCurrent?).
   - `DELETE /me/sessions/:id` revoga uma sessão (invalida o refresh token da
     família)? Dá para revogar todas menos a atual?
   - Como isso se encaixa na rotação/família de refresh token que já existe.

5. PANORAMA
   - Para cada item, diga o que JÁ existe vs precisa ser construído, e uma ordem
     recomendada (sessões costuma ser o mais simples; alertas é o de maior
     valor).

Itens ainda abertos das fases anteriores (mantendo no radar, não são da Fase C):
exclusão de conta (I9, desenho já proposto), ajustes de lockout (baldes
app/portal separados + decaimento), e `code` na raiz do envelope de erro.

ENTREGA: contratos + o que falta construir, em texto. Nada precisa ser commitado
por mim.
```

## Considerações registradas antes de começar o app

- **Push não roda no Expo Go** — exige dev build (EAS). O teste de ponta a ponta
  de push (registro, recebimento, deep link) só no dev build; o restante
  (central de alertas, sessões, preferências) roda no Expo Go.
- **Substituir a derivação local `toPlantAlerts`** pela central que consome o
  endpoint — a lógica local vira fallback/none.
- **Preferências**: reintroduzir "Relatório mensal" e "Atendimento" (removidas na
  limpeza da migração) agora com efeito real, sincronizadas com o backend.
- **Sessões**: `settings/sessions.tsx` hoje mostra 1 card estático — vira lista
  real com revogação (usa o DELETE já disponível na camada HTTP).
