import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { radius } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

type PeriodNavigationProps = {
  canGoForward: boolean;
  canGoBackward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenCalendar: () => void;
  calendarLabel?: string;
};

/** Setas de período com o botão de calendário entre elas (canto superior direito). */
export function PeriodNavigation({
  canGoForward,
  canGoBackward,
  onPrevious,
  onNext,
  onOpenCalendar,
  calendarLabel = 'Abrir calendário',
}: PeriodNavigationProps) {
  const { colors } = useOnWayTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Período anterior"
        accessibilityState={{ disabled: !canGoBackward }}
        aria-disabled={!canGoBackward}
        disabled={!canGoBackward}
        hitSlop={6}
        onPress={onPrevious}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.surfaceMuted, opacity: !canGoBackward ? 0.34 : pressed ? 0.7 : 1 }]}>
        <SymbolIcon ios="chevron.left" android="chevron_left" color={colors.text} size={17} fallback="‹" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={calendarLabel}
        hitSlop={6}
        onPress={onOpenCalendar}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
        <SymbolIcon ios="calendar" android="calendar_month" color={colors.text} size={17} fallback="▦" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo período"
        accessibilityState={{ disabled: !canGoForward }}
        aria-disabled={!canGoForward}
        disabled={!canGoForward}
        hitSlop={6}
        onPress={onNext}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.surfaceMuted, opacity: !canGoForward ? 0.34 : pressed ? 0.7 : 1 },
        ]}>
        <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.text} size={17} fallback="›" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  button: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
