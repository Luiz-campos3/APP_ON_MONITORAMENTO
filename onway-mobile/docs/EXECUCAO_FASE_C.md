# Registro de Execução — Fase C (Alertas reais, push e sessões)

> Autorizada pelo usuário em 20/08/2026. Fase **backend-first**: o app só avança
> depois dos contratos. Mesma regra: cada execução documentada, desvios
> registrados, nenhuma fase nova sem autorização.

## Status

| Frente | Estado (após resposta do backend, 20/08) |
|---|---|
| Prompt de contratos | ✅ Enviado e respondido |
| **Sessões** | 🟡 Máquina pronta no portal; falta o backend portar 2 rotas p/ `authenticateApp` (tamanho P, "uma tarde"). Recomendado **1º** |
| **Alertas — bug de ciclo de vida** | ✅ **CORRIGIDO EM PRODUÇÃO (v1.6.1, 20/08)** — 50→1 alerta real, 45 órfãos fechados, nada deletado. Feature de alertas do app (rotas + leitura por usuário + cobertura da frota via #36) ainda pendente |
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

## Prompt de autorização — conserto do bug de ciclo de vida dos alertas (20/08)

> Enviado ao backend como **correção própria e prioritária**, separada da feature
> de alertas da Fase C. Escopo: só o ciclo de vida (fechar alertas quando a
> condição some) + limpeza do dado legado. NÃO inclui rotas do app nem leitura
> por usuário.

```text
Autorizado: conserte o bug de ciclo de vida dos alertas como um item próprio e
prioritário. É produção e afeta o portal interno hoje. Escopo ESTRITO: fazer os
alertas se resolverem sozinhos e limpar o dado legado travado. NÃO construa
ainda as rotas do app, leitura por usuário nem produtor de conectividade — isso
é a Fase C do app e vem depois.

Diagnóstico (confirme contra o código antes de mexer):
- Não há em lugar nenhum um UPDATE alertas SET status='resolvido' — alertas
  nunca fecham sozinhos.
- O índice único parcial uq_alerta_aberto_usina (usina_id, tipo) WHERE
  status <> 'resolvido' + ON CONFLICT DO NOTHING faz cada usina travar 1 alerta
  aberto por tipo para sempre. Resultado: os ~50 baixa_geracao são todos de
  29/07; o job roda de hora em hora e não gera nada novo há 3 semanas.

O que fazer:
1. Passo de RESOLUÇÃO nos jobs, preenchendo resolved_at e status='resolvido'
   quando a condição deixa de valer:
   - baixa_geracao: resolver quando usinas.prognostico voltar >= LOWGEN_THRESHOLD
     (ou a usina for deletada / monitoramento desligado).
   - sla_vencido: resolver quando o chamado correspondente ficar resolvido ou
     cancelado.
   Depois disso, o índice libera e novos alertas voltam a nascer naturalmente.
2. Dado legado travado:
   - Reavaliar os baixa_geracao de 29/07 na primeira rodada com a lógica nova
     (os que já não valem, fecham).
   - Tipos órfãos do backfill Enphase (sem_conexao_envoy, micro_baixa_producao,
     micro_falha_producao, problema_medidor) não têm produtor vivo. Proponha
     como tratá-los (fechar como obsoletos?) e me diga antes de aplicar.
3. Opcional, se for barato: atualizar a severidade na transição
   warning<->critical quando o prognóstico cruza 50% (hoje ela é fixada na
   criação). Se não for trivial, deixe para depois.

Restrições:
- RESOLVER, nunca DELETAR — preserve o histórico (resolved_at).
- Rode um dry-run e me mostre quantos alertas fechariam ANTES de aplicar.
- Testes cobrindo: abre quando a condição vale, fecha quando some, não duplica.
- Reporte a contagem antes/depois (abertos por tipo) para confirmar o efeito.

Entrega: o que mudou + as contagens. E confirme que o portal interno volta a
mostrar alertas que refletem a realidade.
```

## Conserto do ciclo de vida — resultado + 2º bug descoberto (20/08)

**Ciclo de vida: consertado e provado.** Regra isolada em `alertas.lifecycle.js`
(testável sem Postgres); cada job roda RESOLVER → ATUALIZAR → ABRIR. 15 specs
novos, 184/184 verdes, e **6 cenários reais contra Postgres** passaram —
incluindo **fechar (bug) e reabrir**, que prova que o índice não trava mais.
Severidade/mensagem/payload reavaliam na travessia dos 50% (extensão barata que
o backend fez e sinalizou). Tudo UPDATE, nunca DELETE (`resolved_at` preserva
histórico).

**⚠️ 2º bug (mais fundo) — `prognostico` é campo morto para 6/7 coletores.** A
regra `baixa_geracao` lê `usinas.prognostico`, mas **só a Sungrow escreve esse
campo** (varredura dos 7 coletores). Enphase/GoodWe/Fronius/CSI/Sunweg/SolarEdge
têm `prognostico` congelado do backfill de julho. Por isso o **dry-run em
produção move ZERO**: os 48 de 50 `baixa_geracao` continuam `< 85` por dado
parado, não por realidade. O ciclo de vida está certo, mas a lista do portal
**não muda** com este deploy.

**Fonte viva continua sendo `usinas.status`/`alerta`** (atualizada a cada coleta
por todos os coletores) — é o que o app já mostra. Reforça a decisão de **não**
migrar a aba de Alertas do app para a tabela `alertas` até os produtores serem
consertados.

**Contagens em produção hoje (nada aplicado):** `baixa_geracao` 50 abertos
(36 critical / 14 warning); órfãos do backfill Enphase 45 abertos
(`sem_conexao_envoy` 32, `micro_baixa_producao` 11, `micro_falha_producao` 1,
`problema_medidor` 1); `sla_vencido` 0.

### Concern técnico levantado por nós: fechar os 48 sozinho gera CHURN

O índice único é parcial (`WHERE status <> 'resolvido'`) + `ON CONFLICT DO
NOTHING`. Se resolvermos um `baixa_geracao` cujo `prognostico` segue `< 85`
(congelado), o índice libera e o **ABRIR do próximo tick recria** o alerta —
agora com `opened_at` de hoje, parecendo "fresco" mas ainda derivado de dado de
julho. Ou seja: fechar os 48 **só cola** se a regra parar de dispará-los. Por
isso a recomendação abaixo escopa a detecção ao `prognostico` vivo.

### Decisões (recomendação registrada)

1. **Órfãos Enphase (45):** fechar como obsoletos (`status='resolvido'`,
   `resolved_at`, payload `{"encerrado_por":"backfill_sem_produtor"}`), nunca
   deletar. **Aprovar** — não têm produtor, não reabrem. ✅
2. **48 `baixa_geracao` de fabricante sem `prognostico` vivo:** **não** basta
   fechar (churn acima). Recomendação: **escopar a regra `baixa_geracao` ao
   `prognostico` vivo** (só coletores que escrevem o campo — Sungrow hoje), o que
   torna os 48 inelegíveis → o resolvedor os fecha e o abridor não os recria; e
   abrir **item separado** "todos os coletores escreverem `prognostico`" para
   reabilitar a regra na frota inteira depois.
3. **Pergunta correlata para o app:** `expectativaMensalKwh` (que o app usa em
   "% da previsão" no dashboard e no checkup) é atualizado por **todos** os
   coletores ou também está congelado como `prognostico`? Se congelado, o app
   mostra "% da previsão" desatualizado para 6/7 fabricantes — seria um achado
   de honestidade do app, a verificar.

### Prompt de autorização enviado ao backend (20/08)

```text
Ciclo de vida aprovado e ótimo — abra o PR. Sobre o dado legado e o 2º bug
(prognostico morto para 6/7 coletores), decisões:

1. Órfãos do backfill Enphase (45 abertos: sem_conexao_envoy, micro_*,
   problema_medidor): AUTORIZADO fechar como obsoletos — status='resolvido',
   resolved_at=now(), payload {"encerrado_por":"backfill_sem_produtor"}. Nunca
   deletar. Rode com contagem antes/depois, comigo acompanhando.

2. Os 48 baixa_geracao de fabricante que não escreve prognostico: antes de
   fechar, me confirme uma coisa — se eu resolver esses 48 mas o prognostico
   segue congelado < 85, o ABRIR do próximo tick não recria todos com opened_at
   de hoje (churn)? Se sim, fechar sozinho não resolve. Minha proposta: ESCOPAR
   a regra baixa_geracao ao prognostico vivo — só rodar para coletores que
   escrevem o campo (Sungrow hoje) — de modo que os 48 fiquem inelegíveis, o
   resolvedor os feche e o abridor não os recrie. Concorda? Se sim, faça assim
   (com dry-run e contagem antes/depois). E abra como ITEM SEPARADO "todos os
   coletores passam a escrever prognostico" para reabilitar a regra na frota.

3. Correlato (para o app): expectativaMensalKwh — que o app usa em "% da
   previsão" — é atualizado por TODOS os coletores, ou está congelado como o
   prognostico? Se congelado, o app mostra número velho para 6/7 fabricantes e
   eu preciso tratar isso no app. Só me diga o estado do campo por coletor.

Restrições de sempre: resolver nunca deletar, dry-run antes, contagem
antes/depois, testes. Nada em produção sem eu presente.
```

## Resolução do bug de alertas (20/08) — churn confirmado, escopo aplicado

**Churn confirmado pelo backend** (reproduzido no Postgres do dev: resolver com
`prognostico=30` → o tick seguinte recria com `opened_at` de hoje). Minha
dedução estava certa. **Proposta implementada:** `baixa_geracao` agora exige
`fabricante ∈ FABRICANTES_COM_PROGNOSTICO` (hoje `['sungrow']`, com
`COALESCE(lower(fabricante),'')` por causa de "Goodwe" vs "GoodWe" e do
envenenamento por `NULL`). Os 48 caem sozinhos, sem recriar (3 ticks
verificados). Carimbo `{"encerrado_por":"fabricante_sem_prognostico"}`.

**Entregue:** PR **#35** (commits `68bc2b6` ciclo de vida + `dc81b5e` escopo),
19 specs, suíte 188/188, 17 asserções contra Postgres real.

**Item 1 aplicado em produção (com o usuário):** 45 órfãos do backfill Enphase
fechados (`sem_conexao_envoy` 32→0, `micro_baixa_producao` 11→0,
`micro_falha_producao` 1→0, `problema_medidor` 1→0). UPDATE 45, nada apagado
(197 linhas antes e depois).

**Estado esperado pós-deploy do #35:** fecham 48 Enphase + 1 GoodWe (fora do
escopo); segue aberto **1 Sungrow** (prognóstico 75, warning, vivo). O portal
passa a mostrar 1 alerta de baixa geração **verdadeiro** — mas **pequeno**: a
regra vale para 11 de 525 usinas até a issue #36 andar. O sinal vivo das outras
514 continua em `usinas.status`/`alerta` (que o app já usa).

