# Plano de Implantação V2 — OnWay Cliente

**Data:** 13/08/2026 · **Revisão 1:** 19/08/2026
**Baseline:** commit `34634c4` (pós-migração para a API pública)
**Substitui:** `PLANO_IMPLANTACAO_GAPS.md` (V1, 13/08/2026)
**Referências:** `PLANO_DESENVOLVIMENTO_MOBILE_ONWAY.md` (plano macro, fases 0–9) e `INTEGRACAO_BACKEND.md` (contrato da API)
**Registro de execução:** `EXECUCAO_FASE_A.md` (log por item, considerações e desvios)

> **Revisão 1 (19/08/2026)** — ajustes de sequência e segurança, autorizados pelo usuário:
> 1. Fase A dividida em **A1** (higiene, sem dependência externa — começa já) e **A2** (validação autenticada — dispara quando I2 chegar).
> 2. Novo input **I9**: endpoint de exclusão de conta no backend (dependência oculta da Fase D; exigência da Apple/LGPD).
> 3. **Crash reporting antecipado** da Fase D para a A1 (instrumentar antes das fases que mexem em código); novo input **I10** (conta/DSN).
> 4. Fase B ganha requisito explícito de **remoção de EXIF** (GPS/dispositivo) das fotos antes do upload — LGPD.
> 5. **Payback fictício ocultado por flag já na A1** (não esperar o fim da Fase C); religa quando I5 chegar.
> 6. CI nasce com `npm audit` (gate em `critical` — ver triagem no registro de execução) e scanner de segredos (gitleaks).

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
| I1 | ~~**Contrato das rotas de chamados**~~ | Fase B inteira | ✅ **RECEBIDO (20/08/2026)**. Rotas em produção desde 14/07; doc `src/docs/app_chamados_api.md`; contrato em `INTEGRACAO_BACKEND.md`. Criação aninhada na usina (`POST /usinas/:id/chamados`), foto no campo `foto` ≤10MB, sem canal de mensagens. **Fase B destravada — só falta autorização** |
| I2 | **Credenciais da conta de teste** | Fase A (validação dos 8 critérios de aceite da migração) | Entregar por canal seguro, nunca commitar |
| I3 | Confirmação do **envelope do 403** `PASSWORD_CHANGE_REQUIRED` (campo `code`?) e da **semântica do 401** em change-password (senha atual errada ≠ sessão expirada) | Fase A | O app assumiu `code` no envelope de erro e trata 401 pós-refresh como "senha atual incorreta" |
| I4 | **Textos jurídicos**: política de privacidade, termos de uso, política de exclusão de conta (LGPD) | Fase D | Sem isso a Apple reprova; hoje são placeholders em `settings/privacy.tsx` |
| I5 | **Custo do sistema e tarifa por contrato/usina** (ou decisão de ocultar o card) | Payback honesto na Home | Hoje: `COST_PER_KWP = 4200` e `TARIFF_PER_KWH = 0.98` inventados em `domain/payback.ts` |
| I6 | **Conta Apple Developer da empresa** + acesso ao App Store Connect | Fase D (TestFlight) | `eas.json > submit` está vazio; projectId EAS já existe |
| I7 | **Regra oficial de alerta no servidor** (usina offline / baixa geração) | Fase C | Hoje os alertas são derivados no client a partir da lista de usinas |
| I8 | **Arquivos da fonte Gilmer** (.otf/.ttf licenciados) | Identidade visual completa | `IDENTIDADE_VISUAL.md` registra que o app usa fonte de sistema até os arquivos chegarem |
| I9 | **Endpoint de exclusão de conta** no backend (contrato: rota, efeito nos dados, prazo LGPD) | Fluxo de exclusão da Fase D — a Apple exige início da exclusão dentro do app | *(Revisão 1)* Dependência oculta descoberta na revisão: `settings/privacy.tsx` registra que a API não possui o endpoint. Pedir **junto com I1** — mesma conversa com o backend |
| I10 | **Conta/DSN de crash reporting** (ex.: Sentry — projeto + DSN) | Item de instrumentação da Fase A1 (antecipado da Fase D) | *(Revisão 1)* Sem custo obrigatório (tier gratuito atende o piloto); decisão de ferramenta é do usuário |

---

## 3. Fases de implantação

> Dependência técnica transversal: a camada HTTP (`raw()` em `mobile-api.ts`) ainda só aceita **GET e POST**. Adicionar PATCH/DELETE é pré-requisito de qualquer edição/exclusão (faturas, sessões, dispositivos) — tarefa pequena, já que `requestWithAuth` foi unificado na migração.

