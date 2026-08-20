# Registro de Execução — Fase B (Chamados reais)

> Log da execução da Fase B do `PLANO_IMPLANTACAO_V2.md`.
> Autorizada pelo usuário em 20/08/2026 (destravada pelo I1). Mesma regra:
> cada execução documentada, desvios registrados, nenhuma fase nova sem
> autorização.

## Objetivo

Trocar o mock de chamados (AsyncStorage, "simulava sucesso") pela integração
real com a API `/api/v3/app/chamados` (contrato v1.6.0), incluindo abertura com
foto. O cliente passa a abrir chamados que **realmente chegam à operação**.

## Decisões de produto forçadas pelo contrato real

O modelo do backend é diferente do que o mock inventou. Alinhamentos honestos:

1. **Sem agendamento.** O mock tinha um fluxo de "semana prevista" + "confirmar
   data 48h antes". O backend **não tem** esse conceito — é triagem de suporte,
   não agenda. Removido: seletor de semana, `preferredWeekStart`,
   `scheduledDate`, "confirmaremos a data".
2. **Cliente não transiciona estado.** O app **não pode cancelar** nem mudar
   status (o backend não expõe isso ao app). Removidos os botões de cancelar e
   as "SIMULAÇÃO (SEM BACKEND)".
3. **Sem canal de mensagens.** Não há conversa cliente↔operação, só a `timeline`
   de marcos de estado. A tela foi redesenhada como **"acompanhe o andamento"**,
   não "converse com o suporte" (com nota apontando os canais de contato do
   perfil para falar com a OnWay).
4. **"Tipo de chamado"** (verificação/orçamento/manutenção) virou só uma
   conveniência de UX que preenche `categoria` (string livre; a triagem pode
   reclassificar). O `numero` (CH-0043) é o protocolo público.

## Implementação (20/08/2026)

**Dependências:** `expo-image-picker` + `expo-image-manipulator` (ambas rodam no
Expo Go — não exigem dev build como o push).

**API layer (`mobile-api.ts`):** tipos `ApiTicket`, `ApiTicketEvent`,
`TicketsResponse`, `CreateTicketPayload`, `UploadFile`; métodos `listTickets`
(paginado + `usinaId` opcional), `getTicket`, `createTicket` (JSON sem foto,
multipart no campo `foto` com foto). Timeout de upload 60s. Sem retry de POST.

**Domínio (`support.ts`):** reescrito para o modelo real. `SupportTicket`
espelha o Chamado; `toTicket` mapeia; `ticketStatusTone` cobre os 9 status
(exibindo sempre o `statusLabel` da API); `ticketNeedsAttention` destaca
`aguardando_cliente`; `formatDateBR` e timeline formatada. **11 testes** novos.

**Foto (`services/photo.ts`):** `captureTicketPhoto`/`pickTicketPhoto` pedem
permissão, abrem câmera/galeria e **reencodam via `expo-image-manipulator`**
(resize p/ 1600px + JPEG 0.7). O reencode **descarta o EXIF (GPS/aparelho)** —
requisito de LGPD da Revisão 1, agora garantido e não acidental.

**Contexto (`support-context.tsx`):** API real com **cache offline só de
leitura** (chave nova `@onway/chamados-cache`); gating por auth; `reload`,
`createTicket(draft, photo?)`, `fetchTicket(id)` (traz timeline). **Descarte
único** dos tickets de demonstração do mock antigo (`@onway/support-tickets`),
com aviso na lista.

**Telas:**
- Lista: pull-to-refresh, loading, aviso de migração, banner de "última lista
  salva" offline, estado vazio e de erro, badge por status, destaque
  "Aguardando você".
- Nova: tipo → categoria, usina (obrigatória — criação é aninhada na usina),
  urgência opcional, descrição (mín. 5 chars validado no cliente), foto
  (câmera/galeria, preview, remover), estados enviando/erro **sem retry
  automático de POST**.
- Detalhe: busca o detalhe (timeline real), sem botões de simulação/cancelar,
  nota de que as atualizações são da OnWay.

**Permissões (`app.json`):** plugin `expo-image-picker` com textos de finalidade
de câmera e fotos (exigência da App Review; injeta NS*UsageDescription no iOS e
permissões no Android no build EAS).

## Validação

- `tsc --noEmit`, `eslint . --max-warnings 0`, **100 testes (7 suítes)** — verde.
- **Integração real contra produção** (conta de teste): validado o request e o
  response de verdade — é onde o teste do OCR pegara um bug de contrato.
  Resultado, todos OK:
  | # | Cenário | Resultado |
  |---|---|---|
  | 1 | descrição < 5 chars | `400 "Descreva o problema (mínimo 5 caracteres)."` |
  | 2 | criar sem foto (JSON) | `201` · CH-0001 · status `novo`/"Novo" · `temAnexo:false` · `canalOrigem:app` · **18 chaves batem com `ApiTicket`** |
  | 3 | criar com foto (multipart `foto`, PNG) | `201` · CH-0002 · **`temAnexo:true`** |
  | 4 | listar | `paginacao.total=2`, 2 itens |
  | 5 | detalhe | `timeline:[{em, titulo:"Chamado aberto"}]` |

  Sem surpresa de contrato desta vez — o mapeamento estava correto.

**⚠️ Dado de teste criado:** os chamados **CH-0001 e CH-0002** (descrição
"[TESTE APP - IGNORAR]") ficaram na conta de teste. **O app não pode
cancelá-los** (cliente não transiciona estado) — a operação precisa fechá-los no
portal, ou deixá-los como dado de teste.

## Pendente / próximos

- **Teste visual no aparelho** (Expo Go): abrir chamado com foto da câmera e da
  galeria, ver a timeline, o estado offline e o aviso de migração.
- **Critério de aceite "aparece para a operação no portal"**: só a OnWay
  confirma (não tenho acesso ao portal); a criação retornou `canalOrigem:app`.
- Exibir a **foto anexada** no detalhe exigiria baixar `/chamados/:id/anexo`
  (binário autenticado) — fora do escopo do MVP; hoje só indica "Foto anexada".
