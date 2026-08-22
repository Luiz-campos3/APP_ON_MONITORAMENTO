# Issue Log — OnWay Cliente

**Fonte única de pendências da fase de refinamento (rotinas, telas, processos).**

**Criado:** 22/08/2026 · **Última revisão:** 22/08/2026
**Base:** `PLANO_IMPLANTACAO_V2.md` (rev. 2) + `EXECUCAO_FASE_A..D.md` + `INTEGRACAO_BACKEND.md`, conciliados com o **código real** (73 arquivos em `apps/client/src`) e os 2 branches staged.
**Método:** duas auditorias independentes (técnica × processos) + verificação manual do GP dos achados críticos. 49 achados brutos → **29 issues** consolidadas.

> Este documento **centraliza e substitui** as listas de pendências espalhadas nos planos e nos registros de execução. Os planos continuam sendo o "porquê/como"; o Issue Log é o "o que falta e quem resolve". Atualize o status aqui a cada execução.

## Legenda

**Status:** 🔴 Aberto · 🟡 Em validação/andamento · 🟢 Resolvido · ⛔ Bloqueado (aguarda terceiro)
**Severidade:** `Crítica` bloqueia piloto/loja · `Alta` bloqueia uma fase · `Média` qualidade/rastreabilidade · `Baixa` cosmético/débito
**Dono:** 👤 usuário/OnWay · 🖥️ backend · 🛠️ dev (eu)

---

## 1. Sumário executivo

| Severidade | Qtd | IDs |
|---|---|---|
| 🟥 Crítica | 5 | ISS-001 … ISS-005 |
| 🟧 Alta | 7 | ISS-006 … ISS-011, ISS-031 |
| 🟨 Média | 12 | ISS-012 … ISS-020, ISS-032, ISS-033, ISS-035 |
| 🟩 Baixa | 13 | ISS-021 … ISS-029, ISS-034, ISS-036, ISS-037, ISS-038 |
| **Total** | **37** | + ISS-030 resolvida (§8) |

> **Convenção de status (dois eixos):** cada issue rastreia **Correção** (código feito/mergeado) **e** **Em produção** (de fato no ar). Para correção **app-side**, "em produção" = build EAS/TestFlight publicado — hoje **⏳ pendente** (sem conta Apple, ISS-002); para **backend**, "em produção" = deploy confirmado. Princípio que guia as correções: **o app deve sempre ler o dado real do backend**, nunca fabricar/hardcodar valor exibido como dado.

> **ISS-031 … ISS-038** vieram da **auditoria de fidelidade de dados (22/08)** — ver §3b. **✅ Todas as 8 resolvidas** (6 corrigidas no código + ISS-033 não-era-defeito + ISS-037 aceito); "em produção" pendente de build (ISS-002). Já cobertos por issues anteriores e por isso NÃO reduplicados: animação do checkup (ISS-022), toggles de notificação sem efeito (ISS-011), payback fictício (ISS-019), textos jurídicos (ISS-004), anexos sem download (ISS-021/023).

**Diagnóstico:** o caminho crítico **não são as telas** — a fundação técnica está pronta. O que trava o piloto é **input do usuário** (Apple, jurídico), **contrato de backend** (push) e **processo de loja**. As pendências puramente de código são poucas e de severidade média/baixa. **Exceção:** ISS-001 (segurança) é uma quebra de governança que exige ação imediata, independentemente das fases.

**Distribuição por dono do gargalo:** 👤 usuário domina o caminho crítico (I4, I5, I6, I8, I10 + validações no aparelho). 🖥️ backend deve o deploy do #42 e o contrato de push. 🛠️ dev tem itens de qualidade/merge, todos destravados.

**Encontradas e resolvidas fora das auditorias:** 1 — **ISS-030** (bug do histórico no modo Ano, ver §8 Resolvidas). Não conta no total de 29 (abertas).

---

## 2. 🚨 Ação de segurança imediata — ISS-001

**Antes de qualquer avanço de fase.** A senha da conta de teste está commitada em documento versionado e sincronizado na `main`. Trate a credencial como **comprometida**.

**Remediação recomendada (nesta ordem):**
1. 🖥️ **Rotacionar a senha** da conta `luiz.onwayenergy` no backend (a atual deve ser considerada vazada).
2. 🛠️ **Redigir o documento**: remover a senha de `EXECUCAO_FASE_C.md:704`, deixando só "senha no `.env` local".
3. 🛠️👤 **Decidir sobre o histórico do git**: como o commit já está na `main` publicada, reescrever histórico é intrusivo. Dado que é uma conta de teste que será rotacionada, a rotação (passo 1) neutraliza o risco; o saneamento de histórico é opcional e precisa de decisão explícita do usuário.
4. 🛠️ **Reforçar o gitleaks** para pegar padrões de credencial também em `*.md`.

