import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { SymbolIcon } from '@/components/symbol-icon';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';

export function AppHeader() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { user } = useAuth();
  const initials = (user?.nome || 'Cliente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.header}>
      <BrandLogo size={39} layout="horizontal" />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir notificações"
          onPress={() => router.push('/(tabs)/alerts')}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <SymbolIcon ios="bell.fill" android="notifications" color={colors.text} size={20} fallback="●" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800' },
});
