import type { AlertOrigin, ApiAlert, ApiAlertStatus, AlertsResponse } from '@/services/mobile-api';

export type AlertTone = 'danger' | 'warning';

export type AlertIcon = { ios: string; android: string };

export type Alert = {
  id: string;
  plantId: string;
  plantName: string;
  city: string;
  tipo: string;
  /** Título pronto do servidor — nunca hardcodar copy no app. */
  title: string;
  message: string;
  tone: AlertTone;
  status: ApiAlertStatus;
  origin: AlertOrigin;
  read: boolean;
  openedAt: string | null;
  resolvedAt: string | null;
  /** Rótulo de tempo relativo do `abertoEm` (no derivado = última geração). */
  timeLabel: string;
  icon: AlertIcon;
};

export type AlertFeed = {
  alerts: Alert[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};

const FALLBACK_ICON: AlertIcon = { ios: 'bell.badge.fill', android: 'notifications_active' };

// tipo → ícone. severidade e título já vêm prontos do servidor; o único uso de
// `tipo` no app é o ícone. Valores desconhecidos caem no fallback (forward-compat).
const ICON_BY_KIND: Record<string, AlertIcon> = {
  sem_comunicacao: { ios: 'wifi.exclamationmark', android: 'wifi_off' },
  sem_conexao_envoy: { ios: 'wifi.exclamationmark', android: 'wifi_off' },
  baixa_geracao: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down' },
  micro_baixa_producao: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down' },
  micro_falha_producao: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  problema_medidor: { ios: 'gauge.with.dots.needle.bottom.0percent', android: 'error' },
  atencao_operacional: { ios: 'wrench.and.screwdriver.fill', android: 'build' },
};

function alertIcon(tipo: string): AlertIcon {
  return ICON_BY_KIND[tipo] ?? FALLBACK_ICON;
}

function alertTone(severidade: ApiAlert['severidade']): AlertTone {
  return severidade === 'critical' ? 'danger' : 'warning';
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

export function alertTimeLabel(iso: string | null, now: number): string {
  if (!iso) return '';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;

  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function toAlert(api: ApiAlert, now: number): Alert {
  return {
    id: api.id,
    plantId: api.usinaId,
    plantName: normalizeText(api.usinaNome) || 'Usina',
    city: normalizeText(api.cidade),
    tipo: api.tipo,
    title: normalizeText(api.titulo) || 'Alerta',
    message: normalizeText(api.mensagem),
    tone: alertTone(api.severidade),
    status: api.status,
    origin: api.origem,
    read: api.lido,
    openedAt: api.abertoEm,
    resolvedAt: api.resolvidoEm,
    timeLabel: alertTimeLabel(api.abertoEm, now),
    icon: alertIcon(api.tipo),
  };
}

/**
 * Preserva a ordem do servidor (não lido → crítico → mais recente) — não reordena.
 */
export function toAlertFeed(response: AlertsResponse, now: number): AlertFeed {
  return {
    alerts: response.alertas.map((api) => toAlert(api, now)),
    total: response.total,
    unread: response.naoLidos,
    page: response.paginacao?.page ?? 1,
    limit: response.paginacao?.limit ?? response.alertas.length,
  };
}
