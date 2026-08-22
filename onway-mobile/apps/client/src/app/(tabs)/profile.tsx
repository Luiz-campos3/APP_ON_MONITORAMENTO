import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { type ThemePreference, useOnWayTheme } from '@/contexts/theme-context';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const appVersion = Constants.expoConfig?.version;

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useOnWayTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const name = user?.nome || 'Cliente';
  const email = user?.email || '';
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch {
      Alert.alert('Sessão encerrada', 'O acesso foi removido deste aparelho, mas a API não confirmou o logout.');
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Screen>
      <AppHeader />
      <Text style={[styles.title, { color: colors.text }]}>Meu perfil</Text>
      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
        </View>
      </Card>

      {user?.mustChangePassword ? (
        <Pressable onPress={() => router.push('/settings/change-password')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Card style={styles.passwordWarning}>
            <SymbolIcon ios="key.fill" android="key" color={brand.warning} size={21} fallback="!" />
            <View style={styles.warningBody}>
              <Text style={[styles.warningTitle, { color: colors.text }]}>Troca de senha necessária</Text>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>Toque para redefinir sua senha agora.</Text>
            </View>
            <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={17} fallback="›" />
          </Card>
        </Pressable>
      ) : null}

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APARÊNCIA</Text>
      <Card>
        <Text style={[styles.settingTitle, { color: colors.text }]}>Tema do aplicativo</Text>
        <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>Escolha como a interface deve aparecer.</Text>
        <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
          {themeOptions.map((option) => {
            const active = preference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                style={[styles.segment, active && { backgroundColor: colors.surface }]}>
                <Text style={[styles.segmentText, { color: active ? colors.accent : colors.textSecondary }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTA E PRIVACIDADE</Text>
      <Card style={styles.menuCard}>
        <MenuItem label="Meus dados" ios="person.text.rectangle" android="badge" onPress={() => router.push('/settings/personal-data')} />
        <MenuItem label="Redefinir senha" ios="key.fill" android="key" onPress={() => router.push('/settings/change-password')} />
        <MenuItem label="Notificações" ios="bell.badge" android="notifications_active" onPress={() => router.push('/settings/notifications')} />
        <MenuItem label="Dispositivos e sessões" ios="iphone" android="devices" onPress={() => router.push('/settings/sessions')} />
        <MenuItem label="Privacidade e termos" ios="hand.raised.fill" android="privacy_tip" onPress={() => router.push('/settings/privacy')} last />
      </Card>

      <View style={styles.logout}>
        <Button label="Sair da conta" variant="secondary" loading={loggingOut} onPress={handleLogout} icon={<SymbolIcon ios="rectangle.portrait.and.arrow.right" android="logout" color={brand.danger} size={20} fallback="→" />} />
      </View>
      <Text style={[styles.version, { color: colors.textSecondary }]}>{appVersion ? `OnWay Cliente · versão ${appVersion}` : 'OnWay Cliente'}</Text>
    </Screen>
  );
}

function MenuItem({ label, ios, android, onPress, last = false }: { label: string; ios: Parameters<typeof SymbolIcon>[0]['ios']; android: string; onPress: () => void; last?: boolean }) {
  const { colors } = useOnWayTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }, pressed && { opacity: 0.62 }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.surfaceMuted }]}><SymbolIcon ios={ios} android={android} color={colors.textSecondary} size={19} fallback="•" /></View>
      <Text style={[styles.menuText, { color: colors.text }]}>{label}</Text>
      <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={17} fallback="›" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xl },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  profileBody: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800' },
  email: { fontSize: 12, marginTop: 3 },
  passwordWarning: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 13, fontWeight: '800' },
  warningText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginTop: spacing.xxl, marginBottom: spacing.sm, marginLeft: 4 },
  settingTitle: { fontSize: 15, fontWeight: '800' },
  settingSubtitle: { fontSize: 11, marginTop: 4 },
  segmented: { borderRadius: 13, padding: 4, flexDirection: 'row', marginTop: spacing.lg },
  segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 11, fontWeight: '800' },
  menuCard: { paddingVertical: 0 },
  menuItem: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 13, fontWeight: '600' },
  logout: { marginTop: spacing.xxl },
  version: { fontSize: 10, textAlign: 'center', marginTop: spacing.lg },
});
