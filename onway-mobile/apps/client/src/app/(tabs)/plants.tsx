import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import type { PlantStatus } from '@/domain/client';

const statusConfig: Record<PlantStatus, { label: string; color: string }> = {
  online: { label: 'Online', color: brand.green },
  attention: { label: 'Atenção', color: brand.warning },
  offline: { label: 'Offline', color: brand.danger },
};

export default function PlantsScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { dashboard, plants, loading, refreshing, error, reload } = useClientData();

  if (loading && !plants.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando usinas</Text>
      </Screen>
    );
  }

  if (error && !plants.length) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <Text style={[styles.stateTitle, { color: colors.text }]}>Não foi possível carregar</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
        <Button label="Tentar novamente" onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}>
      <AppHeader />
      <Text style={[styles.title, { color: colors.text }]}>Minhas usinas</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Acompanhe suas unidades em um só lugar.</Text>
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{dashboard?.quantidadeUsinas ?? plants.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>usinas</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{(dashboard?.potenciaTotalKwp ?? plants.reduce((sum, plant) => sum + plant.powerKwp, 0)).toLocaleString('pt-BR')}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>kWp total</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>{dashboard?.usinasNormais ?? plants.filter((plant) => plant.status === 'online').length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>online</Text>
        </Card>
      </View>
      <View style={styles.list}>
        {plants.map((plant) => {
          const status = statusConfig[plant.status];
          return (
            <Pressable key={plant.id} onPress={() => router.push(`/plant/${plant.id}`)}>
              {({ pressed }) => (
                <Card style={[styles.plantCard, pressed && styles.pressed]}>
                  <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                    <SymbolIcon ios="bolt.fill" android="bolt" color={colors.accent} size={22} fallback="⚡" />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]}>{plant.name}</Text>
                      <View style={[styles.status, { backgroundColor: `${status.color}20` }]}>
                        <View style={[styles.dot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={[styles.location, { color: colors.textSecondary }]}>{plant.city} · {plant.manufacturer}</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.metrics}>
                      <View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Hoje</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{plant.generationToday.toLocaleString('pt-BR')} kWh</Text>
                      </View>
                      <View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Potência</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{plant.powerKwp.toLocaleString('pt-BR')} kWp</Text>
                      </View>
                      <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={18} fallback="›" />
                    </View>
                  </View>
                </Card>
              )}
            </Pressable>
          );
        })}
        {!plants.length ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Nenhuma usina vinculada</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>A API não retornou unidades para esta conta.</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  stateTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 320 },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 5 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: radius.md },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10, marginTop: 3 },
  list: { gap: spacing.md, marginTop: spacing.xl },
  plantCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  pressed: { opacity: 0.75 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '800' },
  status: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
  location: { fontSize: 11, marginTop: 5 },
  divider: { height: 1, marginVertical: 13 },
  metrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricLabel: { fontSize: 9 },
  metricValue: { fontSize: 12, fontWeight: '700', marginTop: 3 },
});
