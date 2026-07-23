import type { SymbolIcon } from '@/components/symbol-icon';
import { generationPercentage, type Plant } from '@/domain/client';

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
  'Conectando ao inversor',
  'Lendo geração atual',
  'Comparando com o prognóstico',
  'Analisando períodos anteriores',
  'Verificando alarmes',
  'Medindo desempenho',
  'Consolidando resultado',
];

// Ruído determinístico por usina, para que o mock seja estável entre aberturas.
function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function seeded(seed: number, min: number, max: number) {
  const normalized = ((seed * 9301 + 49297) % 233280) / 233280;
  return min + normalized * (max - min);
}

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
  const pct = generationPercentage(plant.generationMonth, plant.expectedMonth);
  let status: CheckStatus = 'info';
  let detail = 'Prognóstico mensal não disponível para esta usina.';
  if (pct !== null) {
    status = pct >= 90 ? 'ok' : pct >= 70 ? 'attention' : 'critical';
    detail = `Geração no mês em ${pct}% do prognóstico (${plant.generationMonth.toLocaleString('pt-BR')} de ${plant.expectedMonth.toLocaleString('pt-BR')} kWh).`;
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

function periodCheck(plant: Plant): CheckupItem {
  const seed = hashString(`${plant.id}-periodo`);
  const delta = Math.round(seeded(seed, -18, 22));
  const status: CheckStatus = delta >= 0 ? 'ok' : delta >= -10 ? 'attention' : 'critical';
  const sign = delta > 0 ? '+' : '';
  return {
    id: 'periodos',
    label: 'Comparação de períodos',
    category: 'Desempenho',
    valueLabel: `${sign}${delta}%`,
    detail: `Geração ${delta >= 0 ? 'acima' : 'abaixo'} do mesmo período anterior (${sign}${delta}%).`,
    status,
    ios: 'calendar.badge.clock',
    android: 'date_range',
    real: false,
  };
}

function performanceCheck(plant: Plant): CheckupItem {
  const seed = hashString(`${plant.id}-pr`);
  const pr = Math.round(seeded(seed, 74, 98));
  const status: CheckStatus = pr >= 80 ? 'ok' : pr >= 70 ? 'attention' : 'critical';
  return {
    id: 'desempenho',
    label: 'Índice de desempenho (PR)',
    category: 'Desempenho',
    valueLabel: `${pr}%`,
    detail: `Performance ratio estimado em ${pr}%.`,
    status,
    ios: 'gauge.with.dots.needle.67percent',
    android: 'speed',
    real: false,
  };
}

function alarmsCheck(plant: Plant): CheckupItem {
  const seed = hashString(`${plant.id}-alarmes`);
  const roll = seeded(seed, 0, 10);
  const count = plant.hasAlert ? Math.max(1, Math.round(seeded(seed, 1, 2))) : roll > 7.5 ? 1 : 0;
  const status: CheckStatus = count === 0 ? 'ok' : count === 1 ? 'attention' : 'critical';
  return {
    id: 'alarmes',
    label: 'Alarmes do inversor',
    category: 'Equipamento',
    valueLabel: count === 0 ? 'Nenhum' : `${count} ativo${count > 1 ? 's' : ''}`,
    detail: count === 0 ? 'Nenhum alarme ativo no período.' : 'Alarme(s) registrado(s) — recomendável verificação técnica.',
    status,
    ios: 'exclamationmark.triangle.fill',
    android: 'warning',
    real: false,
  };
}

function temperatureCheck(plant: Plant): CheckupItem {
  const seed = hashString(`${plant.id}-temp`);
  const temp = Math.round(seeded(seed, 33, 57));
  const status: CheckStatus = temp < 50 ? 'ok' : temp < 56 ? 'attention' : 'critical';
  return {
    id: 'temperatura',
    label: 'Temperatura do inversor',
    category: 'Equipamento',
    valueLabel: `${temp} °C`,
    detail: `Temperatura operacional ${temp < 50 ? 'dentro da faixa' : 'acima do ideal'}.`,
    status,
    ios: 'thermometer.medium',
    android: 'device_thermostat',
    real: false,
  };
}

function scoreHeadline(score: number) {
  if (score >= 90) return 'Sistema saudável';
  if (score >= 75) return 'Bom, com pontos de atenção';
  if (score >= 50) return 'Requer atenção';
  return 'Verificação técnica recomendada';
}

export function runCheckup(plant: Plant): CheckupReport {
  const items = [
    communicationCheck(plant),
    forecastCheck(plant),
    periodCheck(plant),
    performanceCheck(plant),
    alarmsCheck(plant),
    temperatureCheck(plant),
  ];

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
