import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { addDays, addMonths, sameDay, startOfDay } from '@/domain/generation-calculations';
import { monthShort, WEEKDAYS_SHORT } from '@/domain/generation-formatters';

export type DatePickerMode = 'day' | 'range' | 'year';

type DatePickerSheetProps = {
  visible: boolean;
  mode: DatePickerMode;
  initialDate: Date;
  maxDate: Date;
  minDate?: Date | null;
  /** Nº de dias corridos exigidos no modo intervalo (Semana = 7). */
  rangeDays?: number;
  title: string;
  onCancel: () => void;
  onApplyDate: (date: Date) => void;
  onApplyMonth: (date: Date) => void;
  onApplyRange?: (start: Date, end: Date) => void;
};

type DayCell = { date: Date; inMonth: boolean; disabled: boolean; selected: boolean; isToday: boolean };

function buildDayGrid(viewYear: number, viewMonth: number, selected: Date, maxTime: number, minTime: number): DayCell[] {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const firstWeekday = firstOfMonth.getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(viewYear, viewMonth, 1 - firstWeekday + index);
    const time = startOfDay(date).getTime();
    return {
      date,
      inMonth: date.getMonth() === viewMonth,
      disabled: time > maxTime || time < minTime,
      selected: sameDay(date, selected),
      isToday: time === maxTime,
    };
  });
}

function inclusiveDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000) + 1;
}

