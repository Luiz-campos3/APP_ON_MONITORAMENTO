import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, radius } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import type { HistoryPeriod } from '@/domain/client';

export type PeriodOption = { value: HistoryPeriod; label: string };

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

type PeriodTabsProps = {
  value: HistoryPeriod;
  onChange: (period: HistoryPeriod) => void;
};

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  const { colors } = useOnWayTheme();

  return (
    <View style={[styles.tabs, { backgroundColor: colors.surfaceMuted }]}>
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Ver histórico por ${option.label.toLowerCase()}`}
            hitSlop={6}
            onPress={() => onChange(option.value)}
            style={[styles.tab, active && { backgroundColor: colors.accent }]}>
            <Text style={[styles.tabText, { color: active ? brand.white : colors.textSecondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { borderRadius: radius.pill, flexDirection: 'row', padding: 4, marginBottom: 18 },
  tab: { flex: 1, minHeight: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '800' },
});
