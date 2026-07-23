import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import {
  formatWeekRange,
  ticketKindMeta,
  ticketReference,
  ticketStatusMeta,
  type Tone,
} from '@/domain/support';

export default function TicketsScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { tickets } = useSupport();

  const toneColor = (tone: Tone) =>
    tone === 'success' ? brand.green
      : tone === 'warning' ? brand.warning
      : tone === 'danger' ? brand.danger
      : colors.accent;

  return (
    <Screen>
      <SettingsHeader title="Meus chamados" />

      {tickets.length === 0 ? (
        <Card style={styles.empty}>
          <SymbolIcon ios="tray" android="inbox" color={colors.textSecondary} size={34} fallback="—" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum chamado ainda</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Abra um chamado para verificação, orçamento ou ordem de serviço.</Text>
          <Button label="Abrir chamado" onPress={() => router.push('/tickets/new')} />
        </Card>
      ) : (
        <>
          <View style={styles.list}>
            {tickets.map((ticket) => {
              const kind = ticketKindMeta(ticket.kind);
              const status = ticketStatusMeta(ticket.status);
              const tint = toneColor(status.tone);
              return (
                <Pressable
                  key={ticket.id}
                  onPress={() => router.push(`/tickets/${ticket.id}`)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <Card style={styles.ticketCard}>
                    <View style={[styles.ticketIcon, { backgroundColor: colors.surfaceMuted }]}>
                      <SymbolIcon ios={kind.ios} android={kind.android} color={colors.accent} size={20} fallback="•" />
                    </View>
                    <View style={styles.ticketBody}>
                      <Text style={[styles.ticketTitle, { color: colors.text }]}>{kind.label}</Text>
                      <Text style={[styles.ticketMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {ticketReference(ticket.id)}{ticket.plantName ? ` · ${ticket.plantName}` : ''}
                      </Text>
                      {ticket.scheduledDate ? null : ticket.preferredWeekStart ? (
                        <Text style={[styles.ticketMeta, { color: colors.textSecondary }]}>Semana {formatWeekRange(ticket.preferredWeekStart)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.ticketTail}>
                      <View style={[styles.badge, { backgroundColor: `${tint}22` }]}>
                        <Text style={[styles.badgeText, { color: tint }]}>{status.label}</Text>
                      </View>
                      <SymbolIcon ios="chevron.right" android="chevron_right" color={colors.textSecondary} size={16} fallback="›" />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.newButton}>
            <Button label="Abrir novo chamado" variant="secondary" onPress={() => router.push('/tickets/new')} icon={<SymbolIcon ios="plus" android="add" color={colors.text} size={18} fallback="+" />} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280, marginBottom: spacing.sm },
  list: { gap: spacing.md },
  ticketCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ticketIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ticketBody: { flex: 1, gap: 2 },
  ticketTitle: { fontSize: 14, fontWeight: '800' },
  ticketMeta: { fontSize: 11 },
  ticketTail: { alignItems: 'flex-end', gap: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  newButton: { marginTop: spacing.xl },
});
