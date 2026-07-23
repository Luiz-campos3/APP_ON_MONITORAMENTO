import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';

type SummaryColumn = {
  label: string;
  value: string;
  caption?: string | null;
};

type GenerationSummaryProps = {
  average: SummaryColumn;
  peak: SummaryColumn;
  total: SummaryColumn;
};

/** Resumo inferior em três colunas (Média · Pico · Total) com divisores sutis. */
export function GenerationSummary({ average, peak, total }: GenerationSummaryProps) {
  const { colors } = useOnWayTheme();
  const { scaleFont } = useResponsive();
  const columns = [average, peak, total];

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
      {columns.map((column, index) => (
        <View key={column.label} style={styles.cell}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <View style={styles.cellContent}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{column.label}</Text>
            <Text style={[styles.value, { color: colors.text, fontSize: scaleFont(15) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {column.value}
            </Text>
            {column.caption ? (
              <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {column.caption}
              </Text>
            ) : (
              <Text style={styles.captionPlaceholder}> </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.md, flexDirection: 'row', paddingVertical: 14, marginTop: 12 },
  cell: { flex: 1, flexDirection: 'row' },
  divider: { width: 1, marginVertical: 2, opacity: 0.7 },
  cellContent: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  label: { fontSize: 11, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '800' },
  caption: { fontSize: 10, fontWeight: '600' },
  captionPlaceholder: { fontSize: 10 },
});
