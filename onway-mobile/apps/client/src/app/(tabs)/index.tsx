import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { GenerationChart } from '@/components/generation-chart';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { features } from '@/config/features';
import { brand, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { forecastSummary, statusLabel } from '@/domain/client';
import { computePayback } from '@/domain/payback';
import { usePlantHistory } from '@/hooks/use-plant-history';

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { user } = useAuth();
  const { dashboard, plants, loading, refreshing, error, reload } = useClientData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const plant = plants.find((item) => item.id === selectedId) ?? plants[0];
  const history = usePlantHistory(plant?.id);
  const todayRange = useMemo(() => {
    const today = formatDateParam(new Date());
    return { period: 'day' as const, start: today, end: today };
  }, []);
  const todayHistory = usePlantHistory(plant?.id, todayRange);
  const firstName = user?.nome.split(' ').filter(Boolean)[0] || 'cliente';
  const monthlyForecast = plant ? forecastSummary(plant) : null;

  useEffect(() => {
    if (plants.length && !plants.some((item) => item.id === selectedId)) {
      setSelectedId(plants[0].id);
    }
  }, [plants, selectedId]);

  if (loading && !plant) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando seus dados</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>Consultando dashboard e usinas na OnWay.</Text>
      </Screen>
    );
  }

  if (error && !plant) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.danger} size={38} fallback="!" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Não foi possível carregar</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
        <Button label="Tentar novamente" onPress={reload} />
      </Screen>
    );
  }

  if (!plant) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <SymbolIcon ios="bolt.slash.fill" android="power_off" color={colors.textSecondary} size={38} fallback="○" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Nenhuma usina disponível</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>Sua conta está autenticada, mas não recebeu usinas vinculadas.</Text>
        <Button label="Atualizar" onPress={reload} variant="secondary" />
      </Screen>
    );
  }

  const statusText = statusLabel(plant.status);
  const statusColor =
    plant.status === 'online' ? '#63E5B4'
    : plant.status === 'attention' ? brand.warning
    : plant.status === 'critical' ? brand.danger
    : colors.textSecondary;
  const generationToday = todayHistory.data?.total ?? plant.generationToday;
  const generationTodaySource = todayHistory.data ? 'Histórico de hoje' : 'Leitura da API';
  // Oculto até o backend expor investimento/tarifa reais (I5) — flag em config/features.
  const payback = features.paybackCard ? computePayback(plant) : null;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}>
      <AppHeader />
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>VISÃO GERAL</Text>
      <Text accessibilityRole="header" style={[styles.greeting, { color: colors.text }]}>Olá, {firstName}</Text>

      <View style={styles.selectorWrap}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Usina selecionada</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: pickerOpen }}
          onPress={() => setPickerOpen((value) => !value)}
          style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.plantIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="bolt.fill" android="bolt" color={colors.accent} size={18} fallback="⚡" />
          </View>
          <View style={styles.selectorText}>
            <Text style={[styles.selectorTitle, { color: colors.text }]}>{plant.name}</Text>
            <Text style={[styles.selectorSubtitle, { color: colors.textSecondary }]}>{plant.city}</Text>
          </View>
          <SymbolIcon ios={pickerOpen ? 'chevron.up' : 'chevron.down'} android={pickerOpen ? 'expand_less' : 'expand_more'} color={colors.textSecondary} size={18} fallback="⌄" />
        </Pressable>
        {pickerOpen ? (
          <View style={[styles.pickerMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {plants.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === plant.id }}
                onPress={() => { setSelectedId(item.id); setPickerOpen(false); }}
                style={[styles.pickerItem, item.id === plant.id && { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.pickerText, { color: colors.text }]}>{item.name}</Text>
                {item.id === plant.id ? <SymbolIcon ios="checkmark" android="check" color={colors.accent} size={18} fallback="✓" /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <LinearGradient colors={[brand.green, brand.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statusCard}>
        <View style={styles.glowOne} />
        <View style={styles.statusTop}>
          <View style={styles.statusPill}>
            <View style={[styles.onlineDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusPillText}>{statusText}</Text>
          </View>
          <SymbolIcon ios="sun.max.fill" android="sunny" color="#D9FFF0" size={25} fallback="☀" />
        </View>
        <Text style={styles.statusTitle}>{plant.status === 'online' ? 'Tudo funcionando' : plant.status === 'attention' ? 'Requer atenção' : plant.status === 'critical' ? 'Falha crítica' : 'Sem monitoramento'}</Text>
        <Text style={styles.statusSubtitle}>Última atualização {plant.updatedAtLabel}</Text>

        {payback ? (
          <View style={styles.paybackBlock}>
            <View style={styles.paybackHead}>
              <View style={styles.paybackHeadLeft}>
                <SymbolIcon ios={payback.isPaidOff ? 'checkmark.seal.fill' : 'chart.line.uptrend.xyaxis'} android={payback.isPaidOff ? 'verified' : 'savings'} color="#D9FFF0" size={15} fallback="$" />
                <Text style={styles.paybackLabel}>{payback.isPaidOff ? 'Sistema já se pagou' : 'Payback do sistema'}</Text>
              </View>
              <Text style={[styles.paybackPercent, payback.isPaidOff && { color: '#FFE08A' }]}>
                {payback.isPaidOff ? '100%' : `${Math.round(payback.percentPaid)}%`}
              </Text>
            </View>
            <View style={styles.paybackTrack}>
              <View style={[styles.paybackFill, { width: `${Math.max(3, payback.percentPaid)}%`, backgroundColor: payback.isPaidOff ? '#FFE08A' : '#D9FFF0' }]} />
            </View>
            <Text style={styles.paybackNote}>
              {payback.isPaidOff
                ? `${payback.accumulatedSavingsLabel} economizados · retorno de ${payback.returnAmountLabel}`
                : `${payback.accumulatedSavingsLabel} de ${payback.investmentLabel}${payback.projectedDateLabel ? ` · quita em ${payback.projectedDateLabel}` : ''}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.statusFooter}>
          <View>
            <Text style={styles.statusMetricLabel}>Potência instalada</Text>
            <Text style={styles.statusMetricValue}>{plant.powerKwp.toLocaleString('pt-BR')} kWp</Text>
          </View>
          <Pressable accessibilityRole="button" accessible onPress={() => router.push(`/plant/${plant.id}`)} style={styles.detailButton}>
            <Text style={styles.detailButtonText}>Ver detalhes</Text>
            <SymbolIcon ios="chevron.right" android="chevron_right" color={brand.white} size={15} fallback="›" />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: '#FFF2C9' }]}>
            <SymbolIcon ios="sun.max.fill" android="light_mode" color="#B77B00" size={20} fallback="☀" />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Hoje</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{generationToday.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>kWh gerados</Text>
          <Text style={[styles.realMetricNote, { color: colors.textSecondary }]}>{generationTodaySource}</Text>
        </Card>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="calendar" android="calendar_month" color={colors.accent} size={20} fallback="□" />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Este mês</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{plant.generationMonth.toLocaleString('pt-BR')}</Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>kWh gerados</Text>
          <Text style={styles.positive}>{monthlyForecast}</Text>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Geração nos últimos 7 dias</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{history.data ? `Total de ${history.data.total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh` : 'Consultando histórico'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/plant/${plant.id}`)} hitSlop={10}>
            <Text style={[styles.link, { color: colors.accent }]}>Detalhes</Text>
          </Pressable>
        </View>
        {history.loading ? <ActivityIndicator color={colors.accent} style={styles.chartLoading} /> : null}
        {history.data?.values.length ? <GenerationChart values={history.data.values} labels={history.data.labels} type="bar" /> : null}
        {history.error ? <Text style={[styles.chartError, { color: brand.danger }]}>{history.error}</Text> : null}
        {!history.loading && !history.error && !history.data?.values.length ? <Text style={[styles.chartError, { color: colors.textSecondary }]}>Sem histórico disponível para esta usina.</Text> : null}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Acesso rápido</Text>
      <View style={styles.quickRow}>
        <QuickAction label="Detalhes" ios="chart.bar.doc.horizontal.fill" android="query_stats" fallback="▤" onPress={() => router.push(`/plant/${plant.id}`)} />
        <QuickAction label="Alertas" ios="bell.fill" android="notifications" fallback="●" onPress={() => router.push('/(tabs)/alerts')} />
        <QuickAction label="Suporte" ios="bubble.left.and.bubble.right.fill" android="support_agent" fallback="?" onPress={() => router.push('/(tabs)/support')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo da conta</Text>
      </View>
      <Card style={styles.activityCard}>
        <View style={[styles.activityIcon, { backgroundColor: colors.accentSoft }]}>
          <SymbolIcon ios="checkmark.circle.fill" android="check_circle" color={colors.accent} size={22} fallback="✓" />
        </View>
        <View style={styles.activityBody}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>{dashboard?.quantidadeUsinas ?? plants.length} usinas vinculadas</Text>
          <Text style={[styles.activityText, { color: colors.textSecondary }]}>{(dashboard?.potenciaTotalKwp ?? plants.reduce((sum, item) => sum + item.powerKwp, 0)).toLocaleString('pt-BR')} kWp de potência total.</Text>
          <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
            {dashboard?.usinasComAlerta ?? 0} com ponto de atenção
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

type QuickActionProps = { label: string; ios: Parameters<typeof SymbolIcon>[0]['ios']; android: string; fallback: string; onPress: () => void };

function QuickAction({ label, ios, android, fallback, onPress }: QuickActionProps) {
  const { colors } = useOnWayTheme();
  return (
    <Pressable accessibilityRole="button" accessible onPress={onPress} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
      <View style={[styles.quickIcon, { backgroundColor: colors.accentSoft }]}>
        <SymbolIcon ios={ios} android={android} fallback={fallback} color={colors.accent} size={21} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  stateTitle: { fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320, marginBottom: spacing.sm },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  greeting: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  selectorWrap: { marginTop: spacing.xl, zIndex: 3 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 7 },
  selector: { minHeight: 62, padding: 10, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 11 },
  plantIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selectorText: { flex: 1, gap: 2 },
  selectorTitle: { fontSize: 15, fontWeight: '700' },
  selectorSubtitle: { fontSize: 12 },
  pickerMenu: { position: 'absolute', left: 0, right: 0, top: 88, borderWidth: 1, borderRadius: radius.md, padding: 6, zIndex: 5 },
  pickerItem: { minHeight: 48, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 14, fontWeight: '600' },
  statusCard: { borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg, overflow: 'hidden', minHeight: 225 },
  glowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(68, 221, 165, 0.12)', right: -48, top: -80 },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#63E5B4' },
  statusPillText: { color: brand.white, fontSize: 11, fontWeight: '700' },
  statusTitle: { color: brand.white, fontSize: 27, fontWeight: '800', letterSpacing: -0.6, marginTop: 23 },
  statusSubtitle: { color: '#B7D5C9', fontSize: 12, marginTop: 5 },
  paybackBlock: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, padding: 13 },
  paybackHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paybackHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paybackLabel: { color: '#D9FFF0', fontSize: 12, fontWeight: '700' },
  paybackPercent: { color: brand.white, fontSize: 15, fontWeight: '800' },
  paybackTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 10, overflow: 'hidden' },
  paybackFill: { height: 8, borderRadius: 4 },
  paybackNote: { color: '#B7D5C9', fontSize: 10.5, marginTop: 9 },
  statusFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 },
  statusMetricLabel: { color: '#9BC0B1', fontSize: 10 },
  statusMetricValue: { color: brand.white, fontSize: 16, fontWeight: '700', marginTop: 4 },
  detailButton: { height: 40, borderRadius: radius.pill, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailButtonText: { color: brand.white, fontSize: 12, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  metricCard: { flex: 1, padding: spacing.lg },
  metricIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricValue: { fontSize: 23, fontWeight: '800', letterSpacing: -0.7, marginTop: 4 },
  unit: { fontSize: 10, marginTop: 1 },
  positive: { color: brand.green, fontSize: 9, fontWeight: '700', marginTop: 11 },
  realMetricNote: { fontSize: 9, fontWeight: '700', marginTop: 11 },
  chartCard: { marginTop: spacing.md, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSubtitle: { fontSize: 11, marginTop: 4 },
  chartLoading: { minHeight: 150 },
  chartError: { minHeight: 80, textAlign: 'center', textAlignVertical: 'center', paddingTop: spacing.xxl, fontSize: 11 },
  link: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: spacing.xxl },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickAction: { flex: 1, minHeight: 92, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  activityCard: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.md },
  activityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700' },
  activityText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  activityTime: { fontSize: 10, marginTop: 7 },
});
