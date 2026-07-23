import type { HistoryPeriod } from '@/domain/client';
import { addDays, daysInMonth, sameDay } from '@/domain/generation-calculations';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Ex.: 408 → "408 kWh"; 7967.9 → "7.967,9 kWh". */
export function formatEnergy(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh`;
}

/** Rótulo compacto acima das barras. Ex.: 440 → "440"; 10808 → "10,8k". */
export function formatCompact(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1000) {
    return `${(safe / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  if (safe > 0 && safe < 10) {
    return safe.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }
  return Math.round(safe).toLocaleString('pt-BR');
}

/** Versão mais curta, sem casa decimal, para espaços estreitos. Ex.: 10808 → "11k". */
export function formatCompactShort(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1000) return `${Math.round(safe / 1000)}k`;
  return Math.round(safe).toLocaleString('pt-BR');
}

/** Marcação do eixo Y: 0 → "0"; 5000 → "5k"; 12500 → "12,5k". */
export function formatAxisTick(value: number): string {
  if (value <= 0) return '0';
  if (value >= 1000) {
    return value % 1000 === 0
      ? `${value / 1000}k`
      : `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return Math.round(value).toLocaleString('pt-BR');
}

export function monthShort(monthIndex: number): string {
  return MONTHS_SHORT[((monthIndex % 12) + 12) % 12];
}

export function formatDayMonth(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** Faixa horária. Ex.: índice 12 → "12h - 13h". */
export function formatHourSpan(hour: number): string {
  return `${pad(hour)}h - ${pad((hour + 1) % 24)}h`;
}

export function averageLabel(period: HistoryPeriod): string {
  if (period === 'day') return 'Média por hora';
  if (period === 'year') return 'Média mensal';
  return 'Média diária';
}

export function periodSubtitle(period: HistoryPeriod, startDate: Date, endDate: Date, today: Date): string {
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

  if (period === 'day') {
    if (sameDay(startDate, today)) return 'Hoje';
    if (sameDay(startDate, addDays(today, -1))) return 'Ontem';
    return date.format(startDate);
  }
  if (period === 'month') return capitalize(month.format(startDate));
  if (period === 'year') return String(startDate.getFullYear());
  return `${date.format(startDate)} – ${date.format(endDate)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Rótulos calculados a partir das datas do período — não dependem dos arrays de
 * label da API (que podem vir vazios) e nunca inventam valores de geração.
 *
 * - `axisLabels`: rótulo principal do eixo X por índice.
 * - `subLabels`: linha secundária (mês, no modo Mês).
 * - `pointLabel`: descrição do ponto/barra (tooltip, pico e acessibilidade).
 */
export type PeriodLabels = {
  axisLabels: string[];
  subLabels: string[] | null;
  /** Rótulo curto (eixo/pico/acessibilidade). */
  pointLabel: (index: number) => string;
  /** Rótulo por extenso para o tooltip. Ex.: "Março", "17 de julho". */
  tooltipLabel: (index: number) => string;
};

function monthLong(date: Date): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date));
}

function dayLong(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date);
}

export function buildPeriodLabels(period: HistoryPeriod, startDate: Date, length: number): PeriodLabels {
  if (period === 'day') {
    const axisLabels = Array.from({ length }, (_, index) => `${pad(index)}h`);
    return { axisLabels, subLabels: null, pointLabel: (index) => formatHourSpan(index), tooltipLabel: (index) => formatHourSpan(index) };
  }

  if (period === 'year') {
    const year = startDate.getFullYear();
    const axisLabels = Array.from({ length }, (_, index) => monthShort(index));
    return {
      axisLabels,
      subLabels: null,
      pointLabel: (index) => monthShort(index),
      tooltipLabel: (index) => monthLong(new Date(year, index, 1)),
    };
  }

  if (period === 'month') {
    const year = startDate.getFullYear();
    const monthIndex = startDate.getMonth();
    const total = Math.min(length, daysInMonth(year, monthIndex));
    const axisLabels = Array.from({ length }, (_, index) => String(Math.min(index + 1, total)));
    const subLabels = Array.from({ length }, () => monthShort(monthIndex));
    return {
      axisLabels,
      subLabels,
      pointLabel: (index) => formatDayMonth(new Date(year, monthIndex, index + 1)),
      tooltipLabel: (index) => dayLong(new Date(year, monthIndex, index + 1)),
    };
  }

  // semana
  const axisLabels = Array.from({ length }, (_, index) => formatDayMonth(addDays(startDate, index)));
  return {
    axisLabels,
    subLabels: null,
    pointLabel: (index) => formatDayMonth(addDays(startDate, index)),
    tooltipLabel: (index) => dayLong(addDays(startDate, index)),
  };
}
