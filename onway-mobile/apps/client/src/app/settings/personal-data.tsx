import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { Card, Field } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function PersonalDataScreen() {
  const { colors } = useOnWayTheme();
  const { user } = useAuth();

  return (
    <Screen>
      <SettingsHeader title="Meus dados" />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Informações pessoais</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Dados retornados pela sua conta OnWay.</Text>
      <Card style={styles.form}>
        <Field label="Nome completo" value={user?.nome || ''} editable={false} />
        <Field label="E-mail" value={user?.email || ''} editable={false} />
      </Card>
      <View style={styles.note}>
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          Estes dados são lidos da API autenticada. Alteração pelo aplicativo depende de endpoint próprio no backend.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, marginTop: 5, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  note: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  noteText: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
