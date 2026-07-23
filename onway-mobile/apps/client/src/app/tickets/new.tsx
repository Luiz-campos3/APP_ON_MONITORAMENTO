import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import {
  TICKET_KINDS,
  ticketKindMeta,
  upcomingWeekOptions,
  type TicketKind,
} from '@/domain/support';

export default function NewTicketScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { plants } = useClientData();
  const { createTicket } = useSupport();
  const params = useLocalSearchParams<{ kind?: string; plantId?: string }>();

  const initialKind: TicketKind = TICKET_KINDS.includes(params.kind as TicketKind)
    ? (params.kind as TicketKind)
    : 'verificacao';

  const [kind, setKind] = useState<TicketKind>(initialKind);
  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? plants[0]?.id ?? null);
  const [description, setDescription] = useState('');
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const weekOptions = useMemo(() => upcomingWeekOptions(8), []);
  const requiresWeek = kind === 'ordem_servico';
  const descriptionError = submitted && description.trim().length < 10
    ? 'Descreva o que precisa com pelo menos 10 caracteres.'
    : undefined;
  const weekError = submitted && requiresWeek && !weekStart
    ? 'Escolha uma semana prevista para o serviço.'
    : undefined;

  function handleSubmit() {
    setSubmitted(true);
    if (description.trim().length < 10) return;
    if (requiresWeek && !weekStart) return;

    const plant = plants.find((item) => item.id === plantId) ?? null;
    const ticket = createTicket({
      kind,
      plantId: plant?.id ?? null,
      plantName: plant?.name ?? null,
      description,
      preferredWeekStart: weekStart,
    });
    router.replace(`/tickets/${ticket.id}`);
  }

  return (
    <Screen>
      <SettingsHeader title="Abrir chamado" />

      <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE CHAMADO</Text>
      <View style={styles.kinds}>
        {TICKET_KINDS.map((option) => {
          const meta = ticketKindMeta(option);
          const active = option === kind;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setKind(option)}
              style={({ pressed }) => [
                styles.kindCard,
                { backgroundColor: colors.surface, borderColor: active ? colors.accent : colors.border },
                active && { borderWidth: 2 },
                pressed && { opacity: 0.8 },
              ]}>
              <View style={[styles.kindIcon, { backgroundColor: active ? colors.accentSoft : colors.surfaceMuted }]}>
                <SymbolIcon ios={meta.ios} android={meta.android} color={active ? colors.accent : colors.textSecondary} size={20} fallback="•" />
              </View>
              <View style={styles.kindText}>
                <Text style={[styles.kindTitle, { color: colors.text }]}>{meta.label}</Text>
                <Text style={[styles.kindDescription, { color: colors.textSecondary }]}>{meta.description}</Text>
              </View>
              {active ? <SymbolIcon ios="checkmark.circle.fill" android="check_circle" color={colors.accent} size={20} fallback="✓" /> : null}
            </Pressable>
          );
        })}
      </View>

      {plants.length ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>USINA</Text>
          <Card style={styles.plantCard}>
            {plants.map((plant, index) => {
              const active = plant.id === plantId;
              return (
                <Pressable
                  key={plant.id}
                  onPress={() => setPlantId(plant.id)}
                  style={[styles.plantRow, index < plants.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={styles.plantInfo}>
                    <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
                    <Text style={[styles.plantCity, { color: colors.textSecondary }]}>{plant.city}</Text>
                  </View>
                  <SymbolIcon
                    ios={active ? 'largecircle.fill.circle' : 'circle'}
                    android={active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    color={active ? colors.accent : colors.textSecondary}
                    size={20}
                    fallback={active ? '◉' : '○'}
                  />
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
      <Field
        label="Conte o que você precisa"
        placeholder="Ex.: gostaria de uma verificação geral do sistema e um orçamento de limpeza dos módulos."
        value={description}
        onChangeText={setDescription}
        error={descriptionError}
        multiline
        numberOfLines={4}
        style={styles.textarea}
      />

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        SEMANA PREVISTA{requiresWeek ? '' : ' (OPCIONAL)'}
      </Text>
      <View style={styles.weeks}>
        {weekOptions.map((option) => {
          const active = option.value === weekStart;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setWeekStart(active ? null : option.value)}
              style={[
                styles.weekChip,
                { backgroundColor: active ? colors.accent : colors.surfaceMuted, borderColor: active ? colors.accent : colors.border },
              ]}>
              <Text style={[styles.weekText, { color: active ? brand.white : colors.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {weekError ? <Text style={[styles.errorText, { color: brand.danger }]}>{weekError}</Text> : null}

      <View style={[styles.infoNote, { backgroundColor: colors.surfaceMuted }]}>
        <SymbolIcon ios="clock.badge.checkmark" android="schedule" color={colors.accent} size={18} fallback="⏱" />
        <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
          Com até 48h de antecedência, confirmaremos a data com você e informaremos a previsão de realização do serviço.
        </Text>
      </View>

      <View style={styles.submit}>
        <Button label="Abrir chamado" onPress={handleSubmit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
  kinds: { gap: spacing.sm },
  kindCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  kindIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kindText: { flex: 1, gap: 2 },
  kindTitle: { fontSize: 14, fontWeight: '800' },
  kindDescription: { fontSize: 11, lineHeight: 15 },
  plantCard: { paddingVertical: 0 },
  plantRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plantInfo: { flex: 1 },
  plantName: { fontSize: 13, fontWeight: '700' },
  plantCity: { fontSize: 11, marginTop: 2 },
  textarea: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  weeks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  weekChip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  weekText: { fontSize: 12, fontWeight: '700' },
  errorText: { fontSize: 12, marginTop: spacing.sm, marginLeft: 2 },
  infoNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  infoNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  submit: { marginTop: spacing.xl },
});
