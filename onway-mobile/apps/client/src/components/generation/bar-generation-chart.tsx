import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { brand } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { clampWindowStart, niceScale } from '@/domain/generation-calculations';
import { formatAxisTick, formatCompact, formatEnergy } from '@/domain/generation-formatters';

const BAR_AREA_HEIGHT = 172;
const Y_AXIS_WIDTH = 28;
const VALUE_FONT = 10;
const LABEL_HEIGHT = VALUE_FONT + 4;
const LABEL_GAP = 6;
const DRAG_THRESHOLD = 6;

type BarGenerationChartProps = {
  values: number[];
  axisLabels: string[];
  subLabels?: string[] | null;
  windowStart: number;
  windowSize: number;
  tooltipLabel: (index: number) => string;
  draggable?: boolean;
  emptyWhenZero?: boolean;
  hint?: string | null;
  onWindowChange?: (start: number) => void;
  onBarPress?: (index: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  accessibilityLabel: string;
};

/**
 * Gráfico de barras para Semana (7), Mês (janela de 7 com arraste) e Ano (12).
 * Escala "nice" com margem superior + eixo Y sutil. TODOS os valores aparecem
 * acima das barras; quando o espaço aperta, o número encolhe para caber
 * (`adjustsFontSizeToFit`) em vez de cortar ou sumir. Toque numa barra abre um
 * tooltip com o valor cheio.
 */
export function BarGenerationChart({
  values,
  axisLabels,
  subLabels = null,
  windowStart,
  windowSize,
  tooltipLabel,
  draggable = false,
  emptyWhenZero = false,
  hint = null,
  onWindowChange,
  onBarPress,
  onDragStateChange,
  accessibilityLabel,
}: BarGenerationChartProps) {
  const { colors } = useOnWayTheme();
  const widthRef = useRef(0);
  const [plotWidth, setPlotWidth] = useState(0);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const currentStartRef = useRef(windowStart);
  currentStartRef.current = windowStart;
  const baseStartRef = useRef(windowStart);

  const size = Math.min(windowSize, values.length) || values.length;
  const canDrag = Boolean(draggable && onWindowChange && values.length > size);
  const start = clampWindowStart(windowStart, size, values.length);

  const visibleIndices = useMemo(
    () => Array.from({ length: Math.min(size, values.length) }, (_, offset) => start + offset),
    [start, size, values.length],
  );

  const visibleValues = visibleIndices.map((index) => Math.max(0, values[index] ?? 0));
  const maxVisible = visibleValues.reduce((current, value) => (value > current ? value : current), 0);
  const { max: scaleMax, ticks } = useMemo(() => niceScale(maxVisible), [maxVisible]);

  // Limpa o tooltip quando os dados ou a janela mudam.
  useEffect(() => {
    setTooltipIndex(null);
  }, [values, start]);

  const columnWidth = plotWidth > 0 && visibleIndices.length > 0 ? plotWidth / visibleIndices.length : 0;

  // Responde à LARGURA REAL medida (não ao modelo do aparelho). Sempre usa o
  // valor "quebrado" com decimal ("10,8k") para máxima precisão; a fonte é
  // única para todas as barras e se ajusta para caber, nunca corta.
  // Largura estimada por caractere (negrito) — conservadora para o texto caber
  // de fato; o `adjustsFontSizeToFit` no Text é a garantia final contra "...".
  const fontFor = (chars: number) => (columnWidth - 4) / (chars * 0.66);
  const widestChars = visibleValues.reduce((max, value) => (value > 0 ? Math.max(max, formatCompact(value).length) : max), 1);
  const valueFontCap = columnWidth > 0 ? Math.max(9, Math.min(13, columnWidth * 0.4)) : VALUE_FONT;
  const uniformValueFont = columnWidth > 0 ? Math.max(5, Math.min(valueFontCap, fontFor(widestChars))) : VALUE_FONT;
  const barMaxWidth = columnWidth > 0 ? Math.min(46, Math.max(16, columnWidth * 0.72)) : 38;

  const panResponder = useMemo(() => {
    const claimHorizontal = (_event: unknown, gesture: { dx: number; dy: number }) =>
      canDrag && Math.abs(gesture.dx) > DRAG_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: claimHorizontal,
      onMoveShouldSetPanResponderCapture: claimHorizontal,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        baseStartRef.current = clampWindowStart(currentStartRef.current, size, values.length);
        onDragStateChange?.(true);
      },
      onPanResponderMove: (_event, gesture) => {
        if (!widthRef.current) return;
        const step = Math.round(-gesture.dx / (widthRef.current / size));
        onWindowChange?.(clampWindowStart(baseStartRef.current + step, size, values.length));
      },
      onPanResponderRelease: () => onDragStateChange?.(false),
      onPanResponderTerminate: () => onDragStateChange?.(false),
    });
  }, [canDrag, onWindowChange, onDragStateChange, size, values.length]);

  const handlePlotLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
    setPlotWidth(event.nativeEvent.layout.width);
  };

  const yForValue = (value: number) => BAR_AREA_HEIGHT - (scaleMax > 0 ? value / scaleMax : 0) * BAR_AREA_HEIGHT;

  const bars = visibleIndices.map((index, local) => {
    const value = visibleValues[local];
    const isEmpty = emptyWhenZero && value <= 0;
    const barHeight = value > 0 ? Math.max(3, (value / scaleMax) * BAR_AREA_HEIGHT) : 0;
    return { index, local, value, isEmpty, barHeight };
  });

  const tooltipBar = tooltipIndex !== null ? bars.find((bar) => bar.index === tooltipIndex) ?? null : null;
  const tooltipWidth = 132;
  const tooltipLeft = tooltipBar
    ? Math.min(Math.max((tooltipBar.local + 0.5) * columnWidth - tooltipWidth / 2, 0), Math.max(plotWidth - tooltipWidth, 0))
    : 0;

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          {ticks.map((tick) => (
            <Text
              key={`tick-${tick}`}
              style={[
                styles.yTick,
                { color: colors.textSecondary, top: Math.min(Math.max(yForValue(tick) - 7, 0), BAR_AREA_HEIGHT - LABEL_HEIGHT) },
              ]}
              numberOfLines={1}>
              {formatAxisTick(tick)}
            </Text>
          ))}
        </View>

        <View style={styles.plot} onLayout={handlePlotLayout} {...(canDrag ? panResponder.panHandlers : {})}>
          {ticks.map((tick) => (
            <View
              key={`grid-${tick}`}
              pointerEvents="none"
              style={[styles.gridline, { backgroundColor: colors.border, top: yForValue(tick), opacity: tick === 0 ? 0.5 : 0.28 }]}
            />
          ))}

          <View style={styles.barsRow}>
            {bars.map((bar) => (
              <Pressable
                key={`${axisLabels[bar.index] ?? bar.index}-${bar.index}`}
                style={styles.column}
                disabled={bar.isEmpty}
                accessibilityRole={bar.isEmpty ? 'none' : 'button'}
                accessibilityLabel={`${tooltipLabel(bar.index)}: ${bar.isEmpty ? 'sem dados' : formatEnergy(bar.value)}`}
                onPress={bar.isEmpty ? undefined : () => setTooltipIndex((current) => (current === bar.index ? null : bar.index))}>
                {!bar.isEmpty ? (
                  <Text
                    style={[styles.value, { color: colors.textSecondary, fontSize: uniformValueFont }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}>
                    {formatCompact(bar.value)}
                  </Text>
                ) : null}
                {bar.isEmpty ? (
                  <View style={[styles.emptyBar, { borderColor: colors.border, maxWidth: barMaxWidth }]} />
                ) : (
                  <View style={[styles.bar, { height: bar.barHeight, maxWidth: barMaxWidth }]}>
                    <LinearGradient
                      colors={[brand.greenBright, brand.greenDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {tooltipBar ? (
            <Pressable
              accessibilityRole={onBarPress ? 'button' : 'text'}
              accessibilityLabel={`${tooltipLabel(tooltipBar.index)}, ${formatEnergy(tooltipBar.value)}${onBarPress ? '. Toque para abrir' : ''}`}
              disabled={!onBarPress}
              onPress={onBarPress ? () => { setTooltipIndex(null); onBarPress(tooltipBar.index); } : undefined}
              style={[styles.tooltip, { left: tooltipLeft, width: tooltipWidth, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.tooltipTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {tooltipLabel(tooltipBar.index)}
              </Text>
              <Text style={[styles.tooltipValue, { color: colors.text }]} numberOfLines={1}>
                {formatEnergy(tooltipBar.value)}
              </Text>
              {onBarPress ? (
                <View style={styles.tooltipAction}>
                  <Text style={[styles.tooltipActionText, { color: colors.accent }]}>Abrir</Text>
                  <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.accent} size={11} fallback="›" />
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.axisRow}>
        <View style={styles.axisSpacer} />
        <View style={styles.axisLabels}>
          {bars.map((bar) => (
            <View key={`axis-${bar.index}`} style={styles.axisCell}>
              <Text
                style={[styles.axisLabel, { color: colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {axisLabels[bar.index] ?? ''}
              </Text>
              {subLabels ? (
                <Text style={[styles.subLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {subLabels[bar.index] ?? ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]} accessibilityElementsHidden importantForAccessibility="no">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: { flexDirection: 'row' },
  yAxis: { width: Y_AXIS_WIDTH, height: BAR_AREA_HEIGHT },
  yTick: { position: 'absolute', right: 5, fontSize: 9, fontWeight: '600', textAlign: 'right', opacity: 0.7 },
  plot: { flex: 1, height: BAR_AREA_HEIGHT },
  gridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_AREA_HEIGHT },
  column: { flex: 1, height: BAR_AREA_HEIGHT, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 1 },
  value: { fontSize: VALUE_FONT, fontWeight: '700', width: '100%', textAlign: 'center', marginBottom: LABEL_GAP },
  bar: { width: '64%', maxWidth: 38, minWidth: 9, borderTopLeftRadius: 7, borderTopRightRadius: 7, overflow: 'hidden' },
  emptyBar: { width: '64%', maxWidth: 38, minWidth: 9, height: 10, borderRadius: 5, borderWidth: 1, borderStyle: 'dashed', opacity: 0.5 },
  tooltip: { position: 'absolute', top: 0, borderRadius: 12, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 11, alignItems: 'center', gap: 1 },
  tooltipTitle: { fontSize: 10, fontWeight: '600' },
  tooltipValue: { fontSize: 13, fontWeight: '800' },
  tooltipAction: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 3 },
  tooltipActionText: { fontSize: 10, fontWeight: '700' },
  axisRow: { flexDirection: 'row', marginTop: 8 },
  axisSpacer: { width: Y_AXIS_WIDTH },
  axisLabels: { flex: 1, flexDirection: 'row' },
  axisCell: { flex: 1, alignItems: 'center', paddingHorizontal: 1 },
  axisLabel: { fontSize: 10, fontWeight: '600', width: '100%', textAlign: 'center' },
  subLabel: { fontSize: 9, fontWeight: '600', width: '100%', textAlign: 'center', marginTop: -1, opacity: 0.8 },
  hint: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 12, opacity: 0.75 },
});
