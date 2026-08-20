import * as DocumentPicker from 'expo-document-picker';
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
import { invoiceReferenceLabel, toOcrExtraction } from '@/domain/contract';
import { apiErrorMessage, MAX_UPLOAD_BYTES, mobileApi, type InvoiceUpload } from '@/services/mobile-api';

function monthOptions(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: invoiceReferenceLabel(value) };
  });
}

function parseNumber(value: string) {
  const text = value.trim();
  if (!text) return NaN;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toInput(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { plants } = useClientData();
  const params = useLocalSearchParams<{ plantId?: string }>();

  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? plants[0]?.id ?? null);
  const [mesAno, setMesAno] = useState<string | null>(null);
  const [consumo, setConsumo] = useState('');
  const [injetado, setInjetado] = useState('');
  const [valor, setValor] = useState('');
  const [concessionaria, setConcessionaria] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [ocrOk, setOcrOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => monthOptions(12), []);

  const mesError = submitted && !mesAno ? 'Selecione o mês de referência.' : undefined;
  const consumoError = submitted && Number.isNaN(parseNumber(consumo)) ? 'Informe o consumo.' : undefined;
  const injetadoError = submitted && Number.isNaN(parseNumber(injetado)) ? 'Informe a energia injetada.' : undefined;
  const valorError = submitted && Number.isNaN(parseNumber(valor)) ? 'Informe o valor pago.' : undefined;

  async function pickAndRead() {
    if (!plantId) return;
    setError(null);
    setOcrNote(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    // A borda de produção recusa uploads acima de 25 MB (413); avisamos antes de enviar.
    if (typeof asset.size === 'number' && asset.size > MAX_UPLOAD_BYTES) {
      setOcrOk(false);
      setOcrNote('O arquivo passa do limite de 25 MB. Envie um PDF menor ou uma foto comprimida, ou preencha manualmente.');
      return;
    }
    const file: InvoiceUpload = {
      uri: asset.uri,
      name: asset.name || 'fatura',
      mimeType: asset.mimeType || 'application/pdf',
    };

    setReading(true);
    setOcrOk(false);
    try {
      const extraction = toOcrExtraction(await mobileApi.ocrInvoice(plantId, file));

      // Se o backend já gravou (retornou id), vamos direto ao detalhe.
      if (extraction.saved && extraction.savedId) {
        router.replace(`/invoices/${extraction.savedId}`);
        return;
      }

      // Caso contrário, pré-preenche os campos para o usuário confirmar.
      if (extraction.monthKey) setMesAno(extraction.monthKey);
      setConsumo(toInput(extraction.consumoKwh));
      setInjetado(toInput(extraction.injetadoKwh));
      setValor(toInput(extraction.valorPago));
      if (extraction.concessionaria) setConcessionaria(extraction.concessionaria);
      setOcrOk(true);
      const base = 'Lemos sua fatura. Confira os dados abaixo e confirme.';
      setOcrNote(extraction.warnings.length ? `${base} ${extraction.warnings.join(' ')}` : base);
    } catch (readError) {
      setOcrNote(`${apiErrorMessage(readError)} Você pode preencher manualmente.`);
    } finally {
      setReading(false);
    }
  }

  async function handleSave() {
    setSubmitted(true);
    setError(null);
    const consumoKwh = parseNumber(consumo);
    const injetadoKwh = parseNumber(injetado);
    const valorPago = parseNumber(valor);
    if (!plantId || !mesAno || Number.isNaN(consumoKwh) || Number.isNaN(injetadoKwh) || Number.isNaN(valorPago)) return;

    setSaving(true);
    try {
      const created = await mobileApi.createInvoice(plantId, {
        mesAno,
        consumoKwh,
        injetadoKwh,
        valorPago,
        concessionaria: concessionaria.trim() || null,
      });
      router.replace(`/invoices/${created.id}`);
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SettingsHeader title="Adicionar fatura" />

      {plants.length > 1 ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>USINA</Text>
          <Card style={styles.plantCard}>
            {plants.map((item, index) => {
              const active = item.id === plantId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setPlantId(item.id)}
                  style={[styles.plantRow, index < plants.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <Text style={[styles.plantName, { color: colors.text }]}>{item.name}</Text>
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

      <Pressable
        accessibilityRole="button"
        disabled={reading || !plantId}
        onPress={pickAndRead}
        style={({ pressed }) => [styles.uploadBox, { borderColor: colors.accent, backgroundColor: colors.accentSoft }, pressed && { opacity: 0.8 }]}>
        <SymbolIcon ios={reading ? 'hourglass' : 'doc.viewfinder'} android={reading ? 'hourglass_empty' : 'document_scanner'} color={colors.accent} size={26} fallback="⬆" />
        <View style={styles.uploadText}>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>{reading ? 'Lendo sua fatura…' : 'Enviar PDF ou foto da fatura'}</Text>
          <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
            {reading ? 'A leitura pode levar até 2 minutos. Mantenha o app aberto.' : 'Extraímos os dados automaticamente para você conferir. Limite de 25 MB.'}
          </Text>
        </View>
      </Pressable>

      {ocrNote ? (
        <View style={[styles.ocrNote, { backgroundColor: ocrOk ? colors.accentSoft : `${brand.warning}22` }]}>
          <SymbolIcon ios={ocrOk ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'} android={ocrOk ? 'check_circle' : 'warning'} color={ocrOk ? colors.accent : brand.warning} size={17} fallback="!" />
          <Text style={[styles.ocrNoteText, { color: colors.text }]}>{ocrNote}</Text>
        </View>
      ) : null}

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>ou preencha manualmente</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>MÊS DE REFERÊNCIA</Text>
      <View style={styles.months}>
        {months.map((option) => {
          const active = option.value === mesAno;
          return (
            <Pressable
              key={option.value}
              onPress={() => setMesAno(option.value)}
              style={[styles.monthChip, { backgroundColor: active ? colors.accent : colors.surfaceMuted, borderColor: active ? colors.accent : colors.border }]}>
              <Text style={[styles.monthText, { color: active ? brand.white : colors.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {mesError ? <Text style={[styles.fieldError, { color: brand.danger }]}>{mesError}</Text> : null}

      <Card style={styles.form}>
        <Field label="Consumo (kWh)" placeholder="Ex.: 450" keyboardType="decimal-pad" value={consumo} onChangeText={setConsumo} error={consumoError} />
        <Field label="Energia injetada (kWh)" placeholder="Ex.: 380" keyboardType="decimal-pad" value={injetado} onChangeText={setInjetado} error={injetadoError} />
        <Field label="Valor pago (R$)" placeholder="Ex.: 320,50" keyboardType="decimal-pad" value={valor} onChangeText={setValor} error={valorError} />
        <Field label="Concessionária (opcional)" placeholder="Ex.: Neoenergia" value={concessionaria} onChangeText={setConcessionaria} autoCapitalize="words" />
      </Card>

      {error ? (
        <View style={[styles.errorNote, { backgroundColor: `${brand.danger}16` }]}>
          <SymbolIcon ios="exclamationmark.circle" android="error" color={brand.danger} size={17} fallback="!" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.submit}>
        <Button label="Salvar fatura" onPress={handleSave} loading={saving} disabled={reading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
  plantCard: { paddingVertical: 0 },
  plantRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plantName: { fontSize: 13, fontWeight: '700' },
  uploadBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', padding: spacing.lg, marginTop: spacing.xl },
  uploadText: { flex: 1, gap: 3 },
  uploadTitle: { fontSize: 14, fontWeight: '800' },
  uploadSubtitle: { fontSize: 11, lineHeight: 15 },
  ocrNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  ocrNoteText: { flex: 1, fontSize: 12, lineHeight: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '700' },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthChip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  monthText: { fontSize: 11, fontWeight: '700' },
  fieldError: { fontSize: 12, marginTop: spacing.sm, marginLeft: 2 },
  form: { gap: spacing.lg, marginTop: spacing.lg },
  errorNote: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: spacing.lg },
  errorText: { flex: 1, color: brand.danger, fontSize: 12, lineHeight: 17 },
  submit: { marginTop: spacing.xl },
});