---

## 3. Registro de issues

### 🟥 Críticas

**ISS-001 · Senha da conta de teste commitada em documento versionado** — `Crítica` · Fase C · 🛠️🖥️ · 🔴 Aberto
- **Categoria:** governança/segurança
- **Evidência:** `EXECUCAO_FASE_C.md:704` ("senha … rotacionada para `grampo-telha-bucha-32`"), presente no HEAD `a70c6d9`. Viola a regra "credenciais só no `.env`", que a Fase A seguiu à risca.
- **Depende de:** nada — ação imediata.
- **Ação:** ver §2 (rotacionar + redigir + reforçar gitleaks).

**ISS-002 · Conta Apple Developer + acesso ao App Store Connect (I6)** — `Crítica` · Fase C/D · 👤 · ⛔ Bloqueado
- **Categoria:** input-externo · **é o maior ponto de alavancagem do projeto**
- **Evidência:** `PLANO_IMPLANTACAO_V2.md` §2 (I6); `EAS_DEV_BUILD.md` "Pré-requisitos".
- **Depende de:** contratar o Apple Developer Program (pago) + habilitar APNs.
- **Ação:** contratar a conta Apple da empresa. Destrava, de uma vez: TestFlight (ISS-005), teste e2e de push (ISS-006), `eas.json > submit` e o dev build iOS.

**ISS-003 · Deploy do PR #42 — endpoint de exclusão de conta (I9)** — `Crítica` · Fase D · 🖥️ · ⛔ Bloqueado
- **Categoria:** deploy/release
- **Evidência:** `EXECUCAO_FASE_D.md` "I9 — contrato recebido (PR #42, pendente de deploy · sem migration)".
- **Depende de:** backend fazer o deploy (sem migration).
- **Ação:** deployar o `POST /me/exclusao` para destravar a validação e o merge (ISS-007). Exigência dura da App Review 5.1.1(v).

**ISS-004 · Textos jurídicos (privacidade, termos, exclusão) + revisão da constante `RETENCAO` (I4)** — `Crítica` · Fase D · 👤 · ⛔ Bloqueado
- **Categoria:** jurídico/LGPD
- **Evidência:** placeholders em `settings/privacy.tsx:18-30`; o rodapé do login `login.tsx:151` é **texto morto** (não linka a URL pública); prazos codificados em `RETENCAO` (5 anos fiscal CTN 173/174; contratual LGPD art. 16) precisam de aval jurídico — `EXECUCAO_FASE_D.md` I9 item 5.
- **Depende de:** advogado (textos + validação dos prazos).
- **Ação:** obter os 3 textos, popular `privacy.tsx`, transformar o rodapé do login em links, e revisar `RETENCAO`.

**ISS-005 · Pacote de submissão à App Store** — `Crítica` · Fase D · 👤🛠️ · ⛔ Bloqueado
- **Categoria:** processo-loja
- **Evidência:** `eas.json > submit.production` **vazio**; faltam ícone final, screenshots reais, App Privacy (declaração de dados coletados), justificativas de permissão (NS*UsageDescription) e conta de demonstração com instruções ao revisor — `PLANO_IMPLANTACAO_V2.md` Fase D + `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` §"Preparação App Store".
- **Depende de:** I6 (ISS-002) + assets de design + decisão de metadados.
- **Ação:** montar o pacote de App Review em paralelo ao I6; preencher `submit.production` quando a conta existir.

### 🟧 Altas

**ISS-006 · Push notifications ponta a ponta (contrato + integração + APNs)** — `Alta` · Fase C · 👤🖥️🛠️ · ⛔ Bloqueado
- **Categoria:** contrato-backend + dependência-técnica
- **Evidência:** `expo-notifications` **nem é dependência** (`grep` zero em `src`; ausente no `package.json`); `settings/notifications.tsx:44` admite "push chegará numa próxima versão". Contrato de push+preferências: prompt entregue, **contrato pendente** (`EXECUCAO_FASE_C.md` "Push + Preferências").
- **Depende de:** 👤 repassar o prompt ao backend → 🖥️ devolver contrato (push-tokens, preferências, categorias, anti-spam) → 🛠️ integrar `expo-notifications` + deep link no dev build (exige I6/APNs). Risco correlato: push só validável fora do Expo Go.
- **Ação:** fechar o contrato, instalar `expo-notifications`, implementar registro/deep link e validar no dev client.

