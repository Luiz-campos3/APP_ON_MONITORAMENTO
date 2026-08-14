# Plano de Implantação — Gaps do OnWay Cliente

**Data da análise:** 13/08/2026
**Base analisada:** commit `e1ff338` (apps/client, Expo SDK 54, RN 0.81.5)
**Referências:** `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` (plano macro) e `INTEGRACAO_BACKEND.md` (contrato da API `/api/v3/app`)

---

## 1. Estado atual (resumo)

### O que já funciona com dados reais
- **Autenticação Bearer completa**: login, logout, tokens em `expo-secure-store`, refresh automático em 401 com deduplicação de refresh concorrente, expulsão para login em sessão expirada (`src/services/mobile-api.ts`).
- **Dashboard, lista de usinas, detalhe, histórico de geração** (dia/semana/mês/ano/período), **contrato da usina** e **faturas** (listagem, detalhe, criação manual e upload com OCR multipart).
- Arquitetura limpa e consistente: `services → domain (mapeadores puros) → hooks → contexts → app`, com proteção anti-race (`requestVersion`) em todos os hooks de dados. TypeScript estrito compila sem erros.

### O que é fachada (mock local ou estático)
| Item | Situação |
|---|---|
| Troca de senha | `setTimeout(700)` — **o fluxo `mustChangePassword` não tem saída** |
| Recuperação de senha | `setTimeout(700)` — nenhum e-mail é enviado |
| Tickets/chamados | 100% AsyncStorage local — **a OnWay nunca fica sabendo** |
| Notificações push | `expo-notifications` nem instalado; preferências só locais (2 de 4 switches são decorativos) |
| Alertas | Derivados da lista de usinas no client; não há endpoint |
| Payback (card da Home) | `COST_PER_KWP = 4200` e `TARIFF_PER_KWH = 0.98` hardcoded (`domain/payback.ts`) |
| Checkup | 4 das 6 checagens são ruído determinístico simulado |
| Sessões/dispositivos | Card estático, sem revogação |
| Privacidade/termos, exclusão de conta | Placeholders — bloqueia App Review |
| Dados pessoais | Read-only, sem edição |
| FAQ | Array hardcoded de 4 perguntas |

### Infraestrutura
- **Zero testes, zero CI**, apenas 2 commits.
- API só acessível via **Tailscale** (sem URL de produção); `.env` por perfil EAS inexistente.
- `eas.json` com perfis de build ok, mas `submit.production` vazio.
- Patch de privacy manifest da Apple feito via script `postinstall` direto em `node_modules` (frágil; sem `patch-package`).
- 27 vulnerabilidades npm (12 moderate, 15 high — transitivas); Expo 54.0.35 → 54.0.36 pendente.
- Dead code: `getMe`, `getContracts`, `getContract`, `getInvoices` declarados e nunca usados; botão "Mais opções" sem handler em `plant/[id].tsx:77`.

---

## 2. Plano por fases

> Dependência transversal: a camada HTTP (`raw()` em `mobile-api.ts`) só aceita GET/POST. Adicionar PATCH/PUT/DELETE é pré-requisito das Fases 1–2.

### Fase 1 — Bloqueadores funcionais (backend + app) · ~2–3 semanas
Objetivo: nenhum fluxo exibido ao cliente termina num beco sem saída.

**Backend (`/api/v3/app`):**
- [ ] `POST /auth/change-password` (senha atual + nova; invalida `mustChangePassword`)
- [ ] `POST /auth/forgot-password` + `POST /auth/reset-password` (token de uso único, e-mail transacional)
- [ ] `GET/POST /tickets`, `GET /tickets/:id`, `POST /tickets/:id/messages` com ownership pelo token (o domínio de chamados já existe no backend web)

**App:**
- [ ] Suporte a PATCH/DELETE na camada HTTP
- [ ] `settings/change-password.tsx` → endpoint real; fluxo `mustChangePassword` forçado após login
- [ ] `forgot-password.tsx` → endpoint real
- [ ] `support-context.tsx` → API real, com migração/descarte dos tickets locais existentes
- [ ] Payback: buscar custo do sistema e tarifa do contrato (ou campo no cadastro da usina); enquanto não houver dado real, rotular explicitamente como "estimativa" ou ocultar o card

**Critério de saída:** cliente troca senha, recupera senha e abre chamado que chega à operação; nenhuma tela rotulada "SIMULAÇÃO" permanece em fluxo crítico.

