import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import type { InvoiceTone } from '@/domain/contract';
import { useInvoice } from '@/hooks/use-invoice';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invoice, loading, error, reload } = useInvoice(id);

  const toneColor: Record<InvoiceTone, string> = {
    success: brand.green,
    warning: brand.warning,
    neutral: colors.textSecondary,
  };

  if (loading && !invoice) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={[styles.stateTitle, { color: colors.text }]}>Carregando fatura</Text>
      </Screen>
    );
  }

  if (!invoice) {
    return (
      <Screen>
        <SettingsHeader title="Fatura" />
        <Card style={styles.missing}>
          <SymbolIcon ios="doc.questionmark" android="find_in_page" color={colors.textSecondary} size={34} fallback="?" />
          <Text style={[styles.stateTitle, { color: colors.text }]}>Fatura não encontrada</Text>
          {error ? <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text> : null}
          {error ? <Button label="Tentar novamente" onPress={reload} /> : null}
          <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const tint = toneColor[invoice.statusTone];

  return (
    <Screen>
      <SettingsHeader title="Fatura" />

      <Card style={styles.headCard}>
        <View style={styles.headTop}>
          <View>
            <Text style={[styles.reference, { color: colors.text }]}>{invoice.referenceLabel}</Text>
            {invoice.plantName ? <Text style={[styles.plant, { color: colors.textSecondary }]}>{invoice.plantName}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: `${tint}22` }]}>
            <Text style={[styles.badgeText, { color: tint }]}>{invoice.statusLabel}</Text>
          </View>
        </View>

        {invoice.savingsLabel ? (
          <View style={[styles.savingsBanner, { backgroundColor: colors.accentSoft }]}>
            <View>
              <Text style={[styles.savingsLabel, { color: colors.accent }]}>Economia no mês</Text>
              <Text style={[styles.savingsValue, { color: colors.accent }]}>{invoice.savingsLabel}</Text>
            </View>
            <SymbolIcon ios="leaf.fill" android="eco" color={colors.accent} size={26} fallback="🌱" />
          </View>
        ) : null}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalhes</Text>
      <Card style={styles.infoCard}>
        <Row label="Valor pago" value={invoice.amountPaidLabel} ios="creditcard.fill" android="payments" />
        {invoice.amountWithoutSolarLabel ? <Row label="Sem energia solar seria" value={invoice.amountWithoutSolarLabel} ios="bolt.slash.fill" android="power_off" /> : null}
        {invoice.consumptionKwh !== null ? <Row label="Consumo" value={`${invoice.consumptionKwh.toLocaleString('pt-BR')} kWh`} ios="house.fill" android="home" /> : null}
        {invoice.injectedKwh !== null ? <Row label="Energia injetada" value={`${invoice.injectedKwh.toLocaleString('pt-BR')} kWh`} ios="arrow.up.right" android="upload" /> : null}
        {invoice.utility ? <Row label="Concessionária" value={invoice.utility} ios="building.2.fill" android="apartment" /> : null}
        <Row label="Origem" value={invoice.originLabel || '—'} ios="tray.and.arrow.down.fill" android="input" />
        <Row label="Registrada em" value={invoice.createdAtLabel} ios="calendar" android="event" last />
      </Card>

      {invoice.hasAttachment ? (
        <View style={[styles.attachNote, { backgroundColor: colors.surfaceMuted }]}>
          <SymbolIcon ios="paperclip" android="attach_file" color={colors.textSecondary} size={16} fallback="📎" />
          <Text style={[styles.attachText, { color: colors.textSecondary }]}>Esta fatura tem o arquivo original anexado.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, ios, android, last = false }: { label: string; value: string; ios: Parameters<typeof SymbolIcon>[0]['ios']; android: string; last?: boolean }) {
  const { colors } = useOnWayTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceMuted }]}><SymbolIcon ios={ios} android={android} color={colors.textSecondary} size={17} fallback="•" /></View>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stateTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300 },
  missing: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  headCard: { gap: spacing.md },
  headTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  reference: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  plant: { fontSize: 12, marginTop: 3 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  savingsBanner: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingsLabel: { fontSize: 11, fontWeight: '600' },
  savingsValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
  infoCard: { paddingVertical: 1 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 12 },
  rowValue: { fontSize: 13, fontWeight: '700' },
  attachNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  attachText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
