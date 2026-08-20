# Registro de Execução — Fase A

> Log vivo da execução da Fase A do `PLANO_IMPLANTACAO_V2.md` (Revisão 1).
> Regra acordada em 19/08/2026: **cada execução é documentada aqui, com as
> considerações sobre pontos encontrados; qualquer mudança do planejado é
> registrada como desvio. Nenhuma fase inicia sem autorização do usuário.**

| Fase | Status | Autorização |
|---|---|---|
| A1 — Higiene e rede de proteção | 🟢 Concluída em 19/08 (exceto 2 itens: crash reporting bloqueado por I10; patch-package adiado) | ✅ 19/08/2026 (usuário autorizou "iniciar a Fase A") |
| A2 — Validação autenticada | 🟡 Iniciada em 19/08 — **bloqueada: API rejeitou as credenciais recebidas** (ver registro) | ✅ 19/08/2026 (mesma autorização) |
| B, C, D, E | Não iniciadas | ❌ Aguardando autorização expressa |

---

## 19/08/2026 — Revisão 1 do plano

Aplicados os 6 ajustes autorizados pelo usuário (detalhe no cabeçalho do
`PLANO_IMPLANTACAO_V2.md`): divisão A1/A2, inputs I9 (endpoint de exclusão de
conta) e I10 (DSN de crash reporting), crash reporting antecipado D→A1,
requisito de remoção de EXIF na Fase B, payback atrás de flag já na A1, e CI
com `npm audit` + gitleaks.

## 19/08/2026 — A1: triagem do `npm audit`

**Encontrado:** 24 vulnerabilidades (12 high + 12 moderate; 0 critical) — o
plano V1/V2 citava "27", número da época; a contagem real hoje era 24.

**Executado:** `npm audit fix` (sem `--force`) corrigiu as 3 high com fix
não-breaking: `brace-expansion` (DoS), `js-yaml` (CVE-2026-59870) e `nanoid`
(loop infinito). Só o `package-lock.json` mudou. Restam **19 (9 high + 10
moderate)**.

**Consideração / risco aceito:** as 9 high restantes estão todas no toolchain
de build (`expo`, `@expo/cli`, `metro`, `metro-config`, `image-size`,
`postcss` etc.) — são DoS/leitura de arquivo em ferramentas de
desenvolvimento, **não código que embarca no binário do app**. O fix exige
upgrade major para Expo SDK 57, fora do escopo da A1.

**Desvio documentado:** o gate do CI nasce em `--audit-level=critical` (e não
`high`, como seria o ideal) porque as high do toolchain deixariam o pipeline
permanentemente vermelho sem ação possível. **Reavaliar e subir o gate para
`high` no upgrade de SDK.**

## 19/08/2026 — A1: testes unitários (jest-expo)

**Executado:** `jest-expo ~54.0.18`, `jest ~29.7.0` e `@types/jest` instalados
como devDependencies; scripts `test` e `typecheck` adicionados; preset
configurado no `package.json` com `moduleNameMapper` para o alias `@/`.
**74 testes em 5 suítes** em `src/domain/__tests__/`:

| Suíte | Cobre |
|---|---|
| `client.test.ts` | `toPlant` (mapa de status, fallbacks de geração), `toPlantAlerts`, `toGenerationHistory` (dia/semana/mês/ano/custom, agregação mensal), `generationPercentage`, `formatLastReading` (com relógio congelado) |
| `contract.test.ts` | `invoiceReferenceLabel` (ISO, MM/YYYY, MM/YY, inválido), `formatCurrency`, `toInvoice` (status/origem), `toInvoiceSummary` (paginação), `toContract` (rótulos e serviços) |
| `generation-calculations.test.ts` | datas, `computeStats`, `visibleScaleMax`, `niceScale`, janela de navegação do gráfico |
| `checkup.test.ts` | limiares de comunicação (3h/24h/sem leitura/monitoramento inativo), prognóstico (90/70%), score, headline, "só checagens reais" |
| `payback.test.ts` | investimento/economia/projeção, quitação, divisão por zero (documenta as premissas mockadas até I5) |

