# Plano de Implantação V2 — OnWay Cliente

**Data:** 13/08/2026 · **Revisão 1:** 19/08/2026 · **Revisão 2:** 20/08/2026
**Baseline:** commit `34634c4` (pós-migração para a API pública)
**Substitui:** `PLANO_IMPLANTACAO_GAPS.md` (V1, 13/08/2026)
**Referências:** `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` (plano macro, fases 0–9) e `INTEGRACAO_BACKEND.md` (contrato da API)
**Registro de execução:** `EXECUCAO_FASE_A.md`, `EXECUCAO_FASE_B.md`, `EXECUCAO_FASE_C.md`, `EXECUCAO_FASE_D.md` (log por item, considerações e desvios)

> **Revisão 1 (19/08/2026)** — ajustes de sequência e segurança, autorizados pelo usuário:
> 1. Fase A dividida em **A1** (higiene, sem dependência externa — começa já) e **A2** (validação autenticada — dispara quando I2 chegar).
> 2. Novo input **I9**: endpoint de exclusão de conta no backend (dependência oculta da Fase D; exigência da Apple/LGPD).
> 3. **Crash reporting antecipado** da Fase D para a A1 (instrumentar antes das fases que mexem em código); novo input **I10** (conta/DSN).
> 4. Fase B ganha requisito explícito de **remoção de EXIF** (GPS/dispositivo) das fotos antes do upload — LGPD.
> 5. **Payback fictício ocultado por flag já na A1** (não esperar o fim da Fase C); religa quando I5 chegar.
> 6. CI nasce com `npm audit` (gate em `critical` — ver triagem no registro de execução) e scanner de segredos (gitleaks).

