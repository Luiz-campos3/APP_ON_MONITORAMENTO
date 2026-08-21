import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card, Field } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import { useSupport } from '@/contexts/support-context';
import { TICKET_KINDS, ticketKindMeta, URGENCY_OPTIONS, type TicketKind } from '@/domain/support';
import { apiErrorMessage, type UploadFile } from '@/services/mobile-api';
import { captureTicketPhoto, pickTicketPhoto } from '@/services/photo';

const MIN_DESCRIPTION = 5; // regra do backend

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
  const [urgencia, setUrgencia] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descriptionError = submitted && description.trim().length < MIN_DESCRIPTION
    ? `Descreva o problema com pelo menos ${MIN_DESCRIPTION} caracteres.`
    : undefined;
  const plantError = submitted && !plantId ? 'Selecione a usina do chamado.' : undefined;

  async function attach(source: 'camera' | 'gallery') {
    setError(null);
    setAttaching(true);
    try {
      const result = source === 'camera' ? await captureTicketPhoto() : await pickTicketPhoto();
      if (result && 'error' in result) setError(result.error);
      else if (result && 'file' in result) setPhoto(result.file);
    } catch {
      setError('Não foi possível preparar a foto. Tente novamente.');
    } finally {
      setAttaching(false);
    }
  }

  async function handleSubmit() {
    setSubmitted(true);
    setError(null);
    if (!plantId || description.trim().length < MIN_DESCRIPTION) return;

    setSending(true);
    try {
      const ticket = await createTicket(
        {
          usinaId: plantId,
          categoria: ticketKindMeta(kind).categoria,
          urgencia,
          description,
        },
        photo ?? undefined,
      );
      router.replace(`/tickets/${ticket.id}`);
    } catch (submitError) {
      // POST não é reexecutado automaticamente; o usuário decide reenviar.
      setError(apiErrorMessage(submitError));
      setSending(false);
    }
  }

  if (!plants.length) {
    return (
      <Screen>
        <SettingsHeader title="Abrir chamado" />
        <Card style={styles.blocked}>
          <SymbolIcon ios="bolt.slash.fill" android="power_off" color={colors.textSecondary} size={32} fallback="○" />
          <Text style={[styles.blockedTitle, { color: colors.text }]}>Nenhuma usina vinculada</Text>
          <Text style={[styles.blockedText, { color: colors.textSecondary }]}>Um chamado é sempre aberto para uma usina. Sua conta ainda não tem usinas vinculadas.</Text>
        </Card>
      </Screen>
    );
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

      <Text style={[styles.label, { color: colors.textSecondary }]}>USINA</Text>
      <Card style={styles.plantCard}>
        {plants.map((plant, index) => {
          const active = plant.id === plantId;
          return (
            <Pressable
              key={plant.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessible
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
      {plantError ? <Text style={[styles.errorText, { color: brand.danger }]}>{plantError}</Text> : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>URGÊNCIA (OPCIONAL)</Text>
      <View style={styles.urgencies}>
        {URGENCY_OPTIONS.map((option) => {
          const active = option.value === urgencia;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setUrgencia(active ? null : option.value)}
              style={[styles.urgencyChip, { backgroundColor: active ? colors.accent : colors.surfaceMuted, borderColor: active ? colors.accent : colors.border }]}>
              <Text style={[styles.urgencyText, { color: active ? brand.white : colors.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
      <Field
        label="Descreva o problema"
        placeholder="Ex.: a usina parou de gerar ontem e o inversor está com luz vermelha."
        value={description}
        onChangeText={setDescription}
        error={descriptionError}
        multiline
        numberOfLines={4}
        style={styles.textarea}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>FOTO (OPCIONAL)</Text>
      {photo ? (
        <View style={[styles.photoCard, { borderColor: colors.border }]}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
          <View style={styles.photoInfo}>
            <Text style={[styles.photoName, { color: colors.text }]}>Foto anexada</Text>
            <Text style={[styles.photoHint, { color: colors.textSecondary }]}>Comprimida e sem dados de localização.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Remover foto" onPress={() => setPhoto(null)} hitSlop={10}>
            <SymbolIcon ios="trash" android="delete" color={brand.danger} size={19} fallback="🗑" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <Pressable accessibilityRole="button" accessible disabled={attaching} onPress={() => attach('camera')} style={({ pressed }) => [styles.photoButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}>
            <SymbolIcon ios="camera.fill" android="photo_camera" color={colors.accent} size={20} fallback="📷" />
            <Text style={[styles.photoButtonText, { color: colors.text }]}>Câmera</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessible disabled={attaching} onPress={() => attach('gallery')} style={({ pressed }) => [styles.photoButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}>
            <SymbolIcon ios="photo.on.rectangle" android="photo_library" color={colors.accent} size={20} fallback="🖼" />
            <Text style={[styles.photoButtonText, { color: colors.text }]}>Galeria</Text>
          </Pressable>
        </View>
      )}
      {attaching ? (
        <View style={styles.attaching}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={[styles.attachingText, { color: colors.textSecondary }]}>Preparando a foto…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorNote, { backgroundColor: `${brand.danger}16` }]}>
          <SymbolIcon ios="exclamationmark.circle" android="error" color={brand.danger} size={17} fallback="!" />
          <Text style={styles.errorNoteText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.infoNote, { backgroundColor: colors.surfaceMuted }]}>
        <SymbolIcon ios="bell.badge" android="notifications" color={colors.accent} size={18} fallback="●" />
        <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
          Você acompanha o andamento por aqui. A OnWay faz a triagem e atualiza o status do chamado.
        </Text>
      </View>

      <View style={styles.submit}>
        <Button label={sending ? 'Enviando…' : 'Abrir chamado'} onPress={handleSubmit} loading={sending} disabled={sending || attaching} />
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
  urgencies: { flexDirection: 'row', gap: spacing.sm },
  urgencyChip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  urgencyText: { fontSize: 12, fontWeight: '700' },
  textarea: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  photoButtons: { flexDirection: 'row', gap: spacing.md },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md },
  photoButtonText: { fontSize: 13, fontWeight: '700' },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  photoPreview: { width: 54, height: 54, borderRadius: 10 },
  photoInfo: { flex: 1, gap: 2 },
  photoName: { fontSize: 13, fontWeight: '700' },
  photoHint: { fontSize: 11 },
  attaching: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  attachingText: { fontSize: 12 },
  errorNote: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: spacing.lg },
  errorNoteText: { flex: 1, color: brand.danger, fontSize: 12, lineHeight: 17 },
  errorText: { fontSize: 12, marginTop: spacing.sm, marginLeft: 2 },
  infoNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  infoNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  blocked: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  blockedTitle: { fontSize: 16, fontWeight: '800' },
  blockedText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300 },
  submit: { marginTop: spacing.xl },
});