**Considerações:**
- `npx expo install jest-expo -- --save-dev` instalou em `dependencies`
  (passthrough não aplicou o flag); movidos manualmente para `devDependencies`.
- Testes de tempo usam `jest.setSystemTime` — determinísticos, sem depender do
  relógio da máquina.

## 19/08/2026 — A1: PATCH/DELETE na camada HTTP

**Executado:** `mobile-api.ts` ganhou o tipo `HttpMethod = 'GET' | 'POST' |
'PATCH' | 'DELETE'`, usado em `RawOptions` e `AuthenticatedOptions`;
`authenticatedSend` aceita método opcional (default `POST`). Nenhum
comportamento atual mudou — destrava sessões/dispositivos (Fase C) e
edição/exclusão de faturas (Fase E).

## 19/08/2026 — A1: flag do payback (desvio positivo — antecipado da Fase C/D)

**Executado:** novo `src/config/features.ts` com `features.paybackCard` lido de
`EXPO_PUBLIC_ENABLE_PAYBACK` (aceita `1`/`true`; **default desligado**). O
dashboard só calcula e renderiza o bloco "Payback do sistema" com a flag
ligada. O risco "payback fictício chegar ao piloto" foi marcado como eliminado
na tabela de riscos do plano.

**Como religar em dev:** `EXPO_PUBLIC_ENABLE_PAYBACK=1` no `.env` local.

## 19/08/2026 — A1: dead code e resíduos

**Executado:**
- Removidos de `mobileApi`: `getMe`, `getContracts`, `getContract`,
  `getInvoices` — busca confirmou **zero call sites** (o `/me` do
  `restoreSession` usa `authenticatedGet` direto e não foi tocado). Quando a
  Fase E criar a lista global de faturas, `getInvoices` volta.
- Botão "Mais opções" sem handler em `plant/[id].tsx` substituído por
  espaçador invisível do mesmo tamanho (o header usa `space-between`; remover
  sem repor desalinharia o título).
- Scripts residuais removidos do `package.json`: `tailscale` (a VPN foi
  desligada em 13/08) e `ios:xcode` (apontava para pasta `ios/` que não existe
  no repo — quebrado desde sempre).

## 19/08/2026 — A1: CI no GitHub Actions

**Executado:** `.github/workflows/ci.yml` (raiz do repo) com dois jobs em
push/PR:
1. **quality** — `npm ci` → `tsc --noEmit` → `eslint . --max-warnings 0` →
   `jest --ci` → `npm audit --audit-level=critical` (Node 22, cache de npm).
2. **secrets** — gitleaks (histórico completo, `fetch-depth: 0`).

**Considerações:**
- Typecheck **validado em checkout limpo** (sem a pasta gerada `.expo/`) —
  passa; o CI não depende de artefatos locais.
- O eslint acusou 2 problemas pré-existentes que nunca apareceram porque lint
  nunca foi obrigatório: `__dirname` (no-undef) no script CommonJS de
  postinstall e um `eslint-disable` órfão no `.expo/types` gerado. Corrigidos
  no `eslint.config.js` (globals de Node para `scripts/**`; ignore de
  `.expo/*`). É exatamente a classe de regressão que o CI passa a bloquear.
- **Pipeline validado em 19/08 (push `e8a58e5`):** os dois jobs verdes na
  primeira execução — gitleaks varreu o histórico completo em 8s sem achar
  segredos; qualidade (typecheck + lint + 74 testes + audit) em 42s. Run:
  <https://github.com/Luiz-campos3/APP_ON_MONITORAMENTO/actions/runs/32316339516>.
  Actions atualizadas de v4 para v5 na sequência (warning de depreciação do
  Node 20; o warning do `gitleaks-action@v2` persiste até o upstream atualizar).

