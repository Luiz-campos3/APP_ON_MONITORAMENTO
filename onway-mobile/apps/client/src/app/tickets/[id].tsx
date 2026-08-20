import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import { ticketStatusTone, type SupportTicket, type Tone } from '@/domain/support';
import { apiErrorMessage } from '@/services/mobile-api';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tickets, fetchTicket } = useSupport();

  // Começa pela entrada em cache (sem timeline) e busca o detalhe completo.
  const [ticket, setTicket] = useState<SupportTicket | null>(() => tickets.find((item) => item.id === id) ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setTicket(await fetchTicket(id));
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [fetchTicket, id]);

  useEffect(() => {
    load();
  }, [load]);

  const tint: Record<Tone, string> = {
    neutral: colors.textSecondary,
    accent: colors.accent,
    warning: brand.warning,
    success: brand.green,
    danger: brand.danger,
  };

  if (!ticket && loading) {
    return (
      <Screen>
        <SettingsHeader title="Chamado" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  if (!ticket) {
    return (
      <Screen>
        <SettingsHeader title="Chamado" />
        <Card style={styles.missing}>
          <SymbolIcon ios="questionmark.folder" android="folder_off" color={colors.textSecondary} size={34} fallback="?" />
          <Text style={[styles.missingTitle, { color: colors.text }]}>Chamado não encontrado</Text>
          {error ? <Text style={[styles.missingText, { color: colors.textSecondary }]}>{error}</Text> : null}
          <Button label="Tentar novamente" onPress={load} />
          <Button label="Voltar aos chamados" variant="secondary" onPress={() => router.replace('/tickets')} />
        </Card>
      </Screen>
    );
  }

  const statusColor = tint[ticketStatusTone(ticket.status)];

  return (
    <Screen>
      <SettingsHeader title="Detalhe do chamado" />

      <Card style={styles.headCard}>
        <View style={styles.headTop}>
          <View style={[styles.headIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios="wrench.and.screwdriver.fill" android="build" color={colors.accent} size={22} fallback="•" />
          </View>
          <View style={styles.headText}>
            <Text style={[styles.headTitle, { color: colors.text }]}>{ticket.categoria || 'Chamado'}</Text>
            <Text style={[styles.headRef, { color: colors.textSecondary }]}>{ticket.numero} · aberto em {ticket.createdAtLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{ticket.statusLabel}</Text>
          </View>
        </View>
        {ticket.plantName ? (
          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <SymbolIcon ios="bolt.fill" android="bolt" color={colors.textSecondary} size={15} fallback="⚡" />
            <Text style={[styles.metaText, { color: colors.text }]}>{ticket.plantName}</Text>
          </View>
        ) : null}
        {ticket.urgencia ? (
          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <SymbolIcon ios="exclamationmark.triangle" android="priority_high" color={colors.textSecondary} size={15} fallback="!" />
            <Text style={[styles.metaText, { color: colors.text }]}>Urgência: {ticket.urgencia}</Text>
          </View>
        ) : null}
        <View style={[styles.descBlock, { borderTopColor: colors.border }]}>
          <Text style={[styles.descLabel, { color: colors.textSecondary }]}>Descrição</Text>
          <Text style={[styles.descText, { color: colors.text }]}>{ticket.description}</Text>
        </View>
        {ticket.hasAttachment ? (
          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <SymbolIcon ios="paperclip" android="attach_file" color={colors.textSecondary} size={15} fallback="📎" />
            <Text style={[styles.metaText, { color: colors.text }]}>Foto anexada na abertura</Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acompanhamento</Text>
        {loading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      </View>

      {ticket.timeline.length > 0 ? (
        <Card style={styles.timelineCard}>
          {ticket.timeline.map((event, index) => {
            const last = index === ticket.timeline.length - 1;
            return (
              <View key={`${event.title}-${index}`} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, { backgroundColor: brand.green, borderColor: brand.green }]}>
                    <SymbolIcon ios="checkmark" android="check" color={brand.white} size={13} fallback="✓" />
                  </View>
                  {!last ? <View style={[styles.stepLine, { backgroundColor: colors.border }]} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{event.title}</Text>
                  {event.atLabel ? <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>{event.atLabel}</Text> : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : (
        <Card style={styles.timelinePlaceholder}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            {loading ? 'Carregando o andamento…' : 'Sem atualizações registradas ainda.'}
          </Text>
        </Card>
      )}

      <View style={[styles.infoNote, { backgroundColor: colors.surfaceMuted }]}>
        <SymbolIcon ios="info.circle" android="info" color={colors.textSecondary} size={16} fallback="i" />
        <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
          As atualizações são feitas pela equipe da OnWay. Para falar com o suporte, use os canais de contato no seu perfil.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  missing: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  missingTitle: { fontSize: 16, fontWeight: '800' },
  missingText: { fontSize: 12, textAlign: 'center', lineHeight: 17, maxWidth: 300 },
  headCard: { gap: spacing.md },
  headTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 3 },
  headTitle: { fontSize: 16, fontWeight: '800' },
  headRef: { fontSize: 11 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: spacing.md },
  metaText: { fontSize: 13, fontWeight: '700' },
  descBlock: { borderTopWidth: 1, paddingTop: spacing.md, gap: 5 },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  descText: { fontSize: 13, lineHeight: 19 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  timelineCard: { paddingVertical: spacing.lg },
  timelinePlaceholder: { paddingVertical: spacing.xl, alignItems: 'center' },
  placeholderText: { fontSize: 12, textAlign: 'center' },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 30 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  stepBody: { flex: 1, paddingBottom: spacing.xl, gap: 3 },
  stepTitle: { fontSize: 14, fontWeight: '800' },
  stepDetail: { fontSize: 12, lineHeight: 17 },
  infoNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  infoNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
