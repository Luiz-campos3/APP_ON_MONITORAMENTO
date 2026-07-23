import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Card } from '@/components/ui';
import { brand, radius } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { addDays, computeStats, defaultWindowStart, visibleScaleMax, windowSizeFor } from '@/domain/generation-calculations';
import { averageLabel, buildPeriodLabels, formatEnergy, monthShort, periodSubtitle } from '@/domain/generation-formatters';
import { usePlantHistory } from '@/hooks/use-plant-history';
import { useGenerationPeriod } from '@/hooks/use-generation-period';
import { useResponsive } from '@/hooks/use-responsive';

import { BarGenerationChart } from './bar-generation-chart';
import { DatePickerSheet } from './date-picker-sheet';
import { DayGenerationChart } from './day-generation-chart';
import { GenerationSummary } from './generation-summary';
import { PeriodNavigation } from './period-navigation';
import { PeriodTabs } from './period-tabs';

const DRAG_HINT = '←  Arraste para navegar  →';
const CHART_MIN_HEIGHT = 226;
// A visão Semana cobre, por definição, 7 dias corridos (âncora-6 .. âncora).
const WEEK_DAYS = 7;

type GenerationHistoryCardProps = {
  plantId?: string;
  today: Date;
  /** Início da produção (data de ativação): bloqueia navegar antes disso. */
  minDate?: Date | null;
  /** Avisa quando um gráfico está em arraste horizontal (para congelar a rolagem). */
  onDragStateChange?: (dragging: boolean) => void;
};

