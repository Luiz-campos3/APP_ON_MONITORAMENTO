import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { toPlantAlerts } from '@/domain/client';

export default function AlertsScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { plants, loading, refreshing, error, reload } = useClientData();
  const alerts = toPlantAlerts(plants);

  if (loading && !plants.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando alertas</Text>
      </Screen>
    );
  }

  if (error && !plants.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.danger} size={38} fallback="!" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Não foi possível carregar</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
        <Button label="Tentar novamente" onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}>
      <AppHeader />
      <Text style={[styles.title, { color: colors.text }]}>Alertas</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {alerts.length ? `${alerts.length} ponto${alerts.length > 1 ? 's' : ''} de atenção encontrado${alerts.length > 1 ? 's' : ''}.` : 'Nenhum ponto crítico no momento.'}
      </Text>

      {alerts.length ? (
        <View style={styles.list}>
          {alerts.map((alert) => {
            const color = alert.severity === 'danger' ? brand.danger : brand.warning;

            return (
              <Pressable key={alert.id} onPress={() => router.push(`/plant/${alert.plantId}`)}>
                {({ pressed }) => (
                  <Card style={[styles.alertCard, pressed && styles.pressed]}>
                    <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
                      <SymbolIcon
                        ios={alert.severity === 'danger' ? 'exclamationmark.triangle.fill' : 'bell.badge.fill'}
                        android={alert.severity === 'danger' ? 'warning' : 'notifications_active'}
                        color={color}
                        size={22}
                        fallback="!"
                      />
                    </View>
                    <View style={styles.body}>
                      <View style={styles.headerRow}>
                        <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>{alert.timestampLabel}</Text>
                      </View>
                      <Text style={[styles.plant, { color: colors.text }]}>{alert.plantName}</Text>
                      <Text style={[styles.description, { color: colors.textSecondary }]}>{alert.description}</Text>
                      <View style={styles.footer}>
                        <Text style={[styles.city, { color: colors.textSecondary }]}>{alert.city}</Text>
                        <View style={styles.openDetails}>
                          <Text style={[styles.openDetailsText, { color: colors.accent }]}>Ver usina</Text>
                          <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.accent} size={14} fallback="›" />
                        </View>
                      </View>
                    </View>
                  </Card>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="checkmark.circle.fill" android="check_circle" color={colors.accent} size={32} fallback="✓" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo certo por aqui</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            As usinas vinculadas à sua conta não estão com alerta ativo, atenção ou falta de comunicação no retorno atual da API.
          </Text>
        </Card>
      )}

      <Text style={[styles.source, { color: colors.textSecondary }]}>
        Alertas calculados com base em status, monitoramento ativo, flag de alerta e última leitura enviados pela API.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  stateTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 320 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 5 },
  list: { gap: spacing.md, marginTop: spacing.xl },
  alertCard: { flexDirection: 'row', gap: spacing.md },
  pressed: { opacity: 0.72 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  alertTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  time: { fontSize: 10, fontWeight: '700' },
  plant: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  description: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  city: { flex: 1, fontSize: 10 },
  openDetails: { borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 2 },
  openDetailsText: { fontSize: 10, fontWeight: '800' },
  emptyCard: { alignItems: 'center', marginTop: spacing.xl, paddingVertical: spacing.xxl },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: spacing.lg },
  emptyText: { fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm, maxWidth: 310 },
  source: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
