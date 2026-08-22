import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { radius } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

export function SettingsHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useOnWayTheme();

  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.surface }]}>
        <SymbolIcon ios="chevron.left" android="arrow_back" color={colors.text} size={20} fallback="‹" />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  button: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
});