**ISS-007 · Validar exclusão de conta contra produção e mergear `feat/exclusao-conta`** — `Alta` · Fase D · 🛠️ · ⛔ Bloqueado
- **Categoria:** merge
- **Evidência:** branch `feat/exclusao-conta` (`a919152`): `settings/delete-account.tsx` + `mobileApi.deleteAccount`. Na `main`, `privacy.tsx` ainda diz "Encerramento indisponível".
- **Depende de:** deploy do #42 (ISS-003). A mecânica não depende do I4; só o texto fino da tela.
- **Ação:** após o deploy, validar (senha errada→403, exclusão→200, login excluído→401, conta irmã intacta), rebasear em `main` e mergear.

**ISS-008 · Testar VoiceOver e mergear `feat/acessibilidade`** — `Alta` · Fase D · 👤🛠️ · 🟡 Em validação
- **Categoria:** validação
- **Evidência:** branch `feat/acessibilidade` (`330890e`, 23 arquivos: roles/labels/headers/estados). Gate = teste no aparelho.
- **Depende de:** 👤 rodar VoiceOver no Expo Go/aparelho.
- **Ação:** executar o roteiro de VoiceOver; passando, rebasear e mergear.

**ISS-009 · Crash reporting sanitizado (Sentry / I10)** — `Alta` · Fase A→D · 👤🛠️ · ⛔ Bloqueado
- **Categoria:** input-externo / instrumentação
- **Evidência:** sem Sentry/Bugsnag no `package.json`; item A1 não marcado; é indicador de go/no-go (crash-free) do piloto.
- **Depende de:** 👤 escolher ferramenta + DSN (tier grátis serve).
- **Ação:** criar projeto, configurar DSN e instrumentar sem PII/tokens antes do TestFlight.

**ISS-010 · Confirmar que o chamado aparece no portal da operação (critério de saída da Fase B)** — `Alta` · Fase B · 👤🖥️ · ⛔ Bloqueado
- **Categoria:** validação
- **Evidência:** `PLANO_IMPLANTACAO_V2.md` Fase B "⚠️ parcial"; criação retornou `canalOrigem:app` mas só a OnWay vê o portal (CH-0001/CH-0002).
- **Depende de:** OnWay confirmar no portal.
- **Ação:** confirmar os chamados de teste no portal e encerrá-los/limpá-los.

**ISS-011 · Preferências de notificação não têm efeito (copy promete filtro inexistente)** — `Alta` · Fase C · 🛠️ · 🔴 Aberto
- **Categoria:** bug / divergência copy-vs-código
- **Evidência:** `settings/notifications.tsx:10-11,44` afirma que as prefs "são aplicadas aos alertas exibidos no app"; mas `alerts-context.tsx:42` chama `getAlerts('aberto')` e exibe tudo — os toggles `plantOffline`/`lowGeneration` **não filtram nada**.
- **Depende de:** nada (decisão de produto).
- **Ação:** ou aplicar as prefs no feed local, ou corrigir a copy para não prometer filtro inexistente (alinhar com o contrato de push, ISS-006).

### 🟨 Médias

**ISS-012 · Branches staged colidem e estão atrás da `main`** — `Média` · Fase D · 🛠️ · 🔴 Aberto
- **Categoria:** staged/merge
- **Evidência:** `feat/acessibilidade` e `feat/exclusao-conta` **ambos** editam `settings/privacy.tsx` e `PLANO_IMPLANTACAO_V2.md` (conflito garantido); ambos estão behind main (2 e 1 commits).
- **Depende de:** nada.
- **Ação:** definir ordem de merge, rebasear os dois em `main` e resolver o conflito de `privacy.tsx` uma vez.

**ISS-013 · Cobertura de testes: cliente HTTP, contexts e strip de EXIF sem teste** — `Média` · transversal · 🛠️ · 🔴 Aberto
- **Categoria:** teste-faltante
- **Evidência:** 9 suítes existem (todas em `domain/*` + `error-envelope`). **Sem teste:** `services/mobile-api.ts` (retry 429, refresh/rotação, single-flight, handler 403 `PASSWORD_CHANGE_REQUIRED`), todos os `contexts/*`, `services/photo.ts` (remoção de EXIF) e a nova `delete-account.tsx`.
- **Depende de:** nada.
- **Ação:** priorizar testes do retry/refresh do `mobile-api` e do strip de EXIF (ambos são risco de segurança/robustez).

