import { StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { Card } from '@/components/ui';
import { brand, spacing } from '@/constants/theme';
import { type NotificationPreferences, useClientApp } from '@/contexts/client-app-context';
import { useOnWayTheme } from '@/contexts/theme-context';

const options: { key: keyof NotificationPreferences; title: string; description: string }[] = [
  { key: 'plantOffline', title: 'Usina offline', description: 'Avise quando uma unidade parar de enviar dados.' },
  { key: 'lowGeneration', title: 'Baixa geração', description: 'Receba alertas de desempenho abaixo do esperado.' },
  { key: 'monthlyReport', title: 'Relatório mensal', description: 'Notifique quando um novo resumo estiver disponível.' },
  { key: 'serviceUpdates', title: 'Atendimento e visitas', description: 'Atualizações sobre chamados e visitas técnicas.' },
];

export default function NotificationsScreen() {
  const { colors } = useOnWayTheme();
  const { notifications, setNotification } = useClientApp();

  return (
    <Screen>
      <SettingsHeader title="Notificações" />
      <Text style={[styles.title, { color: colors.text }]}>Suas preferências</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Escolha quais comunicações deseja receber.</Text>
      <Card style={styles.card}>
        {options.map((option, index) => (
          <View key={option.key} style={[styles.row, index < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={styles.body}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{option.title}</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{option.description}</Text>
            </View>
            <Switch
              accessibilityLabel={option.title}
              value={notifications[option.key]}
              onValueChange={(enabled) => setNotification(option.key, enabled)}
              trackColor={{ false: colors.surfaceMuted, true: brand.greenDark }}
              thumbColor={notifications[option.key] ? brand.white : colors.textSecondary}
            />
          </View>
        ))}
      </Card>
      <Text style={[styles.saved, { color: colors.textSecondary }]}>
        Preferências salvas neste aparelho. Elas já controlam o badge de alertas; push remoto depende de endpoint de dispositivos/notificações.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, marginTop: 5, marginBottom: spacing.xl },
  card: { paddingVertical: 0 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowDescription: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  saved: { textAlign: 'center', fontSize: 10, marginTop: spacing.lg },
});