**Issue #36 (follow-up dos coletores) — decisão do usuário antes de código:** o
backend sinalizou que na Sungrow `prognostico` **não é prognóstico de geração**,
é um proxy discreto da contagem de alarmes (só 0, 80 ou 95). Em vez de cada
coletor escrever o campo, **derivar um prognóstico real de `usina_leitura`
resolveria a frota inteira de uma vez**, independente de vendor. **Recomendo
esse caminho** — e ele também destrava o "% da previsão" do app (ver abaixo).

## Achado: "% da previsão" do app está MORTO (não mente, mas nunca funciona)

Verificado contra produção (conta de teste, 4 usinas Sungrow):
`expectativaMensalKwh` chega **`undefined`** em todas — a API do app **não expõe
o campo** (`mapUsina` só devolve `expectativaAnualKwh`, e mesmo esse só em 1 de
4). O app faz `expectedMonth = numeric(expectativaMensalKwh)` → **0 para todas**
→ `generationPercentage(x, 0) = null` → dashboard mostra "Sem previsão
cadastrada" e o checkup mostra o item de prognóstico como `info`/"—".

**Diagnóstico honesto:** não é bug de número errado (degrada corretamente) — é
**recurso morto**. Causa raiz no backend: os campos de expectativa **não são
coletados** (só 10 de 525 usinas têm `expectativa_mensal`, 8 têm anual; e
`expectativa_mensal` nem é kWh — é array de 12 percentuais). A API do app também
não repassa o mensal.

