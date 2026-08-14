# Plano de Implantação V2 — OnWay Cliente

**Data:** 13/08/2026
**Baseline:** commit `34634c4` (pós-migração para a API pública)
**Substitui:** `PLANO_IMPLANTACAO_GAPS.md` (V1, 13/08/2026)
**Referências:** `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` (plano macro, fases 0–9) e `INTEGRACAO_BACKEND.md` (contrato da API)

---

## 1. O que mudou desde a V1 (baseline)

A V1 foi escrita de manhã; à tarde a migração para a API pública entregou parte dela e **eliminou itens por decisão de produto**:

| Item da V1 | Situação agora |
|---|---|
| URL pública de produção (era Fase 4) | ✅ `https://app.onwaytech.cloud` ativa; Tailscale desligado; env por perfil EAS configurada |
| Troca de senha real (era Fase 1) | ✅ `POST /auth/change-password` + fluxo forçado de `mustChangePassword` com guard de navegação |
| Recuperação de senha (era Fase 1) | ✅ **Resolvida por decisão de segurança**: não haverá self-service; a tela instrui contato com o suporte e o operador gera senha temporária. Sai do backlog |
| Checkup com 4 checagens simuladas | ✅ Removidas; score usa só comunicação e prognóstico (reais) |
| Switches decorativos de notificação | ✅ Removidos; ficaram os 2 com efeito real |
| `phoneDisplay` hardcoded | ✅ Derivado da env var |
| Tratamento de 429/403/lockout, timeout OCR, limite 25 MB | ✅ Implementados no cliente HTTP |
| Reuso frágil de FormData no retry | ✅ Corrigido (factory por tentativa) |

**Continuam abertos da V1:** chamados reais, push/alertas/dispositivos, sessões, payback, privacidade/exclusão de conta, testes, CI, TestFlight, melhorias de faturas, dead code.

---

## 2. Inputs externos que bloqueiam o avanço

Nada abaixo é código: são decisões ou artefatos que só a OnWay/backend pode fornecer. **São o caminho crítico real.**

| # | Input necessário | O que destrava | Observação |
|---|---|---|---|
| I1 | **Contrato das rotas de chamados** (`GET/POST /api/v3/app/chamados`? campos do POST, formato do anexo/foto) | Fase B inteira | O middleware da API responde 401 antes do roteamento — é impossível descobrir rotas/schema de fora. O critério de aceite da migração citava "chamados (listar, abrir, criar com foto)", indicando que o backend já os tem |
| I2 | **Credenciais da conta de teste** | Fase A (validação dos 8 critérios de aceite da migração) | Entregar por canal seguro, nunca commitar |
| I3 | Confirmação do **envelope do 403** `PASSWORD_CHANGE_REQUIRED` (campo `code`?) e da **semântica do 401** em change-password (senha atual errada ≠ sessão expirada) | Fase A | O app assumiu `code` no envelope de erro e trata 401 pós-refresh como "senha atual incorreta" |
| I4 | **Textos jurídicos**: política de privacidade, termos de uso, política de exclusão de conta (LGPD) | Fase D | Sem isso a Apple reprova; hoje são placeholders em `settings/privacy.tsx` |
| I5 | **Custo do sistema e tarifa por contrato/usina** (ou decisão de ocultar o card) | Payback honesto na Home | Hoje: `COST_PER_KWP = 4200` e `TARIFF_PER_KWH = 0.98` inventados em `domain/payback.ts` |
| I6 | **Conta Apple Developer da empresa** + acesso ao App Store Connect | Fase D (TestFlight) | `eas.json > submit` está vazio; projectId EAS já existe |
| I7 | **Regra oficial de alerta no servidor** (usina offline / baixa geração) | Fase C | Hoje os alertas são derivados no client a partir da lista de usinas |
| I8 | **Arquivos da fonte Gilmer** (.otf/.ttf licenciados) | Identidade visual completa | `IDENTIDADE_VISUAL.md` registra que o app usa fonte de sistema até os arquivos chegarem |

---

## 3. Fases de implantação

> Dependência técnica transversal: a camada HTTP (`raw()` em `mobile-api.ts`) ainda só aceita **GET e POST**. Adicionar PATCH/DELETE é pré-requisito de qualquer edição/exclusão (faturas, sessões, dispositivos) — tarefa pequena, já que `requestWithAuth` foi unificado na migração.

### Fase A — Validar a migração e blindar a base · ~1 semana · depende de I2, I3

A migração foi entregue sem validação autenticada (sem credenciais). Antes de construir em cima, provar que a fundação segura funciona — e colocar a rede de proteção que o repositório nunca teve.

