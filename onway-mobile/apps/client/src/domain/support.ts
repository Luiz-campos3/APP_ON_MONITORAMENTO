import type { SymbolIcon } from '@/components/symbol-icon';

type IconName = Parameters<typeof SymbolIcon>[0];

export type TicketKind = 'verificacao' | 'orcamento' | 'ordem_servico';

export type TicketStatus =
  | 'aberto'
  | 'em_analise'
  | 'agendado'
  | 'confirmado'
  | 'concluido'
  | 'cancelado';

export type SupportTicket = {
  id: string;
  kind: TicketKind;
  plantId: string | null;
  plantName: string | null;
  description: string;
  /** Segunda-feira (YYYY-MM-DD) da semana prevista para o serviço. */
  preferredWeekStart: string | null;
  /** Data confirmada (YYYY-MM-DD) — definida na confirmação até 48h antes. */
  scheduledDate: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type NewTicketDraft = {
  kind: TicketKind;
  plantId: string | null;
  plantName: string | null;
  description: string;
  preferredWeekStart: string | null;
};

export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger';

export const TICKET_KINDS: TicketKind[] = ['verificacao', 'orcamento', 'ordem_servico'];

type KindMeta = { label: string; short: string; description: string; ios: IconName['ios']; android: string };

const KIND_META: Record<TicketKind, KindMeta> = {
  verificacao: {
    label: 'Verificação de sistema',
    short: 'Verificação',
    description: 'Solicite uma checagem técnica do funcionamento da usina.',
    ios: 'stethoscope',
    android: 'health_and_safety',
  },
  orcamento: {
    label: 'Orçamento de serviços',
    short: 'Orçamento',
    description: 'Peça um orçamento para manutenção, ampliação ou reparo.',
    ios: 'doc.text.magnifyingglass',
    android: 'request_quote',
  },
  ordem_servico: {
    label: 'Ordem de serviço',
    short: 'Ordem de serviço',
    description: 'Abra uma OS e agende uma semana prevista para a execução.',
    ios: 'wrench.and.screwdriver.fill',
    android: 'build',
  },
};

export function ticketKindMeta(kind: TicketKind) {
  return KIND_META[kind];
}

type StatusMeta = { label: string; tone: Tone };

const STATUS_META: Record<TicketStatus, StatusMeta> = {
  aberto: { label: 'Aberto', tone: 'accent' },
  em_analise: { label: 'Em análise', tone: 'accent' },
  agendado: { label: 'Semana prevista', tone: 'warning' },
  confirmado: { label: 'Data confirmada', tone: 'success' },
  concluido: { label: 'Concluído', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

export function ticketStatusMeta(status: TicketStatus) {
  return STATUS_META[status];
}

export function isTicketOpen(status: TicketStatus) {
  return status !== 'concluido' && status !== 'cancelado';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDateBR(value: string | null | undefined) {
  if (!value) return '—';
  const date = parseISODate(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const weekday = next.getDay(); // 0 = domingo
  const diff = (weekday + 6) % 7; // dias desde segunda
  next.setDate(next.getDate() - diff);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Segundas-feiras das próximas semanas, começando na próxima semana. */
export function upcomingWeekOptions(count = 8, reference: Date = new Date()) {
  const nextMonday = addDays(startOfWeek(reference), 7);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(nextMonday, index * 7);
    return { value: toISODate(start), label: formatWeekRange(toISODate(start)) };
  });
}

export function formatWeekRange(mondayISO: string | null | undefined) {
  if (!mondayISO) return '—';
  const start = parseISODate(mondayISO);
  const end = addDays(start, 5); // segunda a sábado
  const fmt = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  return `${fmt(start)} a ${fmt(end)}`;
}

/** Data plausível dentro da semana prevista (quarta), usada na simulação de confirmação. */
export function suggestedDateInWeek(mondayISO: string) {
  return toISODate(addDays(parseISODate(mondayISO), 2));
}

export function ticketReference(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}