### Fase 2 — Push, alertas e sessões · ~2–3 semanas
**Backend:**
- [ ] Tabela `mobile_devices` (push token, plataforma, versão, revogação) + `POST/DELETE /devices`
- [ ] `GET /alertas` real (regra de "usina offline"/"baixa geração" validada no servidor) + marcação de leitura
- [ ] Preferências de notificação persistidas por usuário
- [ ] `GET /me/sessions` + `DELETE /me/sessions/:id`
- [ ] Envio de push (Expo Push API) com receipts e limpeza de tokens inválidos

**App:**
- [ ] `expo-notifications` + registro de dispositivo no login, remoção no logout
- [ ] Deep link de notificação → detalhe da usina/alerta (scheme `onwayclient` já existe)
- [ ] `settings/notifications.tsx` sincronizada com backend; remover switches sem efeito ou dar efeito real
- [ ] `settings/sessions.tsx` com listagem e revogação reais
- [ ] Central de alertas consumindo o endpoint (substituir derivação local)

**Critério de saída:** push de usina offline chega no aparelho, abre a tela certa, e o usuário controla preferências e sessões de verdade.

### Fase 3 — Qualidade, conformidade e higiene · ~1–2 semanas (paralelizável)
- [ ] Testes unitários dos módulos puros: `domain/generation-calculations`, `domain/client`, `domain/contract`, `domain/payback` (jest-expo + RNTL)
- [ ] CI (GitHub Actions): `tsc --noEmit` + `expo lint` + testes em PR
- [ ] Política de privacidade e termos reais (tela interna + URL pública) e **exclusão de conta** (exigência da Apple)
- [ ] Trocar o patch de `postinstall` por `patch-package` versionado
- [ ] Limpeza: dead code da API layer, botão sem handler, `phoneDisplay` derivado da env var, `eslint-disable` de exhaustive-deps revisados
- [ ] Checkup: remover as 4 checagens simuladas ou implementá-las com dados reais; score só sobre o que é real
- [ ] `npx expo install --check` (Expo 54.0.36) + triagem do `npm audit`

**Critério de saída:** pipeline verde obrigatório em PR; nenhum texto placeholder visível; app "review-ready" no quesito privacidade.

### Fase 4 — Caminho de produção · ~2–3 semanas
- [ ] Subdomínio HTTPS público da API (ex.: `api-app.onway.app`) com rate limit; desligar dependência do Tailscale para usuários finais
- [ ] Ambientes por perfil EAS (`development`/`preview`/`production` com `EXPO_PUBLIC_API_URL` distintos); build de dev nunca aponta para produção
- [ ] `eas.json > submit` configurado (App Store Connect + Play Console); conta Apple da empresa
- [ ] TestFlight interno → grupo piloto (roteiro da Fase 5 do plano macro)
- [ ] Crash reporting sanitizado (ex.: Sentry) + métricas mínimas de login/refresh/erros
- [ ] Melhorias de faturas: câmera (`expo-image-picker`), download/visualização do anexo, exclusão

**Critério de saída:** build de produção instalável fora do tailnet, distribuído via TestFlight, com monitoramento ativo.

---

## 3. Quick wins (podem ser feitos hoje)
1. Remover os 4 endpoints mortos e o botão sem handler.
2. `phoneDisplay` calculado a partir de `EXPO_PUBLIC_ONWAY_PHONE`.
3. Atualizar Expo para 54.0.36.
4. Esconder o card de payback atrás de flag até haver dado real (evita número inventado em destaque na Home).
5. Adicionar CI mínimo (tsc + lint) — meia hora de trabalho, protege tudo que vier depois.

## 4. Riscos principais
| Risco | Mitigação |
|---|---|
| Fluxo `mustChangePassword` em loop cosmético já em uso por conta de teste | Priorizar item 1 da Fase 1 |
| Cliente acreditar que abriu chamado (ticket local) | Banner de aviso imediato ou desabilitar criação até Fase 1 |
| Payback/checkup exibirem números fictícios como reais | Quick win 4 + Fase 3 |
| App Review reprovar por privacidade/exclusão de conta | Fase 3 antes de qualquer submissão |
| Backend dos endpoints novos sem testes de ownership | Reusar a suíte de testes negativos descrita na Fase 3 do plano macro |

## 5. Fora deste plano
App do Técnico (standby, conforme README), Android além do build EAS já configurado, roteirização, assinatura de O.S. — seguem o plano macro (`PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md`, Fases 6–9).