**Validação (com a conta de teste, Tailscale desligado, em 4G):**
- [ ] Roteiro de aceite completo: login → tokens no SecureStore; `/me`, `/dashboard`, `/usinas`, detalhe, histórico; faturas com OCR dentro do timeout; usina alheia → 404; refresh transparente após 15 min; lockout com 5 falhas → mensagem própria; nenhum token no log do Metro.
- [ ] Confirmar I3 (envelope do 403 e semântica do 401 na troca de senha); ajustar `mobile-api.ts` se o contrato divergir do assumido.
- [ ] Testar o fluxo forçado de `mustChangePassword` de ponta a ponta (a conta de teste tem a flag ativa).

**Higiene (não depende de ninguém — fazer já):**
- [ ] CI no GitHub Actions: `tsc --noEmit` + `expo lint` obrigatórios em push/PR (o repo já está no GitHub).
- [ ] Primeiros testes unitários (jest-expo): `domain/generation-calculations`, `domain/client` (`toPlantAlerts`, `toGenerationHistory`), `domain/contract` (`invoiceReferenceLabel`), `domain/checkup` — módulos puros, alto retorno por esforço.
- [ ] Remover dead code da API layer: `getMe`, `getContracts`, `getContract`, `getInvoices` (nunca chamados) — ou criar as telas que os usam (ver Fase E).
- [ ] Remover o botão "Mais opções" sem handler (`plant/[id].tsx:77`).
- [ ] Trocar o patch de `node_modules` do `postinstall` por `patch-package` versionado.
- [ ] `npx expo install --check` (54.0.36) e triagem do `npm audit` (27 vulnerabilidades transitivas).

**Critério de saída:** os 8 critérios de aceite passam em aparelho físico; pipeline verde obrigatório; nenhuma suposição de contrato pendente.

### Fase B — Chamados de verdade · ~1–2 semanas · depende de I1

O gap mais grave que restou: o cliente "abre chamado" e **a OnWay nunca fica sabendo** (tudo em AsyncStorage). O checkup inclusive oferece "Abrir chamado de verificação" — que hoje termina no aparelho.

- [ ] Backend fornece o contrato (I1); registrar em `INTEGRACAO_BACKEND.md`.
- [ ] `support-context.tsx`: trocar AsyncStorage pela API (listar, abrir, criar); manter cache local só para leitura offline.
- [ ] Criação com foto: `expo-image-picker` (câmera + galeria), compressão antes do envio, respeitando o limite de 25 MB e o rate limit de uploads (20/15min).
- [ ] Remover os botões de simulação de status (`tickets/[id].tsx` — "SIMULAÇÃO (SEM BACKEND)").
- [ ] Migração dos tickets locais existentes: exibir aviso único de descarte (eram apenas demonstração) — não reenviar automaticamente.
- [ ] Estados: vazio, erro, offline, enviando; sem retry automático de POST (mutação).
- [ ] `app.json`: permissões de câmera/galeria com textos de finalidade (exigência da App Review).

**Critério de saída:** chamado aberto no app aparece para a operação no portal; foto anexada chega íntegra; app nunca mais "simula sucesso".

### Fase C — Alertas reais, push e sessões · ~2–3 semanas · depende de I7 (backend)

**Backend (pré-requisito):**
- [ ] `GET /alertas` com a regra oficial validada no servidor + marcação de leitura (I7).
- [ ] Registro de dispositivos (`POST/DELETE /devices`: push token, plataforma, versão) e preferências de notificação por usuário.
- [ ] `GET /me/sessions` + `DELETE /me/sessions/:id`.
- [ ] Envio via Expo Push API com processamento de receipts e limpeza de tokens inválidos.

**App:**
- [ ] `expo-notifications`: registro no login, remoção no logout, permissão com opt-in claro.
- [ ] Deep link de push → detalhe da usina/alerta (scheme `onwayclient` já existe). Push exige dev build — não validar no Expo Go.
- [ ] Central de alertas consumindo o endpoint (substituir a derivação local de `toPlantAlerts`).
- [ ] Reintroduzir as categorias "Relatório mensal" e "Atendimento" nas preferências — agora com efeito real, sincronizadas com o backend.
- [ ] `settings/sessions.tsx`: listagem e revogação reais (usa o PATCH/DELETE da camada HTTP).
- [ ] Dados mínimos no texto da notificação (nada sensível na tela bloqueada).

**Critério de saída:** push de usina offline chega, abre a tela certa, preferências e sessões são reais de ponta a ponta.

### Fase D — Conformidade e TestFlight · ~2–3 semanas · depende de I4, I5, I6 · pode iniciar em paralelo à C

Espelha a Fase 5 do plano macro (piloto no TestFlight), com os bloqueios de loja resolvidos antes do envio.

