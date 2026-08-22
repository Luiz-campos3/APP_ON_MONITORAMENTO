import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useAlerts } from '@/contexts/alerts-context';
import { useOnWayTheme } from '@/contexts/theme-context';

export default function AlertsScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { alerts, unread, loading, refreshing, error, reload, markRead, markAllRead } = useAlerts();

  // Recarrega ao focar a aba: pega alertas que surgiram/sumiram desde a última visita.
  useFocusEffect(
    useCallback(() => {
      reload().catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  function openAlert(id: string, plantId: string) {
    markRead(id);
    router.push(`/plant/${plantId}`);
  }

  if (loading && !alerts.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando alertas</Text>
      </Screen>
    );
  }

  if (error && !alerts.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.danger} size={38} fallback="!" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Não foi possível carregar</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
        <Button label="Tentar novamente" onPress={() => reload().catch(() => undefined)} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}>
      <AppHeader />
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Alertas</Text>
        {unread > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => markAllRead().catch(() => undefined)} hitSlop={8}>
            <Text style={[styles.markAll, { color: colors.accent }]}>Marcar todas como lidas</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {alerts.length
          ? `${alerts.length} alerta${alerts.length > 1 ? 's' : ''} aberto${alerts.length > 1 ? 's' : ''}${unread > 0 ? ` · ${unread} não lido${unread > 1 ? 's' : ''}` : ''}.`
          : 'Nenhum alerta aberto no momento.'}
      </Text>

      {alerts.length ? (
        <View style={styles.list}>
          {alerts.map((alert) => {
            const color = alert.tone === 'danger' ? brand.danger : brand.warning;

            return (
              <Pressable key={alert.id} accessibilityRole="button" accessible onPress={() => openAlert(alert.id, alert.plantId)}>
                {({ pressed }) => (
                  <Card style={[styles.alertCard, pressed && styles.pressed]}>
                    <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
                      <SymbolIcon ios={alert.icon.ios} android={alert.icon.android} color={color} size={22} fallback="!" />
                    </View>
                    <View style={styles.body}>
                      <View style={styles.headerRow}>
                        <View style={styles.titleWrap}>
                          {!alert.read ? <View style={[styles.unreadDot, { backgroundColor: color }]} /> : null}
                          <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={1}>{alert.title}</Text>
                        </View>
                        {alert.timeLabel ? <Text style={[styles.time, { color: colors.textSecondary }]}>{alert.timeLabel}</Text> : null}
                      </View>
                      <Text style={[styles.plant, { color: colors.text }]}>{alert.plantName}</Text>
                      {alert.message ? <Text style={[styles.description, { color: colors.textSecondary }]}>{alert.message}</Text> : null}
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
            Nenhuma usina vinculada à sua conta está com alerta aberto no momento.
          </Text>
        </Card>
      )}

      <Text style={[styles.source, { color: colors.textSecondary }]}>
        Alertas de geração e comunicação apurados pelo servidor a cada coleta.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  stateTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 320 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  markAll: { fontSize: 12, fontWeight: '800', paddingBottom: 4 },
  subtitle: { fontSize: 14, marginTop: 5 },
  list: { gap: spacing.md, marginTop: spacing.xl },
  alertCard: { flexDirection: 'row', gap: spacing.md },
  pressed: { opacity: 0.72 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
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