export function GenerationHistoryCard({ plantId, today, minDate = null, onDragStateChange }: GenerationHistoryCardProps) {
  const { colors } = useOnWayTheme();
  const { scaleFont } = useResponsive();
  const nav = useGenerationPeriod(today, minDate);
  const history = usePlantHistory(plantId, nav.range);
  const [windowStart, setWindowStart] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const values = useMemo(() => history.data?.values ?? [], [history.data]);
  // No modo Ano garantimos sempre 12 barras (meses); meses ausentes/futuros
  // ficam em 0 e aparecem tracejados — sem inventar valores.
  const chartValues = useMemo(
    () => (nav.period === 'year' ? Array.from({ length: 12 }, (_, index) => values[index] ?? 0) : values),
    [nav.period, values],
  );
  const windowSize = windowSizeFor(nav.period, chartValues.length);
  const stats = useMemo(
    () => computeStats(chartValues, history.data?.total ?? 0, history.data?.average ?? 0),
    [chartValues, history.data],
  );

  // Reposiciona a janela ao trocar de período/âncora ou quando novos dados chegam.
  useEffect(() => {
    setWindowStart(defaultWindowStart(nav.period, chartValues, windowSize, nav.anchor.getDate(), stats.peakIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.period, nav.range.start, chartValues.length]);

  const labels = useMemo(
    () => buildPeriodLabels(nav.period, nav.range.startDate, chartValues.length),
    [nav.period, nav.range.startDate, chartValues.length],
  );

  const visibleSlice = chartValues.slice(windowStart, windowStart + windowSize);
  const scaleMax = visibleScaleMax(visibleSlice);
  const subtitle = periodSubtitle(nav.period, nav.range.startDate, nav.range.endDate, today);
  // Início real do histórico — SOMENTE quando a data oficial existe (ativação do
  // contrato). Nunca é uma data inventada. Ex.: "Ago/2024".
  const historyStart = minDate ? `${monthShort(minDate.getMonth())}/${minDate.getFullYear()}` : null;
  const peakCaption = stats.peakValue > 0 ? labels.pointLabel(stats.peakIndex) : null;
  const dayHasData = chartValues.some((value) => value > 0);
  const showChart = chartValues.length > 0 && (nav.period !== 'day' || dayHasData);

  const chartAccessibilityLabel = `Geração por ${periodNoun(nav.period)}, ${subtitle}. Total ${formatEnergy(stats.total)}, média ${formatEnergy(stats.average)}, pico ${formatEnergy(stats.peakValue)}${peakCaption ? ` em ${peakCaption}` : ''}.`;

  const handleBarPress = (index: number) => {
    if (nav.period === 'week') nav.drillTo('day', addDays(nav.range.startDate, index));
    else if (nav.period === 'month') nav.drillTo('day', new Date(nav.range.startDate.getFullYear(), nav.range.startDate.getMonth(), index + 1));
    else if (nav.period === 'year') nav.drillTo('month', new Date(nav.range.startDate.getFullYear(), index, 1));
  };

  const applyCalendarDate = (date: Date) => {
    setCalendarVisible(false);
    nav.focusDate(date);
  };

  const applyCalendarMonth = (date: Date) => {
    setCalendarVisible(false);
    nav.drillTo('month', date);
  };

  // Semana = 7 dias corridos terminando na âncora, então o fim do intervalo
  // define a âncora (início = fim-6). Intervalo já validado no calendário.
  const applyCalendarRange = (_start: Date, end: Date) => {
    setCalendarVisible(false);
    nav.focusDate(end);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text, fontSize: scaleFont(16) }]}>Histórico de geração</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaleFont(12) }]}>{subtitle}</Text>
        </View>
        <PeriodNavigation
          canGoForward={nav.canGoForward}
          canGoBackward={nav.canGoBackward}
          onPrevious={nav.goPrevious}
          onNext={nav.goNext}
          onOpenCalendar={() => setCalendarVisible(true)}
        />
      </View>

      {historyStart ? (
        <View style={[styles.sinceBadge, { backgroundColor: colors.surfaceMuted }]}>
          <SymbolIcon ios="info.circle" android="info" color={colors.textSecondary} size={11} fallback="ⓘ" />
          <Text style={[styles.sinceBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
            Histórico desde {historyStart}
          </Text>
        </View>
      ) : null}

      <PeriodTabs value={nav.period} onChange={nav.setPeriod} />

      <View style={styles.chartArea}>
        {history.loading && !history.data ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : history.error ? (
          <View style={styles.stateBox}>
            <Text style={[styles.stateText, { color: brand.danger }]}>{history.error}</Text>
          </View>
        ) : !showChart ? (
          <View style={styles.stateBox}>
            <SymbolIcon ios="calendar.badge.exclamationmark" android="event_busy" color={colors.textSecondary} size={26} fallback="—" />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              {nav.period === 'day' ? 'Sem geração neste dia' : 'Sem histórico neste período'}
            </Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {historyStart
                ? `Nenhum registro de geração para este período — não é um erro do app. O histórico começa em ${historyStart}.`
                : 'Nenhum registro de geração para este período. Não é um erro do app.'}
            </Text>
          </View>
        ) : nav.period === 'day' ? (
          <DayGenerationChart
            values={chartValues}
            axisLabels={labels.axisLabels}
            pointLabel={labels.pointLabel}
            scaleMax={scaleMax}
            windowStart={windowStart}
            windowSize={windowSize}
            onWindowChange={setWindowStart}
            onDragStateChange={onDragStateChange}
            hint={chartValues.length > windowSize ? DRAG_HINT : null}
            accessibilityLabel={chartAccessibilityLabel}
          />
        ) : (
          <BarGenerationChart
            values={chartValues}
            axisLabels={labels.axisLabels}
            subLabels={labels.subLabels}
            windowStart={windowStart}
            windowSize={windowSize}
            tooltipLabel={labels.tooltipLabel}
            draggable={nav.period === 'month'}
            emptyWhenZero={nav.period === 'year'}
            hint={nav.period === 'month' && chartValues.length > windowSize ? DRAG_HINT : null}
            onWindowChange={setWindowStart}
            onDragStateChange={onDragStateChange}
            onBarPress={handleBarPress}
            accessibilityLabel={chartAccessibilityLabel}
          />
        )}
      </View>

      <GenerationSummary
        average={{ label: averageLabel(nav.period), value: formatEnergy(stats.average) }}
        peak={{ label: 'Pico', value: formatEnergy(stats.peakValue), caption: peakCaption }}
        total={{ label: 'Total', value: formatEnergy(stats.total) }}
      />

      <DatePickerSheet
        visible={calendarVisible}
        mode={nav.period === 'year' ? 'year' : nav.period === 'week' ? 'range' : 'day'}
        initialDate={nav.anchor}
        maxDate={today}
        minDate={minDate}
        rangeDays={WEEK_DAYS}
        title={calendarTitle(nav.period)}
        onCancel={() => setCalendarVisible(false)}
        onApplyDate={applyCalendarDate}
        onApplyMonth={applyCalendarMonth}
        onApplyRange={applyCalendarRange}
      />
    </Card>
  );
}

function periodNoun(period: string) {
  if (period === 'day') return 'dia';
  if (period === 'week') return 'semana';
  if (period === 'month') return 'mês';
  return 'ano';
}

function calendarTitle(period: string) {
  if (period === 'day') return 'Selecionar dia';
  if (period === 'week') return 'Selecionar semana';
  if (period === 'month') return 'Selecionar dia do mês';
  return 'Selecionar mês';
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '600' },
  sinceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 16,
  },
  sinceBadgeText: { fontSize: 11, fontWeight: '600' },
  chartArea: { minHeight: CHART_MIN_HEIGHT, justifyContent: 'center' },
  stateBox: { minHeight: CHART_MIN_HEIGHT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 4 },
  stateTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  stateText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
