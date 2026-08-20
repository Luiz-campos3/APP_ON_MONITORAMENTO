import type { ApiSession, SessionsResponse } from '@/services/mobile-api';

export type Session = {
  familyId: string;
  device: string;
  isCurrent: boolean;
  startedAtLabel: string;
  lastUsedLabel: string;
  expiresLabel: string;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// "agora" / "há N min" / "há N h" / "há N d" a partir de `now`.
function relativePast(iso: string, now: number) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

// Baseado em duração (independente de fuso), sem a ambiguidade de "hoje/amanhã".
function expiresLabel(iso: string, now: number) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const remaining = timestamp - now;
  if (remaining <= 0) return 'expirada';
  const days = Math.floor(remaining / 86_400_000);
  if (days < 1) return 'expira em menos de 1 dia';
  if (days === 1) return 'expira em 1 dia';
  return `expira em ${days} dias`;
}

export function toSession(api: ApiSession, now: number = Date.now()): Session {
  return {
    familyId: api.familyId,
    device: normalizeText(api.dispositivo) || 'Dispositivo desconhecido',
    isCurrent: Boolean(api.isCurrent),
    startedAtLabel: formatDate(api.iniciadaEm),
    lastUsedLabel: relativePast(api.ultimoUso, now),
    expiresLabel: expiresLabel(api.expiraEm, now),
  };
}

// A atual sempre em primeiro; as demais por familyId para ordem estável.
export function toSessions(response: SessionsResponse, now: number = Date.now()): Session[] {
  const sessions = (response.data ?? []).map((item) => toSession(item, now));
  return sessions.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return a.familyId.localeCompare(b.familyId);
  });
}