> **Revisão 2 (20/08/2026) — estado real após execução:**
> - **Fase A** ✅ concluída (A1 + A2 validadas contra produção; resta só I10/crash reporting).
> - **Fase B** ✅ implementada e validada (chamados reais).
> - **Fase C** — ✅ **sessões**, ✅ **alertas** (feed unificado real do servidor, v1.7.1) e ✅ **expectativa / "% da previsão"** (issue #36 + PR #40) entregues e no ar. Falta só **push + preferências** (prompt no backend; teste exige dev build + I6). **Dev build EAS já preparado** (`expo-dev-client`; runbook em `EAS_DEV_BUILD.md`).
> - **Fase D** 🟡 iniciada em paralelo — **fluxo de exclusão de conta (I9)** construído e *staged* (branch `feat/exclusao-conta`; contrato recebido, PR #42 aguarda deploy) e **passe de acessibilidade** construído e *staged* (branch `feat/acessibilidade`; aguarda teste de VoiceOver). Restam I4 (jurídico), I6 (Apple), I5 (payback), submissão.
> - **Inputs recebidos:** I1, I2, I3, I7, I9. **Pendentes:** I4, I5, I6, I8, I10.

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

**Fechados desde a V1 (20/08):** ✅ CI + testes, chamados reais, alertas reais, sessões, expectativa/"% da previsão", exclusão de conta (fluxo staged). **Continuam abertos:** push/dispositivos/preferências, payback (I5), textos jurídicos (I4), TestFlight/submissão (I6), melhorias de faturas (Fase E), crash reporting (I10).

---

## 2. Inputs externos que bloqueiam o avanço

Nada abaixo é código: são decisões ou artefatos que só a OnWay/backend pode fornecer. **São o caminho crítico real.**

| # | Input necessário | O que destrava | Observação |
|---|---|---|---|
| I1 | ~~**Contrato das rotas de chamados**~~ | Fase B inteira | ✅ **RECEBIDO (20/08/2026)**. Rotas em produção desde 14/07; doc `src/docs/app_chamados_api.md`; contrato em `INTEGRACAO_BACKEND.md`. Criação aninhada na usina (`POST /usinas/:id/chamados`), foto no campo `foto` ≤10MB, sem canal de mensagens. **Fase B destravada — só falta autorização** |
| I2 | ~~**Credenciais da conta de teste**~~ | Fase A | ✅ **RECEBIDO**. `luiz.onwayenergy@gmail.com` (cliente_app, 4 usinas/300kWp, contrato+faturas); senha só no `.env` local (gitignorado). Usada em toda validação da A2 em diante |
| I3 | ~~Confirmação do **envelope do 403** e da **semântica do 401**~~ | Fase A | ✅ **CONFIRMADO (com correção do backend, v1.6.0)**: o `code` do 403 vem aninhado em `errors.code` (app corrigido com `readErrorCode`); `SENHA_ATUAL_INVALIDA` é **403** (não 401). Contrato em `INTEGRACAO_BACKEND.md` |
| I4 | **Textos jurídicos**: política de privacidade, termos de uso, política de exclusão de conta (LGPD) | Fase D | Sem isso a Apple reprova; hoje são placeholders em `settings/privacy.tsx` |
| I5 | **Custo do sistema e tarifa por contrato/usina** (ou decisão de ocultar o card) | Payback honesto na Home | Hoje: `COST_PER_KWP = 4200` e `TARIFF_PER_KWH = 0.98` inventados em `domain/payback.ts` |
| I6 | **Conta Apple Developer da empresa** + acesso ao App Store Connect | Fase D (TestFlight) | `eas.json > submit` está vazio; projectId EAS já existe |
| I7 | ~~**Regra oficial de alerta no servidor**~~ | Fase C | ✅ **RECEBIDO (v1.7.1)**. Feed unificado `GET /alertas` (tabela `alertas` saneada + comunicação derivada ao vivo p/ todos os vendors) + `marcar-lidos` por usuário; regra `baixa_geracao` na frota por base de vizinhos (PR #38). Contrato em `INTEGRACAO_BACKEND.md`. A derivação local `toPlantAlerts` foi **aposentada** |
| I8 | **Arquivos da fonte Gilmer** (.otf/.ttf licenciados) | Identidade visual completa | `IDENTIDADE_VISUAL.md` registra que o app usa fonte de sistema até os arquivos chegarem |
| I9 | ~~**Endpoint de exclusão de conta**~~ | Fluxo de exclusão da Fase D | ✅ **RECEBIDO (PR #42, aguarda deploy)**. `POST /me/exclusao {currentPassword}`: conta=login (provado por FK graph), soft-delete+anonimização (LGPD art. 37), imediato/irreversível, dados comerciais retidos por lei. Fluxo do app construído (`settings/delete-account.tsx`). ⚠️ prazos da constante `RETENCAO` precisam da revisão jurídica do **I4** |
| I10 | **Conta/DSN de crash reporting** (ex.: Sentry — projeto + DSN) | Item de instrumentação da Fase A1 (antecipado da Fase D) | *(Revisão 1)* Sem custo obrigatório (tier gratuito atende o piloto); decisão de ferramenta é do usuário |

---

## 3. Fases de implantação

> ~~Dependência técnica transversal: a camada HTTP só aceita GET e POST.~~ ✅ **Resolvido na A1**: `authenticatedSend`/`authenticatedDelete` (PATCH/DELETE) já existem em `mobile-api.ts` e sustentaram sessões, alertas e exclusão de conta.

### Fase A — Validar a migração e blindar a base · ~1 semana

*(Revisão 1)* Dividida em duas sub-fases independentes para que a espera por I2 não trave a higiene — exatamente o que aconteceu entre 13 e 19/08.

#### Fase A1 — Higiene e rede de proteção · **sem dependência externa — fazer já**

- [x] CI no GitHub Actions: `tsc --noEmit` + eslint + testes obrigatórios em push/PR — `.github/workflows/ci.yml` criado em 19/08; **valida no primeiro push**.
- [x] *(Revisão 1)* CI inclui `npm audit` com gate em **critical** e scanner de segredos (**gitleaks**). Gate em `high` fica bloqueado pelas vulnerabilidades do toolchain Expo/Metro que só resolvem no upgrade de SDK — triagem registrada em `EXECUCAO_FASE_A.md`; subir o gate para `high` quando migrar para SDK 57+.
- [x] Testes unitários (jest-expo): **9 suítes** — `domain/*` (client, contract, generation-calculations, checkup, payback, **alert**, **session**, **support**) + `services/error-envelope`; ~130 testes em 22/08 e crescendo a cada correção (contagem exata sai no CI). *(A menção original a "74 testes em 5 suítes" ficou desatualizada — ISS-029.)*
- [x] Adicionar **PATCH/DELETE** à camada HTTP (`raw()` e `requestWithAuth` em `mobile-api.ts`) — pré-requisito transversal das Fases C e E (19/08).
- [x] *(Revisão 1)* **Ocultar o card de payback atrás de flag** (`EXPO_PUBLIC_ENABLE_PAYBACK`, default desligado) — `src/config/features.ts` (19/08); religa quando I5 chegar.
- [ ] *(Revisão 1)* Crash reporting sanitizado (sem PII, sem tokens) — **antecipado da Fase D**; bloqueado apenas por I10 (DSN).
- [x] Remover dead code da API layer: `getMe`, `getContracts`, `getContract`, `getInvoices` (zero call sites confirmado por busca) — removidos em 19/08; recriar quando as telas da Fase E existirem.
- [x] Remover o botão "Mais opções" sem handler (`plant/[id].tsx`) — substituído por espaçador para manter o título centralizado (19/08).
- [ ] Trocar o patch de `node_modules` do `postinstall` por `patch-package` — **adiado, desvio documentado em `EXECUCAO_FASE_A.md`**.
- [x] `npx expo install --check` ("Dependencies are up to date") e triagem do `npm audit` (24 → 19 após fix seguro; restantes no toolchain, ver execução) (19/08).

**Critério de saída A1:** pipeline verde obrigatório em push/PR; testes de `domain/` passando; payback invisível por default; nenhum segredo no histórico.

#### Fase A2 — Validação autenticada · depende de I2, I3

A migração foi entregue sem validação autenticada (sem credenciais). Antes de construir em cima, provar que a fundação segura funciona. **Com a conta de teste, Tailscale desligado, em 4G:**

- [x] Roteiro de aceite — **parte de API concluída em 19/08 (14/14)**: login → tokens; `/me`, `/dashboard`, `/usinas`, detalhe, histórico, contrato, faturas; usina alheia → 404 (e 400 para id malformado); refresh com rotação; logout encerra a sessão. **Pendentes:** OCR dentro do timeout, lockout (só com OK — bloqueia a conta), roteiro em aparelho físico (token no log, refresh após ociosidade).
- [x] Confirmar I3 — **confirmado com divergência dupla** (19/08): 403 de troca obrigatória vem **sem `code`** (app corrigido com fallback pela mensagem; pedir `code` ao backend) e senha atual errada responde **403**, não 401 (fluxo real já exibia a mensagem certa). Contrato registrado em `INTEGRACAO_BACKEND.md`.
- [x] Testar o fluxo forçado de `mustChangePassword` de ponta a ponta — **validado via API em 19/08** (403 nas rotas de dados → troca → liberação → flag limpa); repetir visualmente no aparelho físico.

**Critério de saída A2:** os 8 critérios de aceite passam em aparelho físico; nenhuma suposição de contrato pendente.

### Fase B — Chamados de verdade · ~1–2 semanas · depende de I1 · **🟢 IMPLEMENTADA em 20/08/2026** (ver `EXECUCAO_FASE_B.md`)

O gap mais grave que restou: o cliente "abre chamado" e **a OnWay nunca fica sabendo** (tudo em AsyncStorage). O checkup inclusive oferece "Abrir chamado de verificação" — que hoje termina no aparelho.

- [x] Backend fornece o contrato (I1); registrado em `INTEGRACAO_BACKEND.md`.
- [x] `support-context.tsx`: trocado AsyncStorage pela API (listar, abrir, criar); cache local (`@onway/chamados-cache`) só para leitura offline.
- [x] Criação com foto: `expo-image-picker` (câmera + galeria), compressão antes do envio. **Ajuste de contrato:** o limite real da foto é **10 MB** (não 25) e responde 400 (não 413) — ver I1.
- [x] *(Revisão 1)* **EXIF removido antes do upload** — reencode via `expo-image-manipulator` em `services/photo.ts`; requisito explícito e coberto (o reencode descarta GPS/metadados).
- [x] Removidos os botões de simulação de status (a tela de detalhe foi reescrita — cliente não transiciona estado).
- [x] Migração dos tickets locais: aviso único de descarte na lista + limpeza da chave antiga.
- [x] Estados: vazio, erro, offline, enviando; sem retry automático de POST.
- [x] `app.json`: permissões de câmera/galeria com textos de finalidade.
- [x] *(Desvios de produto — contrato real)* removido o **agendamento** (backend não tem), removido o **cancelamento pelo cliente**, e a tela virou **"acompanhe o andamento"** (não há canal de mensagens). Detalhes em `EXECUCAO_FASE_B.md`.

**Critério de saída:** ⚠️ parcial — a integração foi validada de ponta a ponta contra produção (criar JSON/multipart, listar, detalhe/timeline, validação de 5 chars). **Falta a confirmação de que o chamado aparece no portal da operação** (só a OnWay verifica; a criação retornou `canalOrigem:app`) e o teste visual no aparelho.

### Fase C — Alertas reais, push e sessões · **🟢 QUASE COMPLETA (20/08/2026)** — sessões, alertas e expectativa no ar; falta só push+preferências. Ver `EXECUCAO_FASE_C.md`.

**Backend (pré-requisito):**
- [x] `GET /alertas` com a regra oficial + marcação de leitura (I7) — **feed unificado no ar (v1.7.1)**: tabela `alertas` saneada (bug de ciclo de vida corrigido no v1.6.1) + comunicação derivada ao vivo p/ todos os vendors; `baixa_geracao` na frota por base de vizinhos (PR #38).
- [ ] Registro de dispositivos (push token, plataforma) e preferências de notificação por usuário — **prompt enviado (push+prefs); aguarda contrato**.
- [x] `GET /me/sessions` + `DELETE /me/sessions/:familyId` — **PR #37, no ar**.
- [ ] Envio via Expo Push API com receipts e limpeza de tokens inválidos — **parte do prompt de push**.

**App:**
- [ ] `expo-notifications`: registro no login, remoção no logout, opt-in claro — **aguarda contrato de push + dev build (I6/APNs)**. Dev build EAS já preparado (`expo-dev-client`).
- [ ] Deep link de push → `/plant/[id]` · `/tickets/[id]` · `/invoices/[id]` (mapa de rotas fechado; `data={tipo,usinaId?,alertaId?,chamadoId?,faturaId?}`). Push exige dev build.
- [x] Central de alertas consumindo o endpoint — **implementada, validada em produção e mergeada (v1.7.1)**: feed real (`origem` tabela|derivado), badge por `naoLidos`, marcar manual; a derivação local `toPlantAlerts` foi **aposentada**. Ver `EXECUCAO_FASE_C.md`.
- [x] **Expectativa / "% da previsão" (issue #36 + PR #40)** — recurso estava **morto** (API não expunha `expectativaMensalKwh`); backend passou a derivar de `usina_leitura` e o app usa `expectativaMesAteHojeKwh` como denominador. Mergeado e validado (105–109% na conta de teste).
- [ ] Reintroduzir "Relatório mensal" e "Atendimento" nas preferências, com efeito real sincronizado — **parte do prompt de push+prefs**.
- [x] `settings/sessions.tsx`: listagem e revogação reais — **validado contra produção em 20/08** (PR #37; revogação por família, "desconectar outros", `isCurrent`).
- [ ] Dados mínimos no texto da notificação (nada sensível na tela bloqueada) — **parte do push**.

**Critério de saída:** ⚠️ parcial — sessões, alertas e expectativa reais de ponta a ponta. **Falta:** push de usina offline chegar/abrir a tela certa + preferências reais (depende do contrato de push+prefs e do dev build/I6).

### Fase D — Conformidade e TestFlight · **🟡 INICIADA em paralelo à C (20/08/2026)** · depende de I4, I5, I6 · ver `EXECUCAO_FASE_D.md`

Espelha a Fase 5 do plano macro (piloto no TestFlight), com os bloqueios de loja resolvidos antes do envio.

- [~] **Fluxo de exclusão de conta (I9)** — 🟡 **construído e staged** (`settings/delete-account.tsx`, branch `feat/exclusao-conta`; aviso + reentrada de senha + textos do servidor + logout). Aguarda deploy do PR #42 p/ validar e mergear. Textos jurídicos da tela dependem do **I4**.
- [ ] Privacidade e termos reais (tela interna + URL pública) e links do login (`login.tsx`) — dependem do **I4**.
- [ ] Payback: dados reais do contrato (I5) — o card já está atrás de flag desde a A1; aqui só religa com dados reais.
- [ ] ~~Crash reporting sanitizado~~ *(Revisão 1: antecipado para a Fase A1 — depende de I10)*.
- [ ] `eas.json > submit` com credenciais do App Store Connect (I6); build `production` com `autoIncrement` já existe.
- [ ] Ícone final, screenshots reais, metadados, declaração de dados coletados (App Privacy), justificativas de permissões.
- [ ] Fonte Gilmer, se os arquivos chegarem (I8) — não bloqueia o piloto.
- [~] Passe de acessibilidade (VoiceOver, roles, headers, estados) — 🟡 **construído e staged** (branch `feat/acessibilidade`; auditoria não achou botão só-ícone sem rótulo). Aguarda teste de VoiceOver no aparelho p/ mergear.
- [ ] TestFlight interno → grupo piloto controlado; monitorar crash-free, sucesso de login e latência; go/no-go documentado (I6).

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
| ~~Contrato de chamados (I1) atrasar~~ | ~~Média~~ **Eliminado** | — | ✅ I1 recebido; Fase B implementada e validada (20/08) |
| Suposições da migração divergirem do backend (I3) | Média | Médio — troca de senha pode derrubar sessão indevidamente | Validar na Fase A antes de qualquer release; ajuste é localizado em `mobile-api.ts` |
| App Review reprovar por privacidade/exclusão de conta | ~~Alta~~ **Reduzida** | Alto — bloqueia o piloto externo | Mecânica de exclusão já existe (I9 recebido, fluxo construído); risco restante é só o **texto jurídico (I4)** e a conta Apple (I6). TestFlight interno não exige review completo e pode andar antes |
| Push validado só no Expo Go | Média | Médio — retrabalho | Dev build desde o início da Fase C |
| Rate limit de login (10/15min por IP) atingido em demonstrações/treinamentos com vários aparelhos no mesmo Wi-Fi | Baixa | Médio | Só falhas contam; documentar no roteiro de treinamento; monitorar 429 no crash reporting |
| Repositório sem testes regride durante as Fases B–D | Alta sem Fase A | Médio | CI obrigatório é a primeira entrega do plano |
| Payback fictício chegar ao piloto | ~~Baixa~~ **Eliminado** *(Revisão 1)* | Alto — número financeiro errado em destaque | Card ocultado por flag na A1 (19/08/2026); religa só com dados reais de I5 |

---

## 5. Sequência recomendada (resumo executivo)

```
Semana 1        Fase A1: CI + testes + PATCH/DELETE + flag payback + higiene (sem dependências)
Quando I2 chegar Fase A2: validação autenticada com a conta de teste
Semanas 2–3     Fase B: chamados reais (destravada por I1)
Semanas 3–5     Fase C: alertas + push + sessões (backend primeiro)
Semanas 4–6     Fase D: conformidade + TestFlight (paralela à C; I4/I6 pedidos já)
Pós-piloto      Fase E: faturas, biometria, Android, app do Técnico
```

**Ações imediatas (20/08):** o caminho crítico agora é **input do usuário**, não código — (1) **liberar o PR #42** (fecha o I9); (2) **testar o VoiceOver** no Expo Go (fecha a acessibilidade); (3) **conta Apple Developer (I6)** — maior alavancagem, destrava o TestFlight (D) *e* o teste de push (C); (4) **textos jurídicos (I4)** + revisão da constante `RETENCAO`; (5) devolver o contrato de **push+preferências** ao backend. Restam ainda I5 (payback), I8 (fonte), I10 (crash reporting).

O caminho crítico continua sendo o mesmo diagnosticado no plano macro: **não são as telas — são contratos de API, identidade e a operação de loja.** O app está com a fundação técnica pronta; o que falta é majoritariamente backend, decisão de produto e processo de publicação.