- [ ] Privacidade e termos reais (tela interna + URL pública) e **fluxo de exclusão de conta** — a Apple exige início da exclusão dentro do app (I4).
- [ ] "Termos de Uso e Política de Privacidade" do login (`login.tsx:151`) viram links reais.
- [ ] Payback: dados reais do contrato (I5) ou card removido/atrás de flag — número inventado não vai para o piloto.
- [ ] Crash reporting sanitizado (ex.: Sentry) — sem PII, sem tokens; métricas mínimas de login/refresh/erros por versão.
- [ ] `eas.json > submit` com credenciais do App Store Connect (I6); build `production` com `autoIncrement` já existe.
- [ ] Ícone final, screenshots reais, metadados, declaração de dados coletados (App Privacy), justificativas de permissões.
- [ ] Fonte Gilmer, se os arquivos chegarem (I8) — não bloqueia o piloto.
- [ ] Passe de acessibilidade nos fluxos principais (VoiceOver, Dynamic Type, contraste) — critério do plano macro.
- [ ] TestFlight interno → grupo piloto controlado; monitorar crash-free, sucesso de login e latência; go/no-go documentado.

**Critério de saída:** cliente piloto instala pelo TestFlight, usa sem ajuda do desenvolvedor e nenhum item de App Review está pendente.

### Fase E — Evoluções pós-piloto · contínuo

Em ordem de valor sugerida:

1. **Faturas**: download/visualização do anexo (`invoices/[id].tsx` só diz que ele existe), câmera na captura, edição/exclusão (PATCH/DELETE), tela de lista global (o endpoint `GET /faturas` existe e está sem uso).
2. **Checkup**: reintroduzir alarmes, PR e temperatura quando o backend expuser os parâmetros — sempre reais.
3. **Refresh proativo** do access token (agendar antes dos ~15 min) — elimina o custo de 2 round-trips na primeira request após ociosidade.
4. **Biometria** para reentrada (Face ID/Touch ID desbloqueando credencial existente).
5. **Edição de dados pessoais** (depende de endpoint próprio).
6. **Android** (Fase 9 do macro): os builds APK/AAB já estão no `eas.json`; falta FCM, revisão de permissões e piloto.
7. **App do Técnico** (Fases 6–8 do macro): segue o plano macro — não iniciar antes do Cliente estabilizado no piloto, e exige o trabalho pesado de offline/sync/checklist canônico descrito lá.

---

## 4. Riscos e mitigações

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Contrato de chamados (I1) atrasar e o app seguir "simulando" abertura | Média | Alto — cliente confia num canal que não existe | Se I1 não chegar em 2 semanas, **desabilitar a criação de tickets** e apontar para WhatsApp (1 dia de trabalho) |
| Suposições da migração divergirem do backend (I3) | Média | Médio — troca de senha pode derrubar sessão indevidamente | Validar na Fase A antes de qualquer release; ajuste é localizado em `mobile-api.ts` |
| App Review reprovar por privacidade/exclusão de conta | Alta se I4 atrasar | Alto — bloqueia o piloto externo | Pedir os textos jurídicos **agora**; TestFlight interno não exige review completo e pode andar antes |
| Push validado só no Expo Go | Média | Médio — retrabalho | Dev build desde o início da Fase C |
| Rate limit de login (10/15min por IP) atingido em demonstrações/treinamentos com vários aparelhos no mesmo Wi-Fi | Baixa | Médio | Só falhas contam; documentar no roteiro de treinamento; monitorar 429 no crash reporting |
| Repositório sem testes regride durante as Fases B–D | Alta sem Fase A | Médio | CI obrigatório é a primeira entrega do plano |
| Payback fictício chegar ao piloto | Baixa (flag prevista) | Alto — número financeiro errado em destaque | Decisão I5 até o fim da Fase C; default é ocultar |

---

## 5. Sequência recomendada (resumo executivo)

```
Semana 1        Fase A: validação com conta de teste + CI + testes unitários + higiene
Semanas 2–3     Fase B: chamados reais (destravada por I1)
Semanas 3–5     Fase C: alertas + push + sessões (backend primeiro)
Semanas 4–6     Fase D: conformidade + TestFlight (paralela à C; I4/I6 pedidos já)
Pós-piloto      Fase E: faturas, biometria, Android, app do Técnico
```

**Ações imediatas (esta semana):** pedir I1, I2 e I4 (são os três inputs que travam tudo); subir o CI; escrever os primeiros testes de `domain/`.

O caminho crítico continua sendo o mesmo diagnosticado no plano macro: **não são as telas — são contratos de API, identidade e a operação de loja.** O app está com a fundação técnica pronta; o que falta é majoritariamente backend, decisão de produto e processo de publicação.
