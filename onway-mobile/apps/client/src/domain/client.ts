import type { ApiPlant, PlantHistoryResponse } from '@/services/mobile-api';

export type PlantStatus = 'online' | 'attention' | 'offline';

export type Plant = {
  id: string;
  name: string;
  city: string;
  status: PlantStatus;
  hasAlert: boolean;
  monitoringActive: boolean;
  powerKwp: number;
  generationToday: number;
  generationMonth: number;
  expectedMonth: number;
  accumulatedGeneration: number;
  updatedAt: string | null;
  updatedAtLabel: string;
  manufacturer: string;
  source: string;
  modules: number;
};

export type WeeklyGeneration = {
  values: number[];
  labels: string[];
  total: number;
  average: number;
  source: string;
  updatedAt: string | null;
};

export type HistoryPeriod = 'day' | 'week' | 'month' | 'year';

export type PlantAlert = {
  id: string;
  plantId: string;
  plantName: string;
  city: string;
  category: 'plantOffline' | 'lowGeneration';
  severity: 'warning' | 'danger';
  title: string;
  description: string;
  timestampLabel: string;
};

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function firstNumeric(...values: (number | null | undefined)[]) {
  return numeric(values.find((value) => typeof value === 'number' && Number.isFinite(value)));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

function plantStatus(plant: ApiPlant): PlantStatus {
  const status = normalizeText(plant.status)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    plant.monitoramentoAtivo === false
    || status.includes('offline')
    || status.includes('inativ')
    || status.includes('sem dado')
  ) return 'offline';

  if (
    plant.alerta
    || status.includes('alert')
    || status.includes('atenc')
    || status.includes('falha')
    || status.includes('erro')
  ) return 'attention';

  return 'online';
}

export function formatLastReading(value: string | null | undefined) {
  if (!value) return 'sem leitura';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'data indisponível';

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'agora';
  if (elapsedMinutes < 60) return `há ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `há ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `há ${elapsedDays} d`;

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toPlant(plant: ApiPlant): Plant {
  return {
    id: plant.id,
    name: normalizeText(plant.nome) || 'Usina sem nome',
    city: normalizeText(plant.cidade) || 'Localização não informada',
    status: plantStatus(plant),
    hasAlert: plant.alerta,
    monitoringActive: plant.monitoramentoAtivo,
    powerKwp: numeric(plant.potenciaKwp),
    generationToday: firstNumeric(
      plant.geracaoHojeKwh,
      plant.geracaoDiaKwh,
      plant.geracaoDiariaKwh,
      plant.geracaoHoje,
      plant.geracaoAtual,
    ),
    generationMonth: numeric(plant.geracaoMesKwh),
    expectedMonth: numeric(plant.expectativaMensalKwh),
    accumulatedGeneration: numeric(plant.geracaoAcumuladaKwh),
    updatedAt: plant.ultimaLeitura,
    updatedAtLabel: formatLastReading(plant.ultimaLeitura),
    manufacturer: normalizeText(plant.fabricante) || 'Não informado',
    source: normalizeText(plant.fonteLeitura) || 'sem dados',
    modules: numeric(plant.qtdPlacas),
  };
}

export function toPlantAlerts(plants: Plant[]): PlantAlert[] {
  return plants.flatMap((plant) => {
    const alerts: PlantAlert[] = [];

    if (!plant.monitoringActive || plant.status === 'offline') {
      alerts.push({
        id: `${plant.id}-offline`,
        plantId: plant.id,
        plantName: plant.name,
        city: plant.city,
        category: 'plantOffline',
        severity: 'danger',
        title: 'Usina sem comunicação',
        description: `A unidade está ${plant.monitoringActive ? 'offline' : 'com monitoramento inativo'} e precisa de verificação.`,
        timestampLabel: plant.updatedAtLabel,
      });
    }

    if (plant.hasAlert || plant.status === 'attention') {
      alerts.push({
        id: `${plant.id}-attention`,
        plantId: plant.id,
        plantName: plant.name,
        city: plant.city,
        category: 'lowGeneration',
        severity: 'warning',
        title: 'Atenção no monitoramento',
        description: 'O backend sinalizou alerta para esta usina. Confira geração, comunicação e última leitura.',
        timestampLabel: plant.updatedAtLabel,
      });
    }

    return alerts;
  });
}

export function toWeeklyGeneration(response: PlantHistoryResponse): WeeklyGeneration {
  const values = response.historico.semana.map(numeric);
  const receivedLabels = response.historico.semanaLabels;
  const labels = values.map((_, index) => receivedLabels[index] || String(index + 1));
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    values,
    labels,
    total,
    average: values.length ? total / values.length : 0,
    source: response.fonte,
    updatedAt: response.historico.ultimaLeitura,
  };
}

function hourlyLabels(length: number) {
  return Array.from({ length }, (_, index) => `${String(index).padStart(2, '0')}h`);
}

function selectDayHistory(response: PlantHistoryResponse, targetDate?: string) {
  const days = response.historico.diasHorarios;
  if (!days.length) return undefined;
  if (targetDate) {
    const exactDay = days.find((day) => day.data === targetDate);
    if (exactDay) return exactDay;
  }

  return days.find((day) => day.label.toLowerCase() === 'hoje') ?? days[days.length - 1];
}

function dayHistoryTotal(response: PlantHistoryResponse, values: number[], targetDate?: string) {
  const day = selectDayHistory(response, targetDate);
  if (typeof day?.total === 'number' && Number.isFinite(day.total)) return day.total;
  return values.reduce((sum, value) => sum + value, 0);
}

export function toGenerationHistory(response: PlantHistoryResponse, period: HistoryPeriod, targetDate?: string): WeeklyGeneration {
  const customValues = response.historico.custom.map(numeric);
  const hasCustomRange = customValues.length > 0;

  let values: number[];
  let labels: string[];

  if (period === 'day') {
    const day = selectDayHistory(response, targetDate);
    const dayValues = day?.horas?.length ? day.horas : response.historico.dia;
    values = (dayValues.length ? dayValues : customValues).map(numeric);
    labels = dayValues.length
      ? hourlyLabels(values.length)
      : values.map((_, index) => response.historico.customLabels[index] || String(index + 1));
  } else if (hasCustomRange) {
    values = customValues;
    labels = values.map((_, index) => response.historico.customLabels[index] || String(index + 1));
  } else if (period === 'month') {
    values = response.historico.mes.map(numeric);
    labels = values.map((_, index) => response.historico.mesLabels[index] || String(index + 1));
  } else if (period === 'year') {
    values = response.historico.ano.map(numeric);
    labels = values.map((_, index) => response.historico.anoLabels[index] || String(index + 1));
  } else {
    values = response.historico.semana.map(numeric);
    labels = values.map((_, index) => response.historico.semanaLabels[index] || String(index + 1));
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const displayTotal = period === 'day' ? dayHistoryTotal(response, values, targetDate) : total;

  return {
    values,
    labels,
    total: displayTotal,
    average: values.length ? displayTotal / values.length : 0,
    source: response.fonte,
    updatedAt: response.historico.ultimaLeitura,
  };
}

export function generationPercentage(actual: number, expected: number) {
  if (expected <= 0) return null;
  return Math.max(0, Math.round((actual / expected) * 100));
}

export function statusLabel(status: PlantStatus) {
  if (status === 'online') return 'Online';
  if (status === 'attention') return 'Atenção';
  return 'Offline';
}
