import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { brand } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { clampWindowStart } from '@/domain/generation-calculations';
import { formatEnergy } from '@/domain/generation-formatters';

const PLOT_HEIGHT = 178;
const TOP_PADDING = 22;
const BOTTOM_PADDING = 10;

type DayGenerationChartProps = {
  values: number[];
  axisLabels: string[];
  pointLabel: (index: number) => string;
  scaleMax: number;
  windowStart: number;
  windowSize: number;
  onWindowChange: (start: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  hint?: string | null;
  accessibilityLabel: string;
};

/**
 * Gráfico de linha/área com geração por hora. Mostra uma janela reduzida de
 * horas; arraste horizontal mostra o tooltip e navega a janela. Toque simples
 * também abre o tooltip (não depende de hover).
 */
export function DayGenerationChart({
  values,
  axisLabels,
  pointLabel,
  scaleMax,
  windowStart,
  windowSize,
  onWindowChange,
  onDragStateChange,
  hint = null,
  accessibilityLabel,
}: DayGenerationChartProps) {
  const { colors } = useOnWayTheme();
  const [width, setWidth] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const widthRef = useRef(0);

  const size = Math.min(windowSize, values.length) || 1;
  const start = clampWindowStart(windowStart, size, values.length);
  // `currentStartRef` espelha o valor vivo; `baseStartRef` congela no início do
  // gesto para o arraste ser 1:1 com o dedo (sem contagem dupla).
  const currentStartRef = useRef(start);
  currentStartRef.current = start;
  const baseStartRef = useRef(start);
  const horizontalActiveRef = useRef(false);
  const plotWidth = Math.max(width, 1);
  const stepWidth = plotWidth / Math.max(size - 1, 1);
  const usableHeight = PLOT_HEIGHT - TOP_PADDING - BOTTOM_PADDING;

  // Reinicia o tooltip quando os dados (dia/usina) mudam.
  useEffect(() => {
    setFocusedIndex(null);
  }, [values]);

  const points = useMemo(() => {
    return Array.from({ length: size }, (_, offset) => {
      const absolute = start + offset;
      const value = Math.max(0, values[absolute] ?? 0);
      const x = offset * stepWidth;
      const y = TOP_PADDING + (usableHeight - (scaleMax > 0 ? value / scaleMax : 0) * usableHeight);
      return { x, y, value, absolute };
    });
  }, [size, start, stepWidth, usableHeight, scaleMax, values]);

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${PLOT_HEIGHT} L ${points[0].x.toFixed(1)} ${PLOT_HEIGHT} Z`
    : '';

  const scrubTo = (locationX: number, base: number) => {
    const visible = Math.min(Math.max(Math.round(locationX / stepWidth), 0), size - 1);
    setFocusedIndex(clampWindowStart(base + visible, 1, values.length));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
        // Enquanto o arraste horizontal está ativo, não devolve o gesto para a
        // rolagem vertical — evita a tela "subir e descer" durante a navegação.
        onPanResponderTerminationRequest: (_event, gesture) =>
          !horizontalActiveRef.current && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          baseStartRef.current = clampWindowStart(currentStartRef.current, size, values.length);
          horizontalActiveRef.current = false;
          scrubTo(event.nativeEvent.locationX, baseStartRef.current);
        },
        onPanResponderMove: (event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          if (!horizontalActiveRef.current && Math.abs(gesture.dx) > 8) {
            horizontalActiveRef.current = true;
            onDragStateChange?.(true);
          }
          const columnStep = widthRef.current / Math.max(size - 1, 1);
          const shift = columnStep > 0 ? Math.round(-gesture.dx / columnStep) : 0;
          const nextStart = clampWindowStart(baseStartRef.current + shift, size, values.length);
          onWindowChange(nextStart);
          scrubTo(event.nativeEvent.locationX, nextStart);
        },
        onPanResponderRelease: () => {
          horizontalActiveRef.current = false;
          onDragStateChange?.(false);
        },
        onPanResponderTerminate: () => {
          horizontalActiveRef.current = false;
          onDragStateChange?.(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, values.length, stepWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    widthRef.current = nextWidth;
    setWidth(nextWidth);
  };

  const focused = focusedIndex !== null ? points.find((point) => point.absolute === focusedIndex) ?? null : null;
  const tooltipWidth = 108;
  const tooltipLeft = focused ? Math.min(Math.max(focused.x - tooltipWidth / 2, 0), plotWidth - tooltipWidth) : 0;

  return (
    <View accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={styles.plot} onLayout={handleLayout} {...panResponder.panHandlers}>
        {width > 0 ? (
          <Svg width={plotWidth} height={PLOT_HEIGHT}>
            <Defs>
              <LinearGradient id="dayFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={brand.greenBright} stopOpacity="0.32" />
                <Stop offset="1" stopColor={brand.greenBright} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>
            {areaPath ? <Path d={areaPath} fill="url(#dayFill)" /> : null}
            {linePath ? (
              <Path d={linePath} fill="none" stroke={brand.greenBright} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {focused ? (
              <>
                <Line x1={focused.x} y1={TOP_PADDING - 8} x2={focused.x} y2={PLOT_HEIGHT} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
                <Circle cx={focused.x} cy={focused.y} r={5} fill={brand.greenBright} stroke={colors.surface} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : (
          <View style={{ height: PLOT_HEIGHT }} />
        )}

        {focused ? (
          <View style={[styles.tooltip, { left: tooltipLeft, width: tooltipWidth, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.tooltipTime, { color: colors.textSecondary }]}>{pointLabel(focused.absolute)}</Text>
            <Text style={[styles.tooltipValue, { color: colors.text }]}>{formatEnergy(focused.value)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.axis}>
        {points.map((point) => (
          <Text key={`hour-${point.absolute}`} style={[styles.axisLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {axisLabels[point.absolute] ?? ''}
          </Text>
        ))}
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
  plot: { height: PLOT_HEIGHT, width: '100%', justifyContent: 'flex-start' },
  tooltip: { position: 'absolute', top: 0, borderRadius: 12, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center' },
  tooltipTime: { fontSize: 10, fontWeight: '600' },
  tooltipValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisLabel: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 12, opacity: 0.75 },
});
