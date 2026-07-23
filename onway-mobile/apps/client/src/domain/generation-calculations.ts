import type { HistoryPeriod } from '@/domain/client';

// --- Utilitários de data (fonte única, reutilizados pelo hook e pela tela) ---

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function addYears(date: Date, amount: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  return next;
}

export function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sameDay(a: Date, b: Date) {
  return formatDateParam(a) === formatDateParam(b);
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// --- Estatísticas e escala do gráfico ---

export type GenerationStats = {
  total: number;
  average: number;
  peakValue: number;
  peakIndex: number;
};

/**
 * Pico e índice são calculados a partir dos valores reais retornados pela API.
 * Total e média já vêm calculados no domínio (`toGenerationHistory`) e são
 * apenas repassados — nada é inventado aqui.
 */
export function computeStats(values: number[], total: number, average: number): GenerationStats {
  let peakValue = 0;
  let peakIndex = -1;

  values.forEach((value, index) => {
    if (Number.isFinite(value) && value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  });

  return {
    total,
    average,
    peakValue,
    peakIndex: peakIndex >= 0 ? peakIndex : 0,
  };
}

/**
 * Escala do eixo Y adaptada ao conjunto visível, com margem superior para que a
 * maior barra não encoste no topo. Zero/dados incompletos caem para 1 (evita
 * divisão por zero) sem alterar os valores exibidos.
 */
export function visibleScaleMax(values: number[]): number {
  const max = values.reduce((current, value) => (Number.isFinite(value) && value > current ? value : current), 0);
  if (max <= 0) return 1;
  return max * 1.18;
}

export type NiceScale = { max: number; ticks: number[] };

function niceNumber(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  } else {
    niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

/**
 * Escala "arredondada" para o eixo Y: garante margem superior (o maior valor
 * nunca encosta no topo) e produz marcações limpas (0, 5k, 10k, 15k…).
 */
export function niceScale(rawMax: number, targetIntervals = 3): NiceScale {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return { max: 1, ticks: [0, 1] };
  const rough = rawMax * 1.1;
  const step = niceNumber(rough / targetIntervals, true);
  const max = Math.ceil(rough / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value));
  return { max, ticks };
}

export function clampWindowStart(start: number, size: number, length: number) {
  const maxStart = Math.max(0, length - size);
  if (!Number.isFinite(start)) return 0;
  return Math.min(Math.max(0, Math.round(start)), maxStart);
}

/**
 * Janela inicial por período:
 * - Dia: centralizada no horário de pico (mostra a faixa ativa do dia).
 * - Mês: termina no dia âncora (ex.: hoje), como na referência (16–22).
 * - Semana/Ano: janela cobre todo o conjunto (sem navegação horizontal).
 */
export function defaultWindowStart(
  period: HistoryPeriod,
  values: number[],
  size: number,
  anchorDayOfMonth: number,
  peakIndex: number,
): number {
  if (period === 'day') {
    return clampWindowStart(peakIndex - Math.floor(size / 2), size, values.length);
  }
  if (period === 'month') {
    return clampWindowStart(anchorDayOfMonth - size, size, values.length);
  }
  return 0;
}

export function windowSizeFor(period: HistoryPeriod, length: number): number {
  if (period === 'day') return Math.min(7, length || 7);
  if (period === 'month') return Math.min(7, length || 7);
  return length; // semana (7) e ano (12) mostram tudo
}
