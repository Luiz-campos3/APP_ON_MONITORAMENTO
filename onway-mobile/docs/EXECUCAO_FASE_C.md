# Registro de Execução — Fase C (Alertas reais, push e sessões)

> Autorizada pelo usuário em 20/08/2026. Fase **backend-first**: o app só avança
> depois dos contratos. Mesma regra: cada execução documentada, desvios
> registrados, nenhuma fase nova sem autorização.

## Status

| Frente | Estado |
|---|---|
| Prompt de contratos para o backend | 🟢 Preparado (20/08) — abaixo |
| Alertas reais (I7) | ⛔ Aguardando contrato do backend |
| Dispositivos / push | ⛔ Aguardando contrato + decisão de envio (Expo Push API) |
| Preferências de notificação | ⛔ Aguardando contrato |
| Sessões | ⛔ Aguardando contrato |
| Trabalho no app | ⏸ Só começa com os contratos (push exige **dev build**, não Expo Go) |

Pré-requisito técnico já resolvido na Fase A: a camada HTTP aceita PATCH/DELETE.

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
