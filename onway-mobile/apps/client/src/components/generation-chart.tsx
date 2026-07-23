import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { brand, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

type GenerationChartProps = {
  values: number[];
  labels?: string[];
  height?: number;
  maxVisibleLabels?: number;
  type?: 'line' | 'bar';
};

function createPath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const range = Math.max(max, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (Math.max(value, 0) / range) * (height - 14) - 7;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function barMetrics(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const gap = values.length > 20 ? 3 : values.length > 12 ? 5 : 8;
  const availableWidth = width - gap * Math.max(values.length - 1, 0);
  const barWidth = Math.max(4, availableWidth / Math.max(values.length, 1));

  return values.map((value, index) => {
    const safeValue = Math.max(value, 0);
    const barHeight = (safeValue / max) * (height - 14);
    const x = index * (barWidth + gap);
    const y = height - barHeight;

    return {
      height: barHeight,
      width: barWidth,
      x,
      y,
    };
  });
}

function formatChartValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }

  return value.toLocaleString('pt-BR', { maximumFractionDigits: value >= 10 ? 0 : 1 });
}

export function GenerationChart({
  values,
  labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'],
  height = 240,
  maxVisibleLabels = 7,
  type = 'line',
}: GenerationChartProps) {
  const { colors } = useOnWayTheme();
  const width = 360;
  const plotHeight = height - 30;
  const line = createPath(values, width, plotHeight);
  const area = `${line} L ${width} ${plotHeight} L 0 ${plotHeight} Z`;
  const labelStep = Math.max(1, Math.ceil(labels.length / maxVisibleLabels));
  const bars = barMetrics(values, width, plotHeight);
  const chartLabel = type === 'bar' ? 'Gráfico de colunas' : 'Gráfico de linha';
  const dataLabelFontSize = values.length > 20 ? 7 : values.length > 12 ? 8 : 9;

  return (
    <View accessibilityRole="image" accessibilityLabel={`${chartLabel} de geração: ${values.join(', ')} quilowatt-hora`}>
      <Svg width="100%" height={plotHeight} viewBox={`0 0 ${width} ${plotHeight}`}>
        <Defs>
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.greenBright} stopOpacity="0.34" />
            <Stop offset="1" stopColor={brand.greenBright} stopOpacity="0.01" />
          </LinearGradient>
          <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.greenBright} stopOpacity="0.96" />
            <Stop offset="1" stopColor={brand.greenDark} stopOpacity="0.58" />
          </LinearGradient>
        </Defs>
        {type === 'bar' ? (
          <>
            {bars.map((bar, index) => (
              <Rect
                key={`${labels[index] ?? index}-${index}`}
                fill="url(#barFill)"
                height={bar.height}
                opacity={values[index] > 0 ? 1 : 0.22}
                rx={Math.min(5, bar.width / 2)}
                width={bar.width}
                x={bar.x}
                y={bar.y}
              />
            ))}
            {bars.map((bar, index) => {
              const value = values[index] ?? 0;
              const x = bar.x + bar.width / 2;
              const y = Math.max(10, bar.y - 5);

              return (
                <SvgText
                  key={`label-${labels[index] ?? index}-${index}`}
                  fill={colors.textSecondary}
                  fontSize={dataLabelFontSize}
                  fontWeight="700"
                  textAnchor="middle"
                  x={x}
                  y={y}>
                  {formatChartValue(value)}
                </SvgText>
              );
            })}
          </>
        ) : (
          <>
            <Path d={area} fill="url(#chartFill)" />
            <Path d={line} fill="none" stroke={brand.greenBright} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>
      <View style={styles.labels}>
        {labels.map((label, index) => {
          const visible = index === 0 || index === labels.length - 1 || index % labelStep === 0;
          return (
            <Text key={`${label}-${index}`} style={[styles.label, { color: colors.textSecondary }]}>
              {visible ? label : ''}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm },
  label: { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
