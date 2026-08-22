import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsHeader } from '@/components/settings-header';
import { SymbolIcon } from '@/components/symbol-icon';
import { Button, Card } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useClientData } from '@/contexts/client-data-context';
import { useOnWayTheme } from '@/contexts/theme-context';
import {
  CHECKUP_STEPS,
  runCheckup,
  type CheckStatus,
  type CheckupReport,
} from '@/domain/checkup';

type Phase = 'idle' | 'scanning' | 'done';

export default function CheckupScreen() {
  const router = useRouter();
  const { colors } = useOnWayTheme();
  const { plants } = useClientData();
  const params = useLocalSearchParams<{ plantId?: string }>();

  const [plantId, setPlantId] = useState<string | null>(params.plantId ?? plants[0]?.id ?? null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<CheckupReport | null>(null);
  const stepRef = useRef(0);

  const selectedPlant = useMemo(() => plants.find((plant) => plant.id === plantId) ?? null, [plantId, plants]);

  useEffect(() => {
    if (phase !== 'scanning') return;
    stepRef.current = 0;
    setStep(0);
    const id = setInterval(() => {
      stepRef.current += 1;
      if (stepRef.current >= CHECKUP_STEPS.length) {
        clearInterval(id);
        setPhase('done');
      } else {
        setStep(stepRef.current);
      }
    }, 430);
    return () => clearInterval(id);
  }, [phase]);

  function startScan() {
    if (!selectedPlant) return;
    setReport(runCheckup(selectedPlant));
    setPhase('scanning');
  }

  function reset() {
    setReport(null);
    setPhase('idle');
  }

  if (phase === 'scanning') {
    const progress = Math.min(1, (step + 1) / CHECKUP_STEPS.length);
    return (
      <Screen scroll={false} contentStyle={styles.scanScreen}>
        <View style={[styles.scanPulse, { backgroundColor: colors.accentSoft }]}>
          <SymbolIcon ios="waveform.path.ecg" android="monitor_heart" color={colors.accent} size={44} fallback="~" />
        </View>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        <Text style={[styles.scanTitle, { color: colors.text }]}>Verificando seu sistema</Text>
        <Text style={[styles.scanStep, { color: colors.textSecondary }]}>{CHECKUP_STEPS[step]}…</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.scanPlant, { color: colors.textSecondary }]}>{selectedPlant?.name}</Text>
      </Screen>
    );
  }

  if (phase === 'done' && report) {
    return (
      <Screen>
        <SettingsHeader title="Verificação do sistema" />
        <CheckupResult report={report} />
        <View style={styles.actions}>
          <Button
            label="Abrir chamado de verificação"
            onPress={() => router.push(`/tickets/new?kind=verificacao&plantId=${report.plantId}`)}
          />
          <Button label="Refazer verificação" variant="secondary" onPress={reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <SettingsHeader title="Verificação do sistema" />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Diagnóstico da usina</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Verificamos a comunicação da usina e a geração em relação ao prognóstico, e geramos um resultado.
      </Text>

      {plants.length ? (
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
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={[styles.plantCity, { color: colors.textSecondary }]}>Nenhuma usina disponível para verificação.</Text>
        </Card>
      )}

      <View style={[styles.mockNote, { backgroundColor: colors.surfaceMuted }]}>
        <SymbolIcon ios="info.circle" android="info" color={colors.textSecondary} size={16} fallback="i" />
        <Text style={[styles.mockNoteText, { color: colors.textSecondary }]}>
          Todas as checagens usam dados reais da API. Novos parâmetros (alarmes, desempenho e temperatura) serão incluídos quando o backend os disponibilizar.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Iniciar verificação" onPress={startScan} disabled={!selectedPlant} icon={<SymbolIcon ios="play.fill" android="play_arrow" color={brand.white} size={17} fallback="▶" />} />
      </View>
    </Screen>
  );
}

function CheckupResult({ report }: { report: CheckupReport }) {
  const { colors } = useOnWayTheme();
  const statusColor: Record<CheckStatus, string> = {
    ok: brand.green,
    info: colors.textSecondary,
    attention: brand.warning,
    critical: brand.danger,
  };
  const ringColor =
    report.incomplete && report.issues === 0
      ? colors.textSecondary
      : report.score >= 90 ? brand.green : report.score >= 75 ? '#5BBF8A' : report.score >= 50 ? brand.warning : brand.danger;
  const time = new Date(report.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Card style={styles.scoreCard}>
        <View style={[styles.scoreRing, { borderColor: ringColor }]}>
          <Text style={[styles.scoreValue, { color: colors.text }]}>{report.incomplete ? report.assessed : report.score}</Text>
          <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>{report.incomplete ? `/${report.total}` : '/100'}</Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={[styles.scoreHeadline, { color: colors.text }]}>{report.headline}</Text>
          <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>
            {report.issues > 0
              ? `${report.issues} ponto${report.issues > 1 ? 's' : ''} de atenção.`
              : report.incomplete
                ? `${report.total - report.assessed} verificação${report.total - report.assessed > 1 ? 'ões' : ''} sem dados suficientes.`
                : 'Nenhum ponto de atenção encontrado.'}
          </Text>
          <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>{report.plantName} · {time}</Text>
        </View>
      </Card>

      <Card style={styles.itemsCard}>
        {report.items.map((item, index) => (
          <View
            key={item.id}
            style={[styles.itemRow, index < report.items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={[styles.itemIcon, { backgroundColor: `${statusColor[item.status]}1F` }]}>
              <SymbolIcon ios={item.ios} android={item.android} color={statusColor[item.status]} size={18} fallback="•" />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemHead}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
            </View>
            <View style={[styles.itemValuePill, { backgroundColor: `${statusColor[item.status]}1F` }]}>
              <Text style={[styles.itemValue, { color: statusColor[item.status] }]}>{item.valueLabel}</Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: spacing.xl },
  plantCard: { paddingVertical: 0 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  plantRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plantInfo: { flex: 1 },
  plantName: { fontSize: 13, fontWeight: '700' },
  plantCity: { fontSize: 11, marginTop: 2 },
  mockNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  mockNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  actions: { marginTop: spacing.xl, gap: spacing.md },

  scanScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxxl },
  scanPulse: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontSize: 21, fontWeight: '800', marginTop: spacing.xl },
  scanStep: { fontSize: 14, marginTop: 6 },
  progressTrack: { height: 6, borderRadius: 3, width: '78%', marginTop: spacing.xl, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  scanPlant: { fontSize: 12, marginTop: spacing.md },

  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  scoreRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  scoreMax: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  scoreInfo: { flex: 1, gap: 3 },
  scoreHeadline: { fontSize: 17, fontWeight: '800' },
  scoreSub: { fontSize: 12, lineHeight: 17 },
  itemsCard: { marginTop: spacing.lg, paddingVertical: 2 },
  itemRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 3 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabel: { fontSize: 13, fontWeight: '800' },
  itemDetail: { fontSize: 11, lineHeight: 15 },
  itemValuePill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  itemValue: { fontSize: 12, fontWeight: '800' },
});
