import { useCallback, useMemo, useState } from 'react';

import type { HistoryPeriod } from '@/domain/client';
import { addDays, addMonths, addYears, formatDateParam, startOfDay } from '@/domain/generation-calculations';

export type GenerationRange = {
  period: HistoryPeriod;
  start: string;
  end: string;
  startDate: Date;
  endDate: Date;
};

function getHistoryRange(period: HistoryPeriod, anchorDate: Date) {
  const anchor = startOfDay(anchorDate);
  if (period === 'day') return { startDate: anchor, endDate: anchor };
  if (period === 'week') return { startDate: addDays(anchor, -6), endDate: anchor };
  if (period === 'month') {
    return {
      startDate: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      endDate: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
    };
  }
  return {
    startDate: new Date(anchor.getFullYear(), 0, 1),
    endDate: new Date(anchor.getFullYear(), 11, 31),
  };
}

export function shiftAnchor(period: HistoryPeriod, anchorDate: Date, direction: -1 | 1) {
  if (period === 'day') return addDays(anchorDate, direction);
  if (period === 'week') return addDays(anchorDate, direction * 7);
  if (period === 'month') return addMonths(anchorDate, direction);
  return addYears(anchorDate, direction);
}

export type UseGenerationPeriod = {
  period: HistoryPeriod;
  anchor: Date;
  range: GenerationRange;
  canGoForward: boolean;
  canGoBackward: boolean;
  goPrevious: () => void;
  goNext: () => void;
  setPeriod: (period: HistoryPeriod) => void;
  focusDate: (date: Date) => void;
  drillTo: (period: HistoryPeriod, date: Date) => void;
};

/**
 * Estado temporal do histórico: período selecionado, âncora, range enviado à
 * API e navegação. Não conhece os dados carregados — apenas datas — mantendo a
 * lógica de período separada da apresentação.
 */
export function useGenerationPeriod(today: Date, minDate?: Date | null): UseGenerationPeriod {
  const [period, setPeriodState] = useState<HistoryPeriod>('week');
  const [anchor, setAnchor] = useState<Date>(() => today);
  const minTime = minDate ? startOfDay(minDate).getTime() : null;

  const range = useMemo<GenerationRange>(() => {
    const { startDate, endDate } = getHistoryRange(period, anchor);
    const safeEndDate = endDate > today ? today : endDate;
    return {
      period,
      start: formatDateParam(startDate),
      end: formatDateParam(safeEndDate),
      startDate,
      endDate: safeEndDate,
    };
  }, [period, anchor, today]);

  const canGoForward = useMemo(() => shiftAnchor(period, anchor, 1) <= today, [period, anchor, today]);

  // Bloqueia navegar para períodos anteriores ao início da produção (minDate):
  // permitido enquanto o período anterior ainda alcançar minDate ou depois.
  const canGoBackward = useMemo(() => {
    if (minTime === null) return true;
    const previousEnd = getHistoryRange(period, shiftAnchor(period, anchor, -1)).endDate;
    return previousEnd.getTime() >= minTime;
  }, [period, anchor, minTime]);

  const goPrevious = useCallback(() => {
    if (minTime !== null) {
      const previousEnd = getHistoryRange(period, shiftAnchor(period, anchor, -1)).endDate;
      if (previousEnd.getTime() < minTime) return;
    }
    setAnchor((current) => shiftAnchor(period, current, -1));
  }, [period, anchor, minTime]);

  const goNext = useCallback(() => {
    setAnchor((current) => {
      const next = shiftAnchor(period, current, 1);
      return next > today ? current : next;
    });
  }, [period, today]);

  const setPeriod = useCallback((next: HistoryPeriod) => {
    setPeriodState(next);
    setAnchor(today);
  }, [today]);

  const focusDate = useCallback((date: Date) => {
    setAnchor(startOfDay(date));
  }, []);

  const drillTo = useCallback((next: HistoryPeriod, date: Date) => {
    const target = startOfDay(date) > today ? today : startOfDay(date);
    setPeriodState(next);
    setAnchor(target);
  }, [today]);

  return { period, anchor, range, canGoForward, canGoBackward, goPrevious, goNext, setPeriod, focusDate, drillTo };
}
