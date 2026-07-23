import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Card } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function SessionsScreen() {
  const { colors } = useOnWayTheme();

  return (
    <Screen>
      <SettingsHeader title="Dispositivos e sessões" />
      <Text style={[styles.title, { color: colors.text }]}>Onde sua conta está conectada</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Você pode encerrar acessos que não reconhece.</Text>
      <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}> 
              <SymbolIcon ios="iphone" android="smartphone" color={colors.textSecondary} size={22} fallback="□" />
            </View>
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.text }]}>Este aparelho</Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Sessão Bearer armazenada com segurança</Text>
              <Text style={[styles.current, { color: colors.accent }]}>ATUAL</Text>
            </View>
          </View>
      </Card>
      <Text style={[styles.note, { color: colors.textSecondary }]}>A API atual ainda não oferece listagem ou revogação de outros dispositivos.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, marginTop: 5, marginBottom: spacing.xl },
  card: { paddingVertical: 0 },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  detail: { fontSize: 10, marginTop: 4 },
  current: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 5 },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: 20 },
});