function longDay(date: Date, withYear: boolean): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${day} de ${month}${withYear ? ` de ${date.getFullYear()}` : ''}`;
}

function formatRangeLabel(start: Date, end: Date): string {
  const crossYear = start.getFullYear() !== end.getFullYear();
  return `${longDay(start, crossYear)} — ${longDay(end, true)}`;
}

export function DatePickerSheet({
  visible,
  mode,
  initialDate,
  maxDate,
  minDate = null,
  rangeDays = 7,
  title,
  onCancel,
  onApplyDate,
  onApplyMonth,
  onApplyRange,
}: DatePickerSheetProps) {
  const { colors } = useOnWayTheme();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [rangeError, setRangeError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setViewYear(initialDate.getFullYear());
    setViewMonth(initialDate.getMonth());
    setSelectedDate(initialDate);
    setSelectedMonth(initialDate.getMonth());
    setRangeError(false);
    if (mode === 'range') {
      // Abre já com a semana atual pré-selecionada (âncora = último dia).
      setRangeStart(addDays(initialDate, -(rangeDays - 1)));
      setRangeEnd(initialDate);
    } else {
      setRangeStart(null);
      setRangeEnd(null);
    }
  }, [visible, initialDate, mode, rangeDays]);

  const maxTime = startOfDay(maxDate).getTime();
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();
  const floor = minDate ? startOfDay(minDate) : null;
  const minTime = floor ? floor.getTime() : -Infinity;
  const minYear = floor ? floor.getFullYear() : -Infinity;
  const minMonth = floor ? floor.getMonth() : 0;

  const isYear = mode === 'year';
  const canGoNextMonth = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  const canGoPrevMonth = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);
  const canGoNextYear = viewYear < maxYear;
  const canGoPrevYear = viewYear > minYear;
  const canPrev = isYear ? canGoPrevYear : canGoPrevMonth;
  const canNext = isYear ? canGoNextYear : canGoNextMonth;

  const dayGrid = useMemo(
    () => (isYear ? [] : buildDayGrid(viewYear, viewMonth, selectedDate, maxTime, minTime)),
    [isYear, viewYear, viewMonth, selectedDate, maxTime, minTime],
  );

  const headerTitle = isYear
    ? String(viewYear)
    : `${capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(viewYear, viewMonth, 1)))} de ${viewYear}`;

  const stepMonth = (direction: -1 | 1) => {
    if (direction === 1 && !canGoNextMonth) return;
    if (direction === -1 && !canGoPrevMonth) return;
    const next = addMonths(new Date(viewYear, viewMonth, 1), direction);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const stepYear = (direction: -1 | 1) => {
    if (direction === 1 && !canGoNextYear) return;
    if (direction === -1 && !canGoPrevYear) return;
    setViewYear((current) => current + direction);
  };

  const handleRangeTap = (date: Date) => {
    // Nada selecionado, ou intervalo já completo → novo início.
    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      setRangeError(false);
      return;
    }
    // Já tem início: define o fim, reorganizando (seleção reversa).
    const startFirst = startOfDay(date).getTime() >= startOfDay(rangeStart).getTime();
    const lo = startFirst ? rangeStart : date;
    const hi = startFirst ? date : rangeStart;
    if (inclusiveDays(lo, hi) === rangeDays) {
      setRangeStart(lo);
      setRangeEnd(hi);
      setRangeError(false);
    } else {
      // Inválido: mensagem discreta e recomeça a partir do dia tocado.
      setRangeStart(date);
      setRangeEnd(null);
      setRangeError(true);
    }
  };

  const rangeComplete = mode === 'range' && rangeStart !== null && rangeEnd !== null;
  const applyDisabled = mode === 'range' ? !rangeComplete : false;

  const apply = () => {
    if (mode === 'range') {
      if (rangeStart && rangeEnd) onApplyRange?.(rangeStart, rangeEnd);
      return;
    }
    if (mode === 'day') onApplyDate(selectedDate);
    else onApplyMonth(new Date(viewYear, selectedMonth, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} accessibilityLabel="Fechar calendário" onPress={onCancel} />
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.grabber} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          <View style={styles.navRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isYear ? 'Ano anterior' : 'Mês anterior'}
              accessibilityState={{ disabled: !canPrev }}
              disabled={!canPrev}
              hitSlop={8}
              onPress={() => (isYear ? stepYear(-1) : stepMonth(-1))}
              style={({ pressed }) => [styles.navButton, { backgroundColor: colors.surfaceMuted, opacity: !canPrev ? 0.34 : pressed ? 0.7 : 1 }]}>
              <SymbolIcon ios="chevron.left" android="chevron_left" color={colors.text} size={17} fallback="‹" />
            </Pressable>
            <Text style={[styles.navTitle, { color: colors.text }]}>{headerTitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isYear ? 'Próximo ano' : 'Próximo mês'}
              accessibilityState={{ disabled: !canNext }}
              disabled={!canNext}
              hitSlop={8}
              onPress={() => (isYear ? stepYear(1) : stepMonth(1))}
              style={({ pressed }) => [styles.navButton, { backgroundColor: colors.surfaceMuted, opacity: !canNext ? 0.34 : pressed ? 0.7 : 1 }]}>
              <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.text} size={17} fallback="›" />
            </Pressable>
          </View>

          {!isYear ? (
            <>
              <View style={styles.weekRow}>
                {WEEKDAYS_SHORT.map((weekday) => (
                  <Text key={weekday} style={[styles.weekday, { color: colors.textSecondary }]}>
                    {weekday}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {dayGrid.map((cell, index) => {
                  const cellTime = startOfDay(cell.date).getTime();
                  const isRangeStart = mode === 'range' && rangeStart !== null && sameDay(cell.date, rangeStart);
                  const isRangeEnd = mode === 'range' && rangeEnd !== null && sameDay(cell.date, rangeEnd);
                  const inRange =
                    mode === 'range' &&
                    rangeStart !== null &&
                    rangeEnd !== null &&
                    cellTime >= startOfDay(rangeStart).getTime() &&
                    cellTime <= startOfDay(rangeEnd).getTime();
                  const isCandidate =
                    mode === 'range' &&
                    rangeStart !== null &&
                    rangeEnd === null &&
                    !cell.disabled &&
                    (sameDay(cell.date, addDays(rangeStart, rangeDays - 1)) || sameDay(cell.date, addDays(rangeStart, -(rangeDays - 1))));
                  const highlighted = (mode === 'day' && cell.selected) || isRangeStart || isRangeEnd;

                  const textColor = highlighted
                    ? brand.white
                    : cell.disabled
                      ? colors.textSecondary
                      : cell.inMonth
                        ? colors.text
                        : colors.textSecondary;

                  const roleSuffix = isRangeStart
                    ? ', início do período'
                    : isRangeEnd
                      ? ', fim do período'
                      : inRange
                        ? ', dentro do período'
                        : isCandidate
                          ? ', fim possível do período'
                          : '';

                  return (
                    <Pressable
                      key={`${cell.date.toISOString()}-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(cell.date)}${roleSuffix}`}
                      accessibilityState={{ selected: highlighted, disabled: cell.disabled }}
                      disabled={cell.disabled}
                      onPress={() => {
                        if (mode === 'range') handleRangeTap(cell.date);
                        else setSelectedDate(cell.date);
                        if (!cell.inMonth) {
                          setViewYear(cell.date.getFullYear());
                          setViewMonth(cell.date.getMonth());
                        }
                      }}
                      style={styles.dayCell}>
                      {inRange ? (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.band,
                            { backgroundColor: colors.accentSoft },
                            isRangeStart && styles.bandRight,
                            isRangeEnd && styles.bandLeft,
                          ]}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.dayInner,
                          highlighted && { backgroundColor: colors.accent },
                          !highlighted && isCandidate && { borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed' },
                          !highlighted && !isCandidate && cell.isToday && { borderWidth: 1, borderColor: colors.accent },
                          { opacity: cell.disabled ? 0.3 : cell.inMonth || highlighted || inRange ? 1 : 0.5 },
                        ]}>
                        <Text style={[styles.dayText, { color: textColor }]}>{cell.date.getDate()}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'range' ? (
                <View
                  style={styles.rangeInfo}
                  accessibilityLiveRegion="polite"
                  accessibilityLabel={
                    rangeComplete && rangeStart && rangeEnd
                      ? `Período selecionado: ${longDay(rangeStart, rangeStart.getFullYear() !== rangeEnd.getFullYear())} até ${longDay(rangeEnd, true)}.`
                      : undefined
                  }>
                  {rangeComplete && rangeStart && rangeEnd ? (
                    <>
                      <Text style={[styles.rangeInfoLabel, { color: colors.textSecondary }]}>Período selecionado</Text>
                      <Text style={[styles.rangeInfoValue, { color: colors.text }]}>{formatRangeLabel(rangeStart, rangeEnd)}</Text>
                      <Text style={[styles.rangeInfoDays, { color: colors.textSecondary }]}>{rangeDays} dias corridos</Text>
                    </>
                  ) : rangeError ? (
                    <Text style={[styles.rangeHint, { color: brand.warning }]}>O período deve conter exatamente {rangeDays} dias.</Text>
                  ) : (
                    <Text style={[styles.rangeHint, { color: colors.textSecondary }]}>Selecione o último dia do período ({rangeDays} dias corridos).</Text>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.monthGrid}>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const disabled =
                  viewYear > maxYear ||
                  (viewYear === maxYear && monthIndex > maxMonth) ||
                  viewYear < minYear ||
                  (viewYear === minYear && monthIndex < minMonth);
                const selected = monthIndex === selectedMonth;
                return (
                  <Pressable
                    key={monthIndex}
                    accessibilityRole="button"
                    accessibilityLabel={`${monthShort(monthIndex)} de ${viewYear}`}
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => setSelectedMonth(monthIndex)}
                    style={[styles.monthCell, { backgroundColor: selected ? colors.accent : colors.surfaceMuted, opacity: disabled ? 0.3 : 1 }]}>
                    <Text style={[styles.monthText, { color: selected ? brand.white : colors.text }]}>{monthShort(monthIndex)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onCancel}
              style={({ pressed }) => [styles.footerButton, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[styles.footerText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aplicar"
              accessibilityState={{ disabled: applyDisabled }}
              disabled={applyDisabled}
              onPress={apply}
              style={({ pressed }) => [styles.footerButton, { backgroundColor: colors.accent, opacity: applyDisabled ? 0.4 : pressed ? 0.85 : 1 }]}>
              <Text style={[styles.footerText, { color: brand.white }]}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.4)', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 15, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  band: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -19, height: 38 },
  bandRight: { left: '50%', right: 0 },
  bandLeft: { left: 0, right: '50%' },
  dayInner: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '600' },
  rangeInfo: { alignItems: 'center', gap: 2, marginTop: spacing.sm, minHeight: 46, justifyContent: 'center' },
  rangeInfoLabel: { fontSize: 11, fontWeight: '600' },
  rangeInfoValue: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  rangeInfoDays: { fontSize: 11, fontWeight: '600' },
  rangeHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  monthCell: { width: `${(100 - 8) / 4}%`, minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  footerButton: { flex: 1, minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footerText: { fontSize: 15, fontWeight: '800' },
});