## 19/08/2026 — A1: `npx expo install --check`

"Dependencies are up to date" — nenhuma divergência de versão com o SDK 54.

## 19/08/2026 — A2: primeira tentativa (bloqueada — credenciais inválidas)

**Recebido:** usuário forneceu credenciais de teste via `.env` local (arquivo
no `.gitignore`; e-mail/senha **não** foram commitados nem registrados em log
ou neste documento).

**Executado:** script de aceite somente-leitura (13 verificações: login, /me,
dashboard, usinas, detalhe, histórico, contrato, faturas, 404 de usina alheia,
refresh + rotação, logout e rejeição de refresh pós-logout — sem teste de
lockout e sem OCR, que são intrusivos/mutação).

**Resultado:** `POST /auth/login` → **HTTP 401 · "Credenciais inválidas"**
(envelope de erro sem campo `code`). Fluxo abortado no passo 1. Foram feitas
apenas **2 tentativas** (limite da borda: 10 falhas/15min por IP) — sem
insistência para não travar a conta/IP.

**Hipóteses (em ordem de probabilidade):** (a) senha divergente/typo no
repasse; (b) a conta é do portal web e **não** existe como usuário do app
(`cliente_app`) — a API do app tem base/tipo próprio de usuário; (c) usuário
ainda não criado pelo operador. **Aguardando confirmação do usuário para
repetir** — o script está pronto e reexecuta em segundos.

**2ª tentativa (19/08, mais tarde):** usuário atualizou a senha no `.env`
(nova senha temporária, lida corretamente pelo script — 21 caracteres, sem
espaços residuais). Resultado idêntico: `401 "Credenciais inválidas"`, sem
`code`. Como a senha nova também falhou, a hipótese dominante passa a ser a
**(b): o e-mail não existe na base de usuários do app** — a redefinição de
senha foi feita, provavelmente, na base do portal web. Enviado ao usuário um
prompt de diagnóstico para o backend (verificar existência do usuário
`cliente_app`, criar a conta de teste com `mustChangePassword` ativo e
confirmar o envelope de erros do I3). 4 falhas de login acumuladas no dia —
dentro do limite de 10/15min, sem risco de lockout.

**Consideração de segurança:** manter credenciais no `.env` é aceitável para o
teste (ignorado pelo git; chaves sem prefixo `EXPO_PUBLIC_` não são embutidas
no bundle), mas a senha deve ser **rotacionada após a validação da A2**.

## Desvios do planejado (consolidado)

| Desvio | Justificativa | Ação futura |
|---|---|---|
| Gate do `npm audit` em `critical` (plano ideal: `high`) | 9 high restantes são todas do toolchain Expo/Metro; só resolvem no SDK 57+ e deixariam o CI permanentemente vermelho | Subir para `high` no upgrade de SDK |
| `patch-package` **adiado** | O script atual (`fix-react-timing-privacy.js`) é idempotente, versionado e só **cria** um arquivo ausente; trocar por patch-package adiciona dependência sem ganho funcional hoje | Reavaliar quando existir patch real de código de terceiros |
| Crash reporting não instalado | Bloqueado por I10 (decisão de ferramenta + DSN é do usuário) | Instalar assim que I10 chegar |
| Testes de `domain/payback` além do plano | Módulo ganhou flag hoje; custo marginal zero | — |

## Pendências e bloqueios em aberto

| Item | Bloqueado por | Pedido em |
|---|---|---|
| Validação do pipeline no GitHub | primeiro push/PR | — |
| A2 inteira | I2 — credenciais da conta de teste | a pedir |
| Crash reporting (item A1) | I10 — decisão de ferramenta + DSN | a pedir |
| Contrato de chamados (Fase B) | I1 | a pedir |
| Endpoint de exclusão de conta (Fase D) | I9 — pedir junto com I1 | a pedir |
| Textos jurídicos (Fase D) | I4 | a pedir |