### Fase A — Validar a migração e blindar a base · ~1 semana

*(Revisão 1)* Dividida em duas sub-fases independentes para que a espera por I2 não trave a higiene — exatamente o que aconteceu entre 13 e 19/08.

#### Fase A1 — Higiene e rede de proteção · **sem dependência externa — fazer já**

- [x] CI no GitHub Actions: `tsc --noEmit` + eslint + testes obrigatórios em push/PR — `.github/workflows/ci.yml` criado em 19/08; **valida no primeiro push**.
- [x] *(Revisão 1)* CI inclui `npm audit` com gate em **critical** e scanner de segredos (**gitleaks**). Gate em `high` fica bloqueado pelas vulnerabilidades do toolchain Expo/Metro que só resolvem no upgrade de SDK — triagem registrada em `EXECUCAO_FASE_A.md`; subir o gate para `high` quando migrar para SDK 57+.
- [x] Primeiros testes unitários (jest-expo): **74 testes em 5 suítes** — `domain/client`, `domain/contract`, `domain/generation-calculations`, `domain/checkup` e `domain/payback` (19/08).
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

### Fase C — Alertas reais, push e sessões · ~2–3 semanas · depende de I7 (backend) · **🟡 INICIADA em 20/08/2026** (backend-first — prompt de contratos enviado; ver `EXECUCAO_FASE_C.md`)

**Backend (pré-requisito):**
- [ ] `GET /alertas` com a regra oficial validada no servidor + marcação de leitura (I7).
- [ ] Registro de dispositivos (`POST/DELETE /devices`: push token, plataforma, versão) e preferências de notificação por usuário.
- [ ] `GET /me/sessions` + `DELETE /me/sessions/:id`.
- [ ] Envio via Expo Push API com processamento de receipts e limpeza de tokens inválidos.

**App:**
- [ ] `expo-notifications`: registro no login, remoção no logout, permissão com opt-in claro.
- [ ] Deep link de push → detalhe da usina/alerta (scheme `onwayclient` já existe). Push exige dev build — não validar no Expo Go.
- [ ] Central de alertas consumindo o endpoint. *(Correção 20/08: `toPlantAlerts` **não** é derivação local falsa — formata `temAlerta`/`status`/`alertaMensagem` calculados no servidor a cada coleta, que estão **vivos**. A tabela `alertas` está **congelada** desde 29/07 por um bug de ciclo de vida. NÃO trocar a derivação viva pela tabela antes do backend consertar o ciclo + adicionar produtor de conectividade + leitura por usuário — senão a tela mostraria dados de julho.)*
- [ ] Reintroduzir as categorias "Relatório mensal" e "Atendimento" nas preferências — agora com efeito real, sincronizadas com o backend.
- [ ] `settings/sessions.tsx`: listagem e revogação reais (usa o PATCH/DELETE da camada HTTP).
- [ ] Dados mínimos no texto da notificação (nada sensível na tela bloqueada).

**Critério de saída:** push de usina offline chega, abre a tela certa, preferências e sessões são reais de ponta a ponta.

### Fase D — Conformidade e TestFlight · ~2–3 semanas · depende de I4, I5, I6 · pode iniciar em paralelo à C

Espelha a Fase 5 do plano macro (piloto no TestFlight), com os bloqueios de loja resolvidos antes do envio.

- [ ] Privacidade e termos reais (tela interna + URL pública) e **fluxo de exclusão de conta** — a Apple exige início da exclusão dentro do app (I4).
- [ ] "Termos de Uso e Política de Privacidade" do login (`login.tsx:151`) viram links reais.
- [ ] Payback: dados reais do contrato (I5) — *(Revisão 1)* o card já está atrás de flag desde a A1; aqui só religa com dados reais.
- [ ] ~~Crash reporting sanitizado~~ *(Revisão 1: antecipado para a Fase A1 — depende de I10)*.
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

**Ações imediatas (esta semana):** pedir **I1, I2, I4 e I9** (I9 na mesma conversa do I1 com o backend); executar a A1 inteira; decidir I10 (ferramenta de crash reporting).

O caminho crítico continua sendo o mesmo diagnosticado no plano macro: **não são as telas — são contratos de API, identidade e a operação de loja.** O app está com a fundação técnica pronta; o que falta é majoritariamente backend, decisão de produto e processo de publicação.
