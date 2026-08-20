import type { SymbolIcon } from '@/components/symbol-icon';
import type { ApiTicket, ApiTicketEvent } from '@/services/mobile-api';

type IconName = Parameters<typeof SymbolIcon>[0];

// "Tipo de chamado" é só uma conveniência de UX na abertura: vira `categoria`
// (string livre) no POST. A triagem interna do backend pode reclassificar.
export type TicketKind = 'verificacao' | 'orcamento' | 'ordem_servico';

export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger';

export type TicketEvent = {
  title: string;
  atLabel: string;
};

// Espelha o objeto Chamado do backend (camelCase). O app NÃO transiciona
// estado — só lê. `numero` (CH-0043) é o protocolo público.
export type SupportTicket = {
  id: string;
  numero: string;
  status: string;
  statusLabel: string;
  encerrado: boolean;
  categoria: string | null;
  subcategoria: string | null;
  natureza: string | null;
  urgencia: string | null;
  description: string;
  plantId: string | null;
  plantName: string | null;
  channel: string;
  createdAtLabel: string;
  closedAtLabel: string | null;
  hasAttachment: boolean;
  createdAt: string;
  timeline: TicketEvent[];
};

export type NewTicketDraft = {
  usinaId: string;
  categoria: string | null;
  urgencia: string | null;
  description: string;
};

export const TICKET_KINDS: TicketKind[] = ['verificacao', 'orcamento', 'ordem_servico'];

type KindMeta = { label: string; short: string; description: string; categoria: string; ios: IconName['ios']; android: string };

const KIND_META: Record<TicketKind, KindMeta> = {
  verificacao: {
    label: 'Verificação de sistema',
    short: 'Verificação',
    description: 'Solicite uma checagem técnica do funcionamento da usina.',
    categoria: 'Verificação de sistema',
    ios: 'stethoscope',
    android: 'health_and_safety',
  },
  orcamento: {
    label: 'Orçamento de serviços',
    short: 'Orçamento',
    description: 'Peça um orçamento para manutenção, ampliação ou reparo.',
    categoria: 'Orçamento',
    ios: 'doc.text.magnifyingglass',
    android: 'request_quote',
  },
  ordem_servico: {
    label: 'Manutenção / reparo',
    short: 'Manutenção',
    description: 'Relate um problema que precisa de manutenção ou reparo.',
    categoria: 'Manutenção',
    ios: 'wrench.and.screwdriver.fill',
    android: 'build',
  },
};

export function ticketKindMeta(kind: TicketKind) {
  return KIND_META[kind];
}

export const URGENCY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
] as const;

// Tom visual por status bruto (exibimos sempre o statusLabel que vem da API).
const STATUS_TONE: Record<string, Tone> = {
  novo: 'accent',
  em_triagem: 'accent',
  em_atendimento: 'accent',
  aguardando_cliente: 'warning',
  em_analise_tecnica: 'accent',
  aguardando_aprovacao: 'warning',
  os_gerada: 'accent',
  resolvido: 'success',
  cancelado: 'neutral',
};

export function ticketStatusTone(status: string): Tone {
  return STATUS_TONE[status] ?? 'accent';
}

// Estado em que a operação aguarda algo do cliente — merece destaque na lista.
export function ticketNeedsAttention(ticket: SupportTicket) {
  return ticket.status === 'aguardando_cliente';
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

// Aceita AAAA-MM-DD (dataCriacao/dataFechamento) e devolve DD/MM/AAAA.
export function formatDateBR(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return '—';
  const date = parseISODate(raw.slice(0, 10));
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Marco da timeline: "DD/MM/AAAA às HH:MM" a partir do ISO.
function formatEventDateTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toTicketEvent(event: ApiTicketEvent): TicketEvent {
  return {
    title: normalizeText(event.titulo) || 'Atualização',
    atLabel: formatEventDateTime(event.em),
  };
}

export function toTicket(api: ApiTicket): SupportTicket {
  return {
    id: api.id,
    numero: normalizeText(api.numero) || '—',
    status: normalizeText(api.status),
    statusLabel: normalizeText(api.statusLabel) || 'Aberto',
    encerrado: Boolean(api.encerrado),
    categoria: normalizeText(api.categoria) || null,
    subcategoria: normalizeText(api.subcategoria) || null,
    natureza: normalizeText(api.natureza) || null,
    urgencia: normalizeText(api.urgencia) || null,
    description: normalizeText(api.descricaoProblema),
    plantId: normalizeText(api.usinaId) || null,
    plantName: normalizeText(api.usinaNome) || null,
    channel: normalizeText(api.canalOrigem),
    createdAtLabel: formatDateBR(api.dataCriacao ?? api.criadoEm),
    closedAtLabel: api.dataFechamento ? formatDateBR(api.dataFechamento) : null,
    hasAttachment: Boolean(api.temAnexo),
    createdAt: api.criadoEm,
    timeline: Array.isArray(api.timeline) ? api.timeline.map(toTicketEvent) : [],
  };
}
