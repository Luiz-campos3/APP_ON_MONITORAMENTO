import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GenerationHistoryCard } from '@/components/generation/generation-history-card';
import { Screen } from '@/components/screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { forecastPercentage, statusLabel } from '@/domain/client';
import type { Contract, InvoiceSummary } from '@/domain/contract';
import { formatDateParam, startOfDay } from '@/domain/generation-calculations';
import { usePlantHistory } from '@/hooks/use-plant-history';
import { usePlantContract } from '@/hooks/use-plant-contract';
import { usePlantInvoices } from '@/hooks/use-plant-invoices';
import { usePlant } from '@/hooks/use-plant';

export default function PlantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useOnWayTheme();
  const { data: plant, loading, error, reload } = usePlant(id);
  // Congela a rolagem da página enquanto o gráfico está em arraste horizontal.
  const [historyDragging, setHistoryDragging] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayRange = useMemo(() => {
    const todayParam = formatDateParam(today);
    return { period: 'day' as const, start: todayParam, end: todayParam };
  }, [today]);
  const todayHistory = usePlantHistory(plant?.id, todayRange);
  const contract = usePlantContract(plant?.id);
  const invoices = usePlantInvoices(plant?.id);

  // Atualiza as faturas ao voltar da tela de adicionar fatura.
  useFocusEffect(
    useCallback(() => {
      invoices.reload().catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoices.reload]),
  );

  if (loading && !plant) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando detalhes</Text>
      </Screen>
    );
  }

  if (!plant) {
    return (
      <Screen scroll={false} contentStyle={styles.centerState}>
        <SymbolIcon ios="exclamationmark.triangle.fill" android="warning" color={brand.warning} size={40} fallback="!" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Usina não encontrada</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error || 'Esta usina não está vinculada à conta autenticada.'}</Text>
        {error ? <Button label="Tentar novamente" onPress={reload} /> : null}
        <Button label="Voltar" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  const monthlyPercentage = forecastPercentage(plant);
  const status = statusLabel(plant.status).toUpperCase();
  const statusColor =
    plant.status === 'online' ? '#6BE1B3'
    : plant.status === 'attention' ? brand.warning
    : plant.status === 'critical' ? brand.danger
    : colors.textSecondary;
  const generationToday = todayHistory.data?.total ?? plant.generationToday;

  return (
    <Screen scrollEnabled={!historyDragging}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: colors.surface }]}>
          <SymbolIcon ios="chevron.left" android="arrow_back" color={colors.text} size={21} fallback="‹" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalhes da usina</Text>
        {/* Espaçador no lugar do antigo botão sem ação: mantém o título centralizado. */}
        <View style={styles.headerButton} />
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{plant.name}</Text>
      <Text style={[styles.location, { color: colors.textSecondary }]}>{plant.city}</Text>

      <LinearGradient colors={[brand.green, brand.greenDark]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.status}><View style={[styles.statusDot, { backgroundColor: statusColor }]} /><Text style={styles.statusText}>{status}</Text></View>
          <Text style={styles.updated}>Atualizado {plant.updatedAtLabel}</Text>
        </View>
        <Text style={styles.heroLabel}>Geração hoje</Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{generationToday.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</Text>
          <Text style={styles.heroUnit}>kWh</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetrics}>
          <View><Text style={styles.heroMetricLabel}>Este mês</Text><Text style={styles.heroMetricValue}>{plant.generationMonth.toLocaleString('pt-BR')} kWh</Text></View>
          <View><Text style={styles.heroMetricLabel}>Potência</Text><Text style={styles.heroMetricValue}>{plant.powerKwp.toLocaleString('pt-BR')} kWp</Text></View>
          <View><Text style={styles.heroMetricLabel}>Previsão mensal</Text><Text style={styles.heroMetricValue}>{monthlyPercentage === null ? '—' : `${monthlyPercentage}%`}</Text></View>
        </View>
      </LinearGradient>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verificar sistema"
        onPress={() => router.push(`/checkup?plantId=${plant.id}`)}
        style={({ pressed }) => [styles.checkupButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}>
        <View style={[styles.checkupIcon, { backgroundColor: colors.accentSoft }]}>
          <SymbolIcon ios="waveform.path.ecg" android="monitor_heart" color={colors.accent} size={20} fallback="~" />
        </View>
        <View style={styles.checkupText}>
          <Text style={[styles.checkupTitle, { color: colors.text }]}>Verificar sistema</Text>
          <Text style={[styles.checkupSubtitle, { color: colors.textSecondary }]}>Diagnóstico de geração, prognóstico e alarmes</Text>
        </View>
        <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={17} fallback="›" />
      </Pressable>

      <GenerationHistoryCard plantId={plant.id} today={today} minDate={contract.data?.activationDate ?? null} onDragStateChange={setHistoryDragging} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados técnicos</Text>
      <Card style={styles.infoCard}>
        <InfoRow label="Fabricante" value={plant.manufacturer} ios="building.2.fill" android="factory" />
        <InfoRow label="Módulos solares" value={`${plant.modules} unidades`} ios="square.grid.3x3.fill" android="grid_view" />
        <InfoRow label="Geração acumulada" value={`${plant.accumulatedGeneration.toLocaleString('pt-BR')} kWh`} ios="chart.line.uptrend.xyaxis" android="monitoring" />
        <InfoRow label="Potência instalada" value={`${plant.powerKwp.toLocaleString('pt-BR')} kWp`} ios="gauge.with.dots.needle.50percent" android="speed" last />
      </Card>

      <ContractSection contract={contract.data} loading={contract.loading} error={contract.error} />

      <InvoicesSection plantId={plant.id} summary={invoices.data} loading={invoices.loading} error={invoices.error} />

      <Text style={[styles.source, { color: colors.textSecondary }]}>Dados fornecidos por {plant.manufacturer} · Fonte {plant.source} · Última leitura {plant.updatedAtLabel}</Text>
    </Screen>
  );
}

