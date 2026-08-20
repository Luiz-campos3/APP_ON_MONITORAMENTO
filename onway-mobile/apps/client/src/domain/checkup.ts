import type { SymbolIcon } from '@/components/symbol-icon';
import { forecastPercentage, type Plant } from '@/domain/client';

type IconName = Parameters<typeof SymbolIcon>[0];

export type CheckStatus = 'ok' | 'attention' | 'critical' | 'info';

export type CheckupItem = {
  id: string;
  label: string;
  category: string;
  valueLabel: string;
  detail: string;
  status: CheckStatus;
  ios: IconName['ios'];
  android: string;
  /** true quando o valor vem da API; false quando é simulado. */
  real: boolean;
};

export type CheckupReport = {
  plantId: string;
  plantName: string;
  score: number;
  headline: string;
  issues: number;
  generatedAt: string;
  items: CheckupItem[];
};

export const CHECKUP_STEPS = [
  'Conectando à usina',
  'Verificando comunicação',
  'Lendo geração atual',
  'Comparando com o prognóstico',
  'Consolidando resultado',
];

function hoursSince(iso: string | null) {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return (Date.now() - timestamp) / 3_600_000;
}

const STATUS_PENALTY: Record<CheckStatus, number> = {
  ok: 0,
  info: 0,
  attention: 12,
  critical: 28,
};

function communicationCheck(plant: Plant): CheckupItem {
  const hours = hoursSince(plant.updatedAt);
  let status: CheckStatus = 'ok';
  let detail = 'Leituras chegando normalmente.';
  if (!plant.monitoringActive) {
    status = 'critical';
    detail = 'Monitoramento inativo para esta usina.';
  } else if (hours === null) {
    status = 'attention';
    detail = 'Sem registro de leitura recente.';
  } else if (hours > 24) {
    status = 'critical';
    detail = 'Sem comunicação há mais de 24 horas.';
  } else if (hours > 3) {
    status = 'attention';
    detail = 'Última leitura acima do intervalo esperado.';
  }
  return {
    id: 'comunicacao',
    label: 'Comunicação',
    category: 'Conectividade',
    valueLabel: plant.updatedAtLabel,
    detail,
    status,
    ios: 'antenna.radiowaves.left.and.right',
    android: 'sensors',
    real: true,
  };
}

function forecastCheck(plant: Plant): CheckupItem {
  const pct = forecastPercentage(plant);
  let status: CheckStatus = 'info';
  let detail = plant.forecastSource === 'sem_historico'
    ? 'Ainda sem histórico suficiente para prever a geração desta usina.'
    : 'Prognóstico mensal não disponível para esta usina.';
  if (pct !== null) {
    status = pct >= 90 ? 'ok' : pct >= 70 ? 'attention' : 'critical';
    detail = `Geração no mês em ${pct}% do previsto até hoje (${plant.generationMonth.toLocaleString('pt-BR')} de ${plant.expectedMonthToDate.toLocaleString('pt-BR')} kWh).`;
  }
  return {
    id: 'prognostico',
    label: 'Geração x prognóstico',
    category: 'Geração',
    valueLabel: pct === null ? '—' : `${pct}%`,
    detail,
    status,
    ios: 'chart.line.uptrend.xyaxis',
    android: 'trending_up',
    real: true,
  };
}

function scoreHeadline(score: number) {
  if (score >= 90) return 'Sistema saudável';
  if (score >= 75) return 'Bom, com pontos de atenção';
  if (score >= 50) return 'Requer atenção';
  return 'Verificação técnica recomendada';
}

// Somente checagens com dados reais da API. Alarmes, desempenho (PR),
// temperatura e comparação de períodos entram quando o backend expuser
// esses parâmetros — nunca como valores simulados.
export function runCheckup(plant: Plant): CheckupReport {
  const items = [communicationCheck(plant), forecastCheck(plant)];

  const penalties = items.reduce((sum, item) => sum + STATUS_PENALTY[item.status], 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalties)));
  const issues = items.filter((item) => item.status === 'attention' || item.status === 'critical').length;

  return {
    plantId: plant.id,
    plantName: plant.name,
    score,
    headline: scoreHeadline(score),
    issues,
    generatedAt: new Date().toISOString(),
    items,
  };
}