**ISS-014 · Aceite em aparelho físico pendente + status da Fase A superestimado** — `Média` · Fase A · 👤🛠️🖥️ · 🟡 Em validação
- **Categoria:** validação / critério-de-saída
- **Evidência:** Fase A marcada "✅ concluída", mas faltam: OCR no timeout, lockout (bloqueia a conta — só com OK), `mustChangePassword` **visual** (a flag foi desligada na conta de teste — precisa 🖥️ rearmar), e o pente-fino visual item-a-item.
- **Depende de:** 👤 pente-fino no aparelho + 🖥️ rearmar `mustChangePassword`.
- **Ação:** executar o roteiro de aceite restante; rebaixar A para "parcial" ou registrar formalmente o aceite do usuário.

**ISS-015 · Contradição de lockout no `INTEGRACAO_BACKEND.md` (fonte canônica do contrato)** — `Média` · Fase A/C · 🛠️ · 🔴 Aberto
- **Categoria:** governança/doc
- **Evidência:** `INTEGRACAO_BACKEND.md:66` afirma **existir** lockout por conta (5 falhas/15min por e-mail); `:477` diz "**não** há lockout por conta". Contradição na referência que sustenta o app.
- **Depende de:** nada.
- **Ação:** corrigir o item do checklist (`:477`) para refletir o contrato real (lockout por conta existe; 429 é por IP).

**ISS-016 · Status de deploy dos PRs #38/#39 e cobertura fleet-wide da expectativa não confirmados** — `Média` · Fase C · 🖥️🛠️ · ⛔ Bloqueado
- **Categoria:** governança/doc + contrato-backend
- **Evidência:** `EXECUCAO_FASE_C.md` lista #38 ora como "aberto" ora como "entregue" (contradição); #39 (usinas que nunca geraram) sem registro de deploy; issue #36/#40 cobre 342 de 525 usinas — expectativa/`baixa_geracao` fleet-wide ainda parcial.
- **Depende de:** 🖥️ confirmar estados.
- **Ação:** confirmar e documentar deploy de #38/#39 e a cobertura de expectativa na frota.

**ISS-017 · Dados de teste deixados em produção** — `Média` · Fase B/C · 🖥️🛠️ · ⛔ Bloqueado
- **Categoria:** validação/higiene
- **Evidência:** CH-0001/CH-0002 (o app não os cancela), ~12 sessões "node", 3 alertas semeados com `lido=true`/`naoLidos=0` (badge não aparece no device até voltarem a não-lidos).
- **Depende de:** 🖥️ limpar semeados/fechar chamados + setar `lido=false` para o teste visual do badge.
- **Ação:** limpar ou formalizar como fixtures; pedir `lido=false` antes do pente-fino visual dos alertas.

**ISS-018 · Lockout do backend: baldes app/portal separados + decaimento** — `Média` · Fase A · 🖥️ · ⛔ Bloqueado
- **Categoria:** risco-aberto (disponibilidade)
- **Evidência:** `EXECUCAO_FASE_A.md` "Correções após revisão do backend": balde de lockout **compartilhado com o login do portal** (falhas no app podem travar o portal) e contador que **não decai**.
- **Depende de:** 🖥️ backend.
- **Ação:** separar baldes app/portal (risco já manifestado) e aplicar decaimento por janela.

**ISS-019 · Payback com custo/tarifa reais (I5) ou decisão de manter oculto** — `Média` · Fase D · 👤 · ⛔ Bloqueado
- **Categoria:** input-externo
- **Evidência:** `domain/payback.ts:5-6` usa `COST_PER_KWP=4200` e `TARIFF_PER_KWH=0.98` inventados; card oculto por flag desde A1 (**não bloqueia o piloto**, só o recurso).
- **Depende de:** 👤 fornecer dados reais por contrato/usina ou decidir manter oculto.
- **Ação:** decidir entre religar o card com dados reais ou manter oculto no piloto.

**ISS-020 · Critérios de go/no-go e indicadores do piloto não definidos** — `Média` · Fase D/E · 👤 · ⛔ Bloqueado
- **Categoria:** critério-de-saída
- **Evidência:** `PLANO_IMPLANTACAO_V2.md` Fase D "go/no-go documentado"; `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` §13 (crash-free, sucesso de login, latência, satisfação).
- **Depende de:** 👤 definir público-piloto + metas.
- **Ação:** fechar público e metas de sucesso antes de convidar o grupo.

