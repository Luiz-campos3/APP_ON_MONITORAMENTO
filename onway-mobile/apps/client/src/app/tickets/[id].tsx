import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import {
  formatDateBR,
  formatWeekRange,
  isTicketOpen,
  ticketKindMeta,
  ticketReference,
  ticketStatusMeta,
  type SupportTicket,
  type Tone,
} from '@/domain/support';

type Step = { title: string; detail: string; done: boolean; ios: Parameters<typeof SymbolIcon>[0]['ios']; android: string };

function buildSteps(ticket: SupportTicket): Step[] {
  const beyondOpen = ticket.status !== 'aberto' && ticket.status !== 'cancelado';
  const confirmed = ticket.status === 'confirmado' || ticket.status === 'concluido';
  const done = ticket.status === 'concluido';
  return [
    {
      title: 'Chamado aberto',
      detail: `Recebemos sua solicitação em ${formatDateBR(ticket.createdAt.slice(0, 10))}.`,
      done: true,
      ios: 'tray.and.arrow.down.fill',
      android: 'inbox',
    },
    {
      title: 'Semana prevista',
      detail: ticket.preferredWeekStart
        ? `Serviço planejado para a semana de ${formatWeekRange(ticket.preferredWeekStart)}.`
        : 'Aguardando definição da semana prevista.',
      done: beyondOpen && Boolean(ticket.preferredWeekStart),
      ios: 'calendar',
      android: 'calendar_month',
    },
    {
      title: 'Data confirmada',
      detail: confirmed && ticket.scheduledDate
        ? `Confirmada para ${formatDateBR(ticket.scheduledDate)}.`
        : 'Confirmaremos a data com você em até 48h antes do serviço.',
      done: confirmed,
      ios: 'checkmark.circle.fill',
      android: 'event_available',
    },
    {
      title: 'Serviço realizado',
      detail: done ? 'Serviço concluído. Obrigado!' : 'Execução do serviço na data confirmada.',
      done,
      ios: 'wrench.and.screwdriver.fill',
      android: 'build_circle',
    },
  ];
}

export default function TicketDetailScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTicket, cancelTicket, simulateConfirmation, markCompleted } = useSupport();
  const ticket = getTicket(id);

  if (!ticket) {
    return (
      <Screen>
        <SettingsHeader title="Chamado" />
        <Card style={styles.missing}>
          <SymbolIcon ios="questionmark.folder" android="folder_off" color={colors.textSecondary} size={34} fallback="?" />
          <Text style={[styles.missingTitle, { color: colors.text }]}>Chamado não encontrado</Text>
          <Button label="Voltar aos chamados" variant="secondary" onPress={() => router.replace('/tickets')} />
        </Card>
      </Screen>
    );
  }

  const kind = ticketKindMeta(ticket.kind);
  const status = ticketStatusMeta(ticket.status);
  const tint: Record<Tone, string> = {
    neutral: colors.textSecondary,
    accent: colors.accent,
    warning: brand.warning,
    success: brand.green,
    danger: brand.danger,
  };
  const statusColor = tint[status.tone];
  const steps = buildSteps(ticket);
  const open = isTicketOpen(ticket.status);
  const canConfirm = ticket.status === 'agendado' && Boolean(ticket.preferredWeekStart);
  const canComplete = ticket.status === 'confirmado';

  function confirmCancel() {
    Alert.alert('Cancelar chamado', 'Deseja realmente cancelar este chamado?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar chamado', style: 'destructive', onPress: () => cancelTicket(ticket!.id) },
    ]);
  }

  return (
    <Screen>
      <SettingsHeader title="Detalhe do chamado" />

      <Card style={styles.headCard}>
        <View style={styles.headTop}>
          <View style={[styles.headIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolIcon ios={kind.ios} android={kind.android} color={colors.accent} size={22} fallback="•" />
          </View>
          <View style={styles.headText}>
            <Text style={[styles.headTitle, { color: colors.text }]}>{kind.label}</Text>
            <Text style={[styles.headRef, { color: colors.textSecondary }]}>{ticketReference(ticket.id)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{status.label}</Text>
          </View>
        </View>
        {ticket.plantName ? (
          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <SymbolIcon ios="bolt.fill" android="bolt" color={colors.textSecondary} size={15} fallback="⚡" />
            <Text style={[styles.metaText, { color: colors.text }]}>{ticket.plantName}</Text>
          </View>
        ) : null}
        <View style={[styles.descBlock, { borderTopColor: colors.border }]}>
          <Text style={[styles.descLabel, { color: colors.textSecondary }]}>Descrição</Text>
          <Text style={[styles.descText, { color: colors.text }]}>{ticket.description}</Text>
        </View>
      </Card>

      {ticket.status === 'cancelado' ? (
        <View style={[styles.cancelBanner, { backgroundColor: `${brand.danger}16` }]}>
          <SymbolIcon ios="xmark.circle.fill" android="cancel" color={brand.danger} size={18} fallback="✕" />
          <Text style={[styles.cancelText, { color: brand.danger }]}>Este chamado foi cancelado.</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Acompanhamento</Text>
          <Card style={styles.timelineCard}>
            {steps.map((step, index) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, { backgroundColor: step.done ? brand.green : colors.surfaceMuted, borderColor: step.done ? brand.green : colors.border }]}>
                    <SymbolIcon ios={step.ios} android={step.android} color={step.done ? brand.white : colors.textSecondary} size={14} fallback={step.done ? '✓' : '•'} />
                  </View>
                  {index < steps.length - 1 ? <View style={[styles.stepLine, { backgroundColor: step.done ? brand.green : colors.border }]} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, { color: step.done ? colors.text : colors.textSecondary }]}>{step.title}</Text>
                  <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>{step.detail}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {open ? (
        <>
          {canConfirm || canComplete ? (
            <View style={[styles.demoNote, { borderColor: colors.border }]}>
              <Text style={[styles.demoLabel, { color: colors.textSecondary }]}>SIMULAÇÃO (SEM BACKEND)</Text>
              {canConfirm ? (
                <Button label="Simular confirmação da data (48h)" onPress={() => simulateConfirmation(ticket.id)} />
              ) : null}
              {canComplete ? (
                <Button label="Marcar serviço como concluído" onPress={() => markCompleted(ticket.id)} />
              ) : null}
            </View>
          ) : null}
          <View style={styles.cancelButton}>
            <Button label="Cancelar chamado" variant="ghost" onPress={confirmCancel} icon={<SymbolIcon ios="xmark" android="close" color={brand.danger} size={17} fallback="✕" />} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  missingTitle: { fontSize: 16, fontWeight: '800' },
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
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
  timelineCard: { paddingVertical: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 30 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  stepBody: { flex: 1, paddingBottom: spacing.xl, gap: 3 },
  stepTitle: { fontSize: 14, fontWeight: '800' },
  stepDetail: { fontSize: 12, lineHeight: 17 },
  cancelBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  cancelText: { fontSize: 13, fontWeight: '700' },
  demoNote: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl, gap: spacing.md },
  demoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  cancelButton: { marginTop: spacing.md },
});
