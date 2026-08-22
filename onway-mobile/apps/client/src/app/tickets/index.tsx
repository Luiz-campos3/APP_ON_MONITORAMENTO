import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import { ticketNeedsAttention, ticketStatusTone, type SupportTicket, type Tone } from '@/domain/support';

export default function TicketsScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { tickets, ready, refreshing, error, reload, migratedNotice, dismissMigrationNotice } = useSupport();

  const toneColor = (tone: Tone) =>
    tone === 'success' ? brand.green
      : tone === 'warning' ? brand.warning
      : tone === 'danger' ? brand.danger
      : tone === 'neutral' ? colors.textSecondary
      : colors.accent;

  if (!ready && tickets.length === 0) {
    return (
      <Screen>
        <SettingsHeader title="Meus chamados" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>Carregando seus chamados…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}>
      <SettingsHeader title="Meus chamados" />

      {migratedNotice ? (
        <View style={[styles.notice, { backgroundColor: colors.surfaceMuted }]}>
          <SymbolIcon ios="info.circle.fill" android="info" color={colors.accent} size={17} fallback="i" />
          <Text style={[styles.noticeText, { color: colors.text }]}>Os chamados de demonstração foram descartados. Os chamados abertos agora vão direto para a OnWay.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dispensar aviso" onPress={dismissMigrationNotice} hitSlop={10}>
            <SymbolIcon ios="xmark" android="close" color={colors.textSecondary} size={15} fallback="✕" />
          </Pressable>
        </View>
      ) : null}

      {error && tickets.length > 0 ? (
        <View style={[styles.notice, { backgroundColor: `${brand.warning}22` }]}>
          <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.warning} size={17} fallback="!" />
          <Text style={[styles.noticeText, { color: colors.text }]}>Mostrando a última lista salva. Puxe para atualizar.</Text>
        </View>
      ) : null}

      {tickets.length === 0 ? (
        error ? (
          <Card style={styles.empty}>
            <SymbolIcon ios="wifi.exclamationmark" android="wifi_off" color={brand.danger} size={34} fallback="!" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Não foi possível carregar</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
            <Button label="Tentar novamente" onPress={reload} />
          </Card>
        ) : (
          <Card style={styles.empty}>
            <SymbolIcon ios="tray" android="inbox" color={colors.textSecondary} size={34} fallback="—" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum chamado ainda</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Abra um chamado para verificação, orçamento ou manutenção da sua usina.</Text>
            <Button label="Abrir chamado" onPress={() => router.push('/tickets/new')} />
          </Card>
        )
      ) : (
        <>
          <View style={styles.list}>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} tint={toneColor(ticketStatusTone(ticket.status))} onPress={() => router.push(`/tickets/${ticket.id}`)} />
            ))}
          </View>
          <View style={styles.newButton}>
            <Button label="Abrir novo chamado" variant="secondary" onPress={() => router.push('/tickets/new')} icon={<SymbolIcon ios="plus" android="add" color={colors.text} size={18} fallback="+" />} />
          </View>
        </>
      )}
    </Screen>
  );
}

function TicketRow({ ticket, tint, onPress }: { ticket: SupportTicket; tint: string; onPress: () => void }) {
  const { colors } = useOnWayTheme();
  const attention = ticketNeedsAttention(ticket);
  const title = ticket.categoria || 'Chamado';
  return (
    <Pressable accessibilityRole="button" accessible onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Card style={styles.ticketCard}>
        <View style={[styles.ticketIcon, { backgroundColor: colors.surfaceMuted }]}>
          <SymbolIcon ios="wrench.and.screwdriver.fill" android="build" color={colors.accent} size={20} fallback="•" />
        </View>
        <View style={styles.ticketBody}>
          <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.ticketMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {ticket.numero}{ticket.plantName ? ` · ${ticket.plantName}` : ''}
          </Text>
          {attention ? <Text style={[styles.attention, { color: brand.warning }]}>Aguardando você</Text> : null}
        </View>
        <View style={styles.ticketTail}>
          <View style={[styles.badge, { backgroundColor: `${tint}22` }]}>
            <Text style={[styles.badgeText, { color: tint }]}>{ticket.statusLabel}</Text>
          </View>
          <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={16} fallback="›" />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  centerText: { fontSize: 13 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 16 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280, marginBottom: spacing.sm },
  list: { gap: spacing.md },
  ticketCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ticketIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ticketBody: { flex: 1, gap: 2 },
  ticketTitle: { fontSize: 14, fontWeight: '800' },
  ticketMeta: { fontSize: 11 },
  attention: { fontSize: 10, fontWeight: '800', marginTop: 3 },
  ticketTail: { alignItems: 'flex-end', gap: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  newButton: { marginTop: spacing.xl },
});
