import type { ApiPlant, PlantHistoryResponse } from '@/services/mobile-api';

export type PlantStatus = 'online' | 'attention' | 'critical' | 'offline';

/**
 * Origem da expectativa de geração (issue #36 / PR #40). `historico` = derivada
 * do histórico da própria usina; `sem_historico` = usina sem série suficiente
 * (kWh vêm null, degradação honesta); `unknown` = campo ausente na resposta
 * (estado pré-deploy do #40 — mantém o comportamento antigo).
 */
export type ForecastSource = 'historico' | 'sem_historico' | 'unknown';

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
  /** Meta do mês cheio (expectativaMensalKwh) — para exibir como "meta do mês". */
  expectedMonth: number;
  /**
   * Esperado acumulado até ONTEM (expectativaMesAteHojeKwh) — é o denominador do
   * "% da previsão". A janela termina ontem de propósito: comparar geração
   * mês-até-hoje com a meta do mês cheio faria toda usina parecer ruim no início
   * do mês.
   */
  expectedMonthToDate: number;
  forecastSource: ForecastSource;
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

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function firstNumeric(...values: (number | null | undefined)[]) {
  return numeric(values.find((value) => typeof value === 'number' && Number.isFinite(value)));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

function toForecastSource(value: string | null | undefined): ForecastSource {
  return value === 'historico' || value === 'sem_historico' ? value : 'unknown';
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
    status === 'error'
    || status.includes('erro')
    || status.includes('falha')
    || status.includes('critic')
  ) return 'critical';

  if (
    status === 'warning'
    || status.includes('warn')
    || status.includes('alert')
    || status.includes('atenc')
  ) return 'attention';

  const flagged = plant.temAlerta ?? plant.alerta ?? false;
  if (flagged) return 'attention'; // temAlerta true sem severidade reconhecível → atenção conservadora

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
    hasAlert: plant.temAlerta ?? plant.alerta ?? false,
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
    expectedMonthToDate: numeric(plant.expectativaMesAteHojeKwh),
    forecastSource: toForecastSource(plant.fonteExpectativa),
    accumulatedGeneration: numeric(plant.geracaoAcumuladaKwh),
    updatedAt: plant.ultimaLeitura,
    updatedAtLabel: formatLastReading(plant.ultimaLeitura),
    manufacturer: normalizeText(plant.fabricante) || 'Não informado',
    source: normalizeText(plant.fonteLeitura) || 'sem dados',
    modules: numeric(plant.qtdPlacas),
  };
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

/**
 * Agrega a série diária (`custom`) em 12 totais mensais reais. Usado no modo Ano
 * quando a série `ano` não vem preenchida — soma valores reais por mês, sem
 * inventar nada. `startParam` (YYYY-MM-DD) indica o 1º de janeiro do ano.
 */
function monthlyFromDaily(daily: number[], startParam?: string): number[] {
  const months = new Array<number>(12).fill(0);
  if (!daily.length) return months;
  const year = startParam ? Number.parseInt(startParam.slice(0, 4), 10) : new Date().getFullYear();
  daily.forEach((value, index) => {
    const date = new Date(year, 0, 1 + index);
    if (date.getFullYear() === year) months[date.getMonth()] += numeric(value);
  });
  return months;
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
  } else if (period === 'year') {
    // O modo Ano mostra sempre 12 meses. A navegação de ano envia inicio/fim e o
    // backend devolve a série ESPECÍFICA daquele ano em `custom` (diária, a partir
    // de 1º/jan), que agregamos em 12 totais mensais reais. A série `ano` é a visão
    // DEFAULT do ano corrente e é INSENSÍVEL ao range (validado em produção:
    // idêntica para 2024/2025/2026), por isso só serve de fallback quando não há
    // range ativo. Sem esse cuidado, todo ano navegado exibiria o ano corrente.
    const yearly = response.historico.ano.map(numeric);
    values = hasCustomRange ? monthlyFromDaily(customValues, targetDate) : yearly;
    labels = values.map((_, index) => response.historico.anoLabels[index] || String(index + 1));
  } else if (hasCustomRange) {
    values = customValues;
    labels = values.map((_, index) => response.historico.customLabels[index] || String(index + 1));
  } else if (period === 'month') {
    values = response.historico.mes.map(numeric);
    labels = values.map((_, index) => response.historico.mesLabels[index] || String(index + 1));
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

/**
 * "% da previsão": geração do mês-até-hoje sobre o esperado-até-ontem. Retorna
 * null quando não há expectativa viva (usina sem histórico ou resposta pré-#40).
 */
export function forecastPercentage(plant: Plant) {
  return generationPercentage(plant.generationMonth, plant.expectedMonthToDate);
}

/**
 * Rótulo honesto do "% da previsão" para a UI. Distingue "sem histórico ainda"
 * (usina nova, sem série) de "Sem previsão cadastrada" (fallback/pré-deploy).
 */
export function forecastSummary(plant: Plant) {
  const pct = forecastPercentage(plant);
  if (pct !== null) return `${pct}% da previsão`;
  if (plant.forecastSource === 'sem_historico') return 'Sem histórico ainda';
  return 'Sem previsão cadastrada';
}

export function statusLabel(status: PlantStatus) {
  if (status === 'online') return 'Online';
  if (status === 'attention') return 'Atenção';
  if (status === 'critical') return 'Crítico';
  return 'Offline';
}
