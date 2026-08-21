# Execução — Fase D (Conformidade e TestFlight)

Registro de execução da Fase D (backend-first onde há dependência de contrato).
Iniciada em 20/08/2026, **em paralelo à cauda da Fase C** (push+preferências, que
está parada no backend e na conta Apple) — o próprio Plano V2 prevê D || C.

Fase D = deixar o app **aprovável na App Store** e colocá-lo no **TestFlight**.
Bloqueada fortemente por inputs externos: **I9** (endpoint de exclusão de conta,
backend), **I4** (textos jurídicos, usuário), **I6** (conta Apple Developer + App
Store Connect, usuário — também destrava o teste de push da Fase C), I5 (payback).

## I9 — Exclusão de conta (bloqueador crítico da App Store) — prompt de backend (20/08)

**Por quê:** App Store Review Guideline 5.1.1(v) — app que permite criar conta é
obrigado a permitir INICIAR a exclusão dentro do app; sem isso a Apple reprova. + LGPD
(direito à exclusão). Hoje `settings/privacy.tsx` diz "Encerramento de conta
indisponível pelo app / A API atual não possui endpoint seguro" — é isso que reprova.

Prompt entregue ao usuário para levar ao backend:

```text
Fase D do app — I9: exclusão de conta pelo app. Bloqueador crítico da App Store
(regra 5.1.1(v): app que cria conta é obrigado a permitir INICIAR a exclusão dentro do
app) + direito da LGPD. Hoje settings/privacy.tsx diz "Encerramento de conta indisponível
pelo app" — é isso que a Apple reprova. A Apple aceita prazo de processamento e retenção
do que a lei exige; não precisa ser apagão instantâneo, precisa começar pelo app.

Endpoint proposto (authenticateApp, sempre o próprio usuário):
  POST /api/v3/app/me/exclusao   body { senha }   (reautenticação obrigatória)
  → devolve o que aconteceu: modo(imediato|agendado), dataEfetiva, o que é retido.
(Se preferir DELETE /api/v3/app/me, tudo bem — me diga o verbo/rota final.)

Decisões que preciso de você (é o coração disso):

1. O QUE É "conta" aqui? O usuário de login do app, ou a entidade cliente inteira?
   Suspeito que usinas/contrato/faturas são da relação comercial com a empresa e NÃO
   devem sumir só porque o usuário do app pediu exclusão. Minha leitura: excluir a CONTA
   DE LOGIN (acesso + dados pessoais do usuário), retendo o que é da empresa/lei. Confirme.

2. Soft-delete vs hard-delete + retenção. Proposta: soft-delete — marca a conta como
   em_exclusao, revoga TODAS as sessões e tokens de push na hora, anonimiza/remove os
   dados pessoais que dá, e RETÉM o que a lei obriga (fiscais de contrato/fatura) pelo
   prazo legal. Quais tabelas são tocadas e qual o prazo legal de retenção?

3. Prazo de arrependimento? Ex.: 15–30 dias em que logar de novo reativa, antes de
   efetivar de vez. Ou irreversível na hora. O que você prefere?

4. Segurança. Além da senha no corpo, quer confirmação por e-mail (link/código)? Ou
   senha basta? (a senha já barra sessão roubada).

5. Prazo LGPD de conclusão da exclusão (para eu mostrar honesto no app).

6. Estados: se o usuário já está em_exclusao e chama de novo (idempotente/erro claro)?
   E há mais de um usuário de app por cliente (excluir um afeta os outros)?

O app, com o contrato de volta: fluxo em Configurações — aviso claro (o que é apagado, o
que é retido por lei e por quê, o prazo), reentrada de senha, chamada ao endpoint, e ao
concluir desloga e mostra a confirmação. O texto jurídico exato vem do I4 (política de
exclusão); o endpoint é o que destrava a mecânica.

Restrições: escopo do próprio usuário, envelope padrão, senha errada → erro claro (mesma
semântica do change-password: 403 "Senha atual inválida"?). A exclusão é a exceção
deliberada ao "resolver nunca deletar", e mesmo ela retém o que a lei manda. Me devolva o
contrato real (rota, corpo, resposta, o que some vs o que fica, prazo) para eu registrar
no INTEGRACAO_BACKEND.md e construir o fluxo.
```

