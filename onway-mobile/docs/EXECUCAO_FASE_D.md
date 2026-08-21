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