### 🟩 Baixas

**ISS-021 · Faturas incompletas (roadmap Fase E)** — `Baixa` · Fase E · 🛠️ · 🔴 Aberto
- **Categoria:** feature-incompleta / dead-code
- **Evidência:** `invoices/[id].tsx:88-93` só informa que o anexo existe (sem download); `invoices/new.tsx` usa `DocumentPicker` (sem câmera); `GET /faturas` global existe no contrato mas **sem call site**; sem PATCH/DELETE de fatura.
- **Depende de:** início da Fase E.
- **Ação:** implementar visualização de anexo, câmera e lista global quando a Fase E iniciar.

**ISS-022 · Dead code / teatro de UX no Checkup** — `Baixa` · Fase A/E · 🛠️ · 🔴 Aberto
- **Categoria:** dead-code
- **Evidência:** `domain/checkup.ts:116-117` só gera itens `real:true`, mas `checkup/index.tsx:186` renderiza ramo `!item.real` ("simulado") **nunca alcançado**; animação de scanning (`:39-49`) roda `setInterval` fixo enquanto o checkup já rodou síncrono.
- **Depende de:** nada.
- **Ação:** remover o campo `real`/tag "simulado"; manter ou rotular a animação (sem impacto funcional).

**ISS-023 · Estado morto de notificação + anexos sem visualizador** — `Baixa` · Fase C · 🛠️ · 🔴 Aberto
- **Categoria:** dead-code
- **Evidência:** `client-app-context.tsx:8-9,22-23` persiste `monthlyReport`/`serviceUpdates` sem consumidor; `GET /chamados/:id/anexo` (contrato) e o anexo da fatura sem viewer (`tickets/[id].tsx:111-116` só exibe "Foto anexada").
- **Depende de:** contrato de preferências (ISS-006) para o estado de notificação.
- **Ação:** reintroduzir com sincronização real ou remover o estado morto; adicionar viewer de anexo quando priorizado.

**ISS-024 · Foto do chamado sem guarda explícita de 10 MB** — `Baixa` · Fase B · 🛠️ · 🔴 Aberto
- **Categoria:** bug-potencial (defensivo)
- **Evidência:** `services/photo.ts:15-21` sempre reencoda/comprime, mas `tickets/new.tsx` não valida o limite real de 10 MB antes do POST (o guard de 25 MB só é usado no OCR de faturas). Na prática a compressão evita o estouro; caso extremo depende do 400 do servidor.
- **Depende de:** nada.
- **Ação:** checar 10 MB pós-compressão no fluxo de chamado (defensivo).

**ISS-025 · Débito técnico da Fase A1 (npm audit + patch-package)** — `Baixa` · Fase A · 🛠️ · 🔴 Aberto
- **Categoria:** débito-técnico (documentado)
- **Evidência:** CI com `npm audit --audit-level=critical` (9 high do toolchain Expo/Metro só saem no SDK 57+); `postinstall` usa script custom em vez de `patch-package`.
- **Depende de:** upgrade de SDK (para o gate `high`).
- **Ação:** subir o gate para `high` ao migrar de SDK; reavaliar `patch-package` só se surgir patch de código de terceiros.

**ISS-026 · Fonte Gilmer não integrada (I8)** — `Baixa` · Fase D · 👤 · ⛔ Bloqueado
- **Categoria:** input-externo (não bloqueia o piloto)
- **Evidência:** `IDENTIDADE_VISUAL.md` — usa fonte de sistema até os arquivos `.otf/.ttf` licenciados chegarem.
- **Depende de:** 👤 arquivos da fonte.
- **Ação:** integrar quando chegarem (tokens já registrados; integração trivial).

**ISS-027 · Pedido aditivo ao backend: `code` na raiz do envelope de erro** — `Baixa` · Fase A · 🖥️ · 🔴 Aberto
- **Categoria:** contrato-backend (baixa prioridade)
- **Evidência:** o app já lê `errors.code` corretamente via `readErrorCode`; padronizar o `code` na raiz é conveniência.
- **Depende de:** 🖥️ release de padronização.
- **Ação:** deixar para um release de padronização do backend.