**Estado:** prompt entregue. Aguarda contrato do backend para construir o fluxo no app
(substituindo o placeholder em `settings/privacy.tsx`) e validar. Depende também do I4
(texto da política de exclusão) para o conteúdo da tela de confirmação.

## I9 — contrato recebido (PR #42, pendente de deploy · sem migration)

Backend fechou com rigor. Registro do que voltou e das decisões.

**1. "Conta" = login (provado, não suposto):** grafo de FKs mostra que NADA comercial
referencia `usuarios` — contratos, faturas, chamados, cliente_usinas, orcamentos pendem
de `clientes`. De `usuarios` pende só acesso/preferência. Apagar o login é
estruturalmente incapaz de apagar uma nota fiscal; o esquema já garante, sem guarda no código.

**2. Soft-delete com anonimização** (não delete de linha) — porque `user_consents`
aponta para o id do usuário e a LGPD art. 37 exige que o registro do tratamento
sobreviva ao titular. Tocado: `usuarios` (nome/email/telefone/gênero/senha/2FA limpos;
ativo=false, deleted_at, security_version++), `user_sessions`+`trusted_devices`
revogados, `cliente_usuarios` desativado (não apagado — preserva histórico), e apagados
`alerta_leituras`/`login_challenges`/`password_reset_tokens`/`mfa_recovery_codes`. E-mail
vira `excluido-<id>@invalido.local` (libera o endereço original para reuso).

**3. Sem prazo de arrependimento** — imediato e irreversível. Rede de segurança melhor:
operador reemite acesso pela tela do cliente (rotina). Prazo de 30 dias exigiria manter
viva a conta que a pessoa pediu para apagar + job de expurgo. Apple aceita as duas formas.

**4. Senha basta** (sem confirmação por e-mail) — raio de dano de exclusão maliciosa é
"perde o app e o operador reemite"; os dados do cliente sobrevivem.

**5. Prazo LGPD:** o dado pessoal some na transação (imediato) — é o que o app mostra.
⚠️ **Os prazos de RETENÇÃO codificados precisam de revisão jurídica (I4):** 5 anos fiscal
(CTN 173/174), contratual por LGPD art. 16 I e III. Isolado numa constante `RETENCAO`
para o advogado corrigir sem tocar em código.

**6. Estados:** chamar de novo → 401 (anonimizada não autentica, findById filtra
deleted_at); concorrência → `UPDATE ... WHERE deleted_at IS NULL` decide, 2º recebe 409;
multi-conta por cliente → excluir uma não afeta a irmã (testado).

**Contrato:** `POST /api/v3/app/me/exclusao` `{ currentPassword }` (ANTES do gate de
troca de senha — Apple exige caminho sem obstáculo). 200 → `{ modo:'imediato', dataEfetiva,
sessoesRevogadas, removido[] (texto), retido[] (item/prazo/porque), politicaVersao }` — textos
PRONTOS do servidor. Erros: 403 SENHA_ATUAL_INVALIDA (mesma semântica do change-password,
já tratada), 400 sem senha, 401 sessão morta. **Campo: decidido `currentPassword`** (o app
já usa no change-password; backend remove o alias `senha`). Prova: senha errada→403,
exclusão→200, login excluído→401, conta irmã→200 vê usina, contrato/fatura/usina/cliente
intactos, auditoria sem PII. 242/242 testes (14 specs = contrato legal executável, inclui
asserção de que nenhuma tabela comercial aparece no SQL da exclusão). Sem migration.

**Nota push:** token de push é dado pessoal → entra na limpeza quando a tabela de
dispositivos existir (aviso deixado no código).

**App (próximo):** método `deleteAccount(currentPassword)` + fluxo em Configurações
(substitui o placeholder "indisponível" em settings/privacy.tsx): aviso → reentrada de
senha → POST → tela final com os textos do servidor (removido/retido/dataEfetiva) → logout.
Pré-aviso com texto honesto meu (o I4 refina a redação jurídica; NÃO bloqueia a mecânica).
Staged em branch; validação contra prod após release do PR #42. Contrato entra no
INTEGRACAO_BACKEND.md após deploy + validação.