function ContractSection({ contract, loading, error }: { contract: Contract | null; loading: boolean; error: string | null }) {
  const { colors } = useOnWayTheme();

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Plano & contrato</Text>
      <Card style={styles.infoCard}>
        {loading && !contract ? (
          <View style={styles.sectionState}><ActivityIndicator color={colors.accent} /></View>
        ) : error ? (
          <View style={styles.sectionState}><Text style={[styles.sectionStateText, { color: brand.danger }]}>{error}</Text></View>
        ) : !contract ? (
          <View style={styles.sectionState}><Text style={[styles.sectionStateText, { color: colors.textSecondary }]}>Nenhum contrato vinculado a esta usina.</Text></View>
        ) : (
          <>
            <View style={styles.contractHeader}>
              <View style={styles.contractHeaderText}>
                <Text style={[styles.contractPlan, { color: colors.text }]}>{contract.planName}</Text>
                <Text style={[styles.contractType, { color: colors.textSecondary }]}>
                  {contract.typeLabel}{contract.coverageLabel ? ` · Cobertura ${contract.coverageLabel}` : ''}
                </Text>
              </View>
              <View style={[styles.contractValueBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.contractValue, { color: colors.accent }]}>{contract.monthlyValueLabel}</Text>
                <Text style={[styles.contractValueUnit, { color: colors.accent }]}>por mês</Text>
              </View>
            </View>

            <View style={styles.contractMetaRow}>
              <View style={styles.contractMeta}><Text style={[styles.contractMetaLabel, { color: colors.textSecondary }]}>Potência</Text><Text style={[styles.contractMetaValue, { color: colors.text }]}>{contract.kwpLabel}</Text></View>
              <View style={styles.contractMeta}><Text style={[styles.contractMetaLabel, { color: colors.textSecondary }]}>Ativação</Text><Text style={[styles.contractMetaValue, { color: colors.text }]}>{contract.activationLabel}</Text></View>
            </View>

            {contract.services.length ? (
              <View style={[styles.servicesBlock, { borderTopColor: colors.border }]}>
                <Text style={[styles.servicesTitle, { color: colors.textSecondary }]}>Serviços contratados</Text>
                {contract.services.map((service) => (
                  <View key={service.id} style={styles.serviceRow}>
                    <SymbolIcon
                      ios={service.isBenefit ? 'gift.fill' : 'checkmark.seal.fill'}
                      android={service.isBenefit ? 'redeem' : 'verified'}
                      color={service.isBenefit ? brand.green : colors.textSecondary}
                      size={16}
                      fallback="•"
                    />
                    <Text style={[styles.serviceLabel, { color: colors.text }]} numberOfLines={2}>{service.label}</Text>
                    <Text style={[styles.serviceUsage, { color: colors.textSecondary }]}>{service.usageLabel}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Card>
    </>
  );
}

function InvoicesSection({ plantId, summary, loading, error }: { plantId: string; summary: InvoiceSummary | null; loading: boolean; error: string | null }) {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const toneColor = (tone: 'success' | 'warning' | 'neutral') =>
    tone === 'success' ? brand.green : tone === 'warning' ? brand.warning : colors.textSecondary;

  return (
    <>
      <View style={styles.invoicesHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Faturas</Text>
        <Pressable accessibilityRole="button" accessible onPress={() => router.push(`/invoices/new?plantId=${plantId}`)} style={({ pressed }) => [styles.addInvoice, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
          <SymbolIcon ios="plus" android="add" color={colors.accent} size={15} fallback="+" />
          <Text style={[styles.addInvoiceText, { color: colors.accent }]}>Adicionar</Text>
        </Pressable>
      </View>
      <Card style={styles.infoCard}>
        {loading && !summary ? (
          <View style={styles.sectionState}><ActivityIndicator color={colors.accent} /></View>
        ) : error ? (
          <View style={styles.sectionState}><Text style={[styles.sectionStateText, { color: brand.danger }]}>{error}</Text></View>
        ) : !summary || !summary.invoices.length ? (
          <View style={styles.sectionState}>
            <SymbolIcon ios="doc.text" android="description" color={colors.textSecondary} size={26} fallback="—" />
            <Text style={[styles.sectionStateText, { color: colors.textSecondary }]}>Nenhuma fatura ainda. Envie um PDF ou adicione manualmente.</Text>
          </View>
        ) : (
          <>
            {summary.totalSavings > 0 ? (
              <View style={[styles.savingsBanner, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.savingsLabel, { color: colors.accent }]}>Economia acumulada</Text>
                <Text style={[styles.savingsValue, { color: colors.accent }]}>{summary.totalSavingsLabel}</Text>
              </View>
            ) : null}
            {summary.invoices.map((invoice, index) => {
              const tint = toneColor(invoice.statusTone);
              return (
                <Pressable
                  key={invoice.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/invoices/${invoice.id}`)}
                  style={({ pressed }) => [
                    styles.invoiceRow,
                    index < summary.invoices.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <View style={styles.invoiceInfo}>
                    <Text style={[styles.invoiceRef, { color: colors.text }]}>{invoice.referenceLabel}</Text>
                    <Text style={[styles.invoiceMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {invoice.savingsLabel ? `Economia ${invoice.savingsLabel}` : invoice.originLabel}
                    </Text>
                  </View>
                  <View style={styles.invoiceTail}>
                    <Text style={[styles.invoiceAmount, { color: colors.text }]}>{invoice.amountPaidLabel}</Text>
                    <View style={[styles.invoiceBadge, { backgroundColor: `${tint}22` }]}>
                      <Text style={[styles.invoiceBadgeText, { color: tint }]}>{invoice.statusLabel}</Text>
                    </View>
                  </View>
                  <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={15} fallback="›" />
                </Pressable>
              );
            })}
          </>
        )}
      </Card>
    </>
  );
}

function InfoRow({ label, value, ios, android, last = false }: { label: string; value: string; ios: Parameters<typeof SymbolIcon>[0]['ios']; android: string; last?: boolean }) {
  const { colors } = useOnWayTheme();
  return (
    <View accessible style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.surfaceMuted }]}><SymbolIcon ios={ios} android={android} color={colors.textSecondary} size={18} fallback="•" /></View>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  stateTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  location: { fontSize: 13, marginTop: 4 },
  hero: { borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6BE1B3' },
  statusText: { color: brand.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  updated: { color: '#A9CCBE', fontSize: 10 },
  heroLabel: { color: '#B4D4C8', fontSize: 12, marginTop: 25 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  heroValue: { color: brand.white, fontSize: 45, fontWeight: '800', letterSpacing: -1.5 },
  heroUnit: { color: '#B4D4C8', fontSize: 15, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.13)', marginVertical: 20 },
  heroMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  heroMetricLabel: { color: '#9FC2B4', fontSize: 9 },
  heroMetricValue: { color: brand.white, fontSize: 13, fontWeight: '700', marginTop: 4 },
  checkupButton: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  checkupIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkupText: { flex: 1, gap: 2 },
  checkupTitle: { fontSize: 14, fontWeight: '800' },
  checkupSubtitle: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
  infoCard: { paddingVertical: 1 },
  infoRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 11 },
  infoValue: { fontSize: 12, fontWeight: '700' },
  source: { fontSize: 9, textAlign: 'center', marginTop: spacing.xl },
  sectionState: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  sectionStateText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  contractHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  contractHeaderText: { flex: 1, gap: 3 },
  contractPlan: { fontSize: 16, fontWeight: '800' },
  contractType: { fontSize: 11 },
  contractValueBadge: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, alignItems: 'flex-end' },
  contractValue: { fontSize: 14, fontWeight: '800' },
  contractValueUnit: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  contractMetaRow: { flexDirection: 'row', gap: spacing.xxl, paddingBottom: spacing.md },
  contractMeta: { gap: 3 },
  contractMetaLabel: { fontSize: 10 },
  contractMetaValue: { fontSize: 13, fontWeight: '700' },
  servicesBlock: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md },
  servicesTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  serviceLabel: { flex: 1, fontSize: 12 },
  serviceUsage: { fontSize: 11, fontWeight: '600' },
  savingsBanner: { borderRadius: 12, padding: 12, marginVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingsLabel: { fontSize: 11, fontWeight: '600' },
  savingsValue: { fontSize: 15, fontWeight: '800' },
  invoicesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md },
  addInvoice: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  addInvoiceText: { fontSize: 12, fontWeight: '800' },
  invoiceRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  invoiceInfo: { flex: 1, gap: 3 },
  invoiceRef: { fontSize: 13, fontWeight: '700' },
  invoiceMeta: { fontSize: 11 },
  invoiceTail: { alignItems: 'flex-end', gap: 5 },
  invoiceAmount: { fontSize: 13, fontWeight: '800' },
  invoiceBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  invoiceBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
});