**Consequência de produto:** o "% da previsão" (dashboard) e a checagem
"Geração × prognóstico" (checkup) não têm dado para funcionar na frota. Sem
tratamento no app o usuário vê "Sem previsão" em quase tudo.

**Recomendação (decisão do usuário — SEM código ainda):** o conserto certo é o
backend derivar um prognóstico real de `usina_leitura` (issue #36) e **expor um
`expectativaMensalKwh` (ou % de previsão) vivo na API do app**; aí o recurso
funciona fleet-wide. Interinamente, opções no app: (a) **manter "Sem previsão"**
(honesto, recomendado até o backend ter dado real); (b) derivar
`expectedMonth = expectativaAnualKwh/12` — funciona só para as poucas usinas com
anual e tem **viés sazonal** (mês de alta parece 120%, inverno 70%), então eu
**não** recomendo sem a curva mensal. Aguardando sua escolha.

## Deploy do conserto de alertas — v1.6.1 em produção (20/08)

Caminho GitOps normal (PR #35 → tag `v1.6.1` → GHCR → `producao.env` → agente
convergiu; sem migration, sem build na VPS). Pós-deploy: serviços 1/1, portal
200, API do app viva (401 em credencial inválida), `/api/ready` externo 403
(bloqueado na borda, como deve).

**Efeito medido** (ciclo disparado à mão, mesmo código do agendador, com o
usuário presente) — bateu 100% a previsão:

| tipo | antes | depois |
|---|---|---|
| `baixa_geracao` aberto | 50 | **1** |
| `baixa_geracao` resolvido | 0 | 49 |
| órfãos do backfill (4 tipos) | 45 abertos | **0** |
| total de linhas na tabela | 197 | 197 (nada apagado) |

O único aberto: Sungrow, prognóstico 75, warning — usina certa, fecha e reabre
sozinha daqui em diante. Carimbos: 49 `fabricante_sem_prognostico` + 45
`backfill_sem_produtor`. **Confirmado: o portal interno voltou a refletir a
realidade.** Ressalva mantida: a lista é verdadeira mas pequena (11 de 525
usinas) até a issue #36. O sinal das outras 514 segue vivo em
`usinas.status`/`alerta` — que o app já usa.

## Próximo passo — Sessões (rotas do app · prompt para o backend)

Item mais barato da Fase C (P, sem migration): portar as rotas de sessão do
portal para `authenticateApp`, com as decisões de app já fechadas (revogar por
família, `isCurrent` via claim `sid`).

```text
Próximo passo da Fase C do app: sessões. Porte as rotas de sessão do portal
(GET/DELETE /api/v3/settings/sessoes) para a API do app sob authenticateApp,
já com os ajustes que combinamos:

1. GET /api/v3/app/me/sessions — lista as sessões ATIVAS do próprio usuário,
   UMA POR FAMÍLIA (não por linha, que rotaciona a cada refresh). Por item:
   - familyId (identificador ESTÁVEL — é o que a tela usa para revogar)
   - dispositivo (user_agent por ora; sei que é pobre — okhttp — tudo bem)
   - iniciadaEm (created_at da linha mais antiga da família)
   - ultimoUso (created_at da linha viva da família)
   - isCurrent (bool) — compare o claim `sid` do access token com a família;
     nada de hashear cookie como no portal.
2. DELETE /api/v3/app/me/sessions/:familyId — revokeFamily, escopado ao usuário
   (revogar família alheia deve dar 404, mesmo forjando o id).
3. DELETE /api/v3/app/me/sessions (sem id) — "desconectar os outros
   dispositivos": revoga todas as famílias MENOS a atual.

Me devolva o contrato real (envelope + campos por sessão) para eu registrar no
INTEGRACAO_BACKEND.md e validar contra a conta de teste (ela tem ~6 sessões
ativas agora). Sem mudar comportamento além disso sem confirmar.

Depois de sessões, os próximos são alertas (feature de app sobre a tabela já
saneada + a cobertura da frota da issue #36) e por fim push+preferências.
```

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