**ISS-028 · `PLANO_USINAS_SEM_GERACAO.md` sumido sem rastro** — `Baixa` · — · 🛠️ · 🔴 Aberto
- **Categoria:** governança/doc
- **Evidência:** aparecia como untracked no `git status` inicial; **não existe mais** no disco nem no git (provável rascunho da issue #39 — usinas que nunca geraram).
- **Depende de:** nada.
- **Ação:** recriar/commitar se o conteúdo importava; senão, ignorar.

**ISS-029 · Documentação desatualizada (contagem de testes)** — `Baixa` · Fase A · 🛠️ · 🔴 Aberto
- **Categoria:** governança/doc
- **Evidência:** `PLANO_IMPLANTACAO_V2.md` §3 A1 diz "74 testes em 5 suítes"; existem **9 suítes** (adicionadas alert/session/support/error-envelope).
- **Depende de:** nada.
- **Ação:** atualizar a contagem no plano (fica coerente ao fechar ISS-013).

---

## 3b. Fidelidade de dados — dados em tela que não refletem o backend (auditoria 22/08)

Cada entrada rastreia **Correção** e **Em produção** (ver convenção no §1). Verificados pelo GP, vários contra dados reais de produção.

### 🟧 Alta

**ISS-031 · Status/alerta da usina lê campo inexistente (`alerta`) — `temAlerta`/`alertaMensagem` do backend são ignorados** — `Alta` · Fase C · 🛠️ · 🟢 Corrigido (`a85e02a`, `main`) · Em produção: ⏳ aguarda build (ISS-002)
- **Categoria:** divergência-contrato (drift de nome de campo) / fidelidade
- **O que o usuário vê:** selo "Online/Atenção/Offline" da usina.
- **Evidência:** `ApiPlant` declarava `alerta: boolean` (`mobile-api.ts:54`) e `plantStatus`/`toPlant` liam `plant.alerta` (`domain/client.ts:82,122`); **a produção envia `temAlerta` + `alertaMensagem`** e **nenhum código lia esses campos** (grep zero). O selo não refletia a flag de alerta real.
- **Correção:** `plantStatus`/`toPlant` passam a ler `plant.temAlerta ?? plant.alerta ?? false`; `ApiPlant` ganhou `temAlerta`/`alertaMensagem` (e `alerta` virou legado opcional). **Validado contra produção:** `temAlerta` presente em 4/4 usinas; derivação de status consistente. +1 teste (fallback legado); tsc/eslint/123 testes verdes.
- **Follow-up (não bloqueia):** exibir `alertaMensagem` na UI (hoje capturado no tipo, ainda não renderizado).
- **Em produção:** ⏳ pendente de build (não há loja/TestFlight até ISS-002).

### 🟨 Média

**ISS-032 · Perfil: pílula "Cliente ativo" é literal fixo (não vem do `/me`)** — `Média` · Fase D · 🛠️ · 🟢 Corrigido (`a85e02a`, `main`) · Em produção: ⏳
- **Categoria:** mock/hardcoded / fidelidade
- **Evidência:** string fixa em `profile.tsx:52`; o `/me` (`ApiUser`) não tem status de conta. Sempre mostrava "ativo", mesmo se a conta estivesse bloqueada.
- **Correção:** pílula removida (com os estilos órfãos); sem campo real de status, o app não afirma "ativo". Princípio "só exibir dado real".
- **Em produção:** ⏳ pendente de build.

**ISS-033 · Contato/Suporte hardcoded; botão WhatsApp aponta para telefone fixo** — `Média` · Fase D · 👤🛠️ · 🟢 Resolvido — **não era defeito** (`c/ comentário em contact.ts`) · Em produção: ⏳ aguarda build
- **Categoria:** mock/hardcoded / fidelidade
- **Suspeita original:** `config/contact.ts` cai no literal `+556140428218` e `whatsapp ?? phone` abriria `wa.me/…` de um fixo (DDD 61) sem WhatsApp; horário "8h–18h" fixo (`support.tsx:82`).
- **Resolução (confirmado com o cliente 22/08):** o telefone é o **oficial**, o **WhatsApp é o mesmo número** (o botão abre conversa de verdade — o `?? phone` cai no número certo, é intencional), e o horário está **correto**. Não é dado fabricado — é a config pública real. Sem mudança de comportamento; adicionado comentário em `contact.ts` para não ser "corrigido" por engano nem re-sinalizado.
- **Em produção:** ⏳ pendente de build (o comentário entra no próximo build).

**ISS-035 · Checkup: score /100 aparenta diagnóstico completo, cobre só 2 dimensões** — `Média` · Fase E · 🛠️ · 🟢 Corrigido (`5ecd579`, `main`) · Em produção: ⏳
- **Categoria:** derivado-que-engana / fidelidade
- **Evidência:** `checkup.ts` — score = 100 − penalidades de 2 checagens. Usina **sem prognóstico** (`status:info`, penalidade 0) + leitura recente ⇒ **100/100 "Sistema saudável"** sem a geração ter sido avaliada.
- **Correção (decisão do cliente: C — suavizar + refletir no score):** `CheckupReport` expõe `assessed`/`total`/`incomplete`; headline suavizada ("Tudo certo nas verificações" / "Verificação parcial"); quando parcial o anel fica **neutro** e mostra a **cobertura `assessed/total`** (não "100/100"), com "N verificação(ões) sem dados suficientes". +2 testes.
- **Follow-up separado:** a animação de "scanning" (encenação) segue em **ISS-022**; o presente fix não a toca.
- **Em produção:** ⏳ pendente de build.

### 🟩 Baixa

**ISS-034 · Perfil: versão do app é literal "0.1.0" (não lê `expo-constants`)** — `Baixa` · Fase D · 🛠️ · 🟢 Corrigido (`a85e02a`, `main`) · Em produção: ⏳
- **Categoria:** hardcoded / fidelidade
- **Evidência:** literal em `profile.tsx:100`; coincidia com `app.json`, mas daria drift em builds futuras.
- **Correção:** versão lida do build via `Constants.expoConfig?.version` (`expo-constants`), com fallback seguro.
- **Em produção:** ⏳ pendente de build.

**ISS-036 · Alertas: rótulo de tempo ambíguo em alertas derivados** — `Baixa` · Fase C · 🛠️ · 🟢 Corrigido (`24cbdc2`, `main`) · Em produção: ⏳
- **Categoria:** derivado-que-engana
- **Evidência:** `alerts.tsx:86` mostrava "há Xh" de `api.abertoEm`; para `origem:'derivado'`, `abertoEm` é a **última geração**, não a abertura (`mobile-api.ts:610`, contrato `INTEGRACAO_BACKEND.md:347`).
- **Correção:** `timeLabel` (em `domain/alert.ts`) virou origin-aware — `derivado` → "última leitura há Xh"; `tabela` → "há Xh". +3 testes. `alerts.tsx` inalterado (só renderiza o label). Sem afirmar "aberto há Xh" onde não é.
- **Em produção:** ⏳ pendente de build.

**ISS-037 · "% da previsão" tem viés levemente otimista** — `Baixa` (informativo) · Fase C · 🛠️ · 🟢 Resolvido — **Aceito** (decisão do cliente 22/08)
- **Categoria:** derivado (documentado)
- **Evidência:** `client.ts:246-257` — numerador `geracaoMesKwh` (mês-até-hoje, inclui hoje) sobre denominador `expectativaMesAteHojeKwh` (até ontem). Descompasso **intencional** e já documentado no código (comentário em `domain/client.ts` sobre a janela terminar ontem de propósito).
- **Resolução:** aceito como está — o % é honesto e o descasamento é deliberado (comparar mês-até-hoje com a meta do mês cheio faria toda usina parecer ruim no começo do mês). Sem mudança de código.

**ISS-038 · Timeline do chamado: todos os marcos em verde/check** — `Baixa` · Fase B · 🛠️ · 🟢 Corrigido (`24cbdc2`, `main`) · Em produção: ⏳
- **Categoria:** derivado (decoração local)
- **Evidência:** `tickets/[id].tsx:126-142` pintava todo evento como concluído (verde + check); título/data são reais (backend), mas o backend não manda status por evento.
- **Correção:** o marcador virou um ponto **neutro** (accent, sem check) — a timeline mostra eventos registrados em ordem, sem afirmar "aprovado/concluído". Título/data seguem reais.
- **Em produção:** ⏳ pendente de build.

---

## 4. Caminho crítico (o que destrava mais)

```
ISS-002 (I6 · Conta Apple) ──┬──> TestFlight (Fase D)
                             ├──> ISS-005 (eas submit + pacote loja)
                             ├──> ISS-006 (teste e2e de push)
                             └──> dev build iOS

ISS-003 (deploy #42) ────────────> ISS-007 (validar + mergear exclusão) ──> App Review 5.1.1(v) OK

ISS-004 (I4 · jurídico) ─────────> privacidade/termos/exclusão + RETENCAO ──> App Review OK
```

**Os três gargalos do piloto:** `ISS-002 (I6)` → `ISS-003 (#42)` → `ISS-004 (I4)`, somados a **ISS-006 (contrato de push, que só depende de o usuário repassar ao backend)**. Nenhum é código de tela.

**Maior alavanca única: ISS-002 (conta Apple).** Sozinha destrava a cauda da Fase C e a Fase D inteira.

---

## 5. Inputs externos (matriz)

| Input | O que destrava | Issue | Dono | Status |
|---|---|---|---|---|
| I1 · contrato de chamados | Fase B | — | 🖥️ | ✅ recebido |
| I2 · conta de teste | validação | — | 👤 | ✅ recebido (⚠️ ver ISS-001) |
| I3 · envelope 403/401 | Fase A | — | 🖥️ | ✅ confirmado |
| **I4 · textos jurídicos** | privacidade/termos/exclusão | ISS-004 | 👤 | ⛔ pendente |
| **I5 · custo/tarifa** | payback real | ISS-019 | 👤 | ⛔ pendente |
| **I6 · conta Apple Developer** | TestFlight + push + submit | ISS-002 | 👤 | ⛔ pendente **(maior alavanca)** |
| I7 · regra de alerta | Fase C | — | 🖥️ | ✅ recebido (v1.7.1) |
| **I8 · fonte Gilmer** | identidade visual | ISS-026 | 👤 | ⛔ pendente (não bloqueia piloto) |
| I9 · endpoint de exclusão | Fase D | ISS-003/007 | 🖥️ | 🟡 contrato recebido, aguarda deploy |
| **I10 · crash reporting** | instrumentação/go-no-go | ISS-009 | 👤 | ⛔ pendente |

---

## 6. Branches staged (fora da `main`)

| Branch | Conteúdo | Gate para mergear | Issue |
|---|---|---|---|
| `feat/acessibilidade` (`330890e`) | passe de VoiceOver (roles/labels/headers/estados, 23 arq.) | teste de VoiceOver no aparelho | ISS-008 |
| `feat/exclusao-conta` (`a919152`) | `delete-account.tsx` + `mobileApi.deleteAccount` | deploy do #42 + validação contra prod | ISS-007 |

⚠️ Os dois editam `privacy.tsx` e o plano V2 → conflito ao mergear em sequência (ISS-012). Ambos estão atrás da `main`.

---

## 7. Como manter este log

- **Uma issue = uma linha de vida.** Ao resolver, marque 🟢 e mova para uma seção "Resolvidas" no fim (não apague — preserve a rastreabilidade).
- **Novo achado** entra com o próximo `ISS-0NN`, severidade e dono.
- **A cada execução de fase**, reconcilie com os `EXECUCAO_FASE_*.md` e atualize o status aqui — este é o índice mestre; os planos guardam o detalhe do "porquê".
- Governança inalterada: só iniciar fase se autorizado; credenciais só no `.env`; mudança do planejado é documentada.

---

## 8. Resolvidas

Itens já resolvidos, mantidos para rastreabilidade (não apagar).

**ISS-030 · Histórico de geração no modo Ano não trocava os dados ao mudar de ano** — `Alta` · Fase C · 🛠️ · 🟢 Resolvido (branch `fix/historico-ano`, aguarda validação visual + merge)
- **Categoria:** bug (reportado em uso; fora do escopo das auditorias técnica/processos)
- **Sintoma:** ao mudar o ano no gráfico de histórico, o rótulo mudava mas as barras permaneciam as mesmas — como se não buscasse os dados do ano selecionado.
- **Causa raiz:** `toGenerationHistory` (`domain/client.ts`) priorizava a série `historico.ano` — que é a **visão default do ano corrente e ignora o range** `inicio/fim` — sobre a série `historico.custom`, que carrega o ano realmente pedido. **Validado em produção:** `ano` idêntico para 2024/2025/2026 (soma 81601, labels "jan/26…"); o dado específico vinha em `custom` (2026 = 234 dias reais; 2025/2024 = zerados, usina sem geração).
- **Correção:** no modo Ano com range ativo, agrega `custom` em 12 totais mensais reais (`monthlyFromDaily`); `ano` vira apenas fallback. Anos sem geração passam a exibir vazio/tracejado (honesto) em vez de repetir o ano corrente. Commit `b80edf0`.
- **Qualidade:** `tsc` limpo, `eslint --max-warnings 0` limpo, **123 testes** verdes (+2 novos: precedência `custom`>`ano` e regressão do sintoma).
- **Pendente para fechar de vez:** teste visual no aparelho (👤) → merge de `fix/historico-ano` na `main`.
