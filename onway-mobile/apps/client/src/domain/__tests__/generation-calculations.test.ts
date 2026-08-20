import {
  addDays,
  addMonths,
  clampWindowStart,
  computeStats,
  daysInMonth,
  defaultWindowStart,
  formatDateParam,
  niceScale,
  sameDay,
  visibleScaleMax,
  windowSizeFor,
} from '@/domain/generation-calculations';

describe('utilitários de data', () => {
  it('formata parâmetro de data com zero à esquerda', () => {
    expect(formatDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('compara dias ignorando a hora', () => {
    expect(sameDay(new Date(2026, 7, 19, 8), new Date(2026, 7, 19, 22))).toBe(true);
    expect(sameDay(new Date(2026, 7, 19), new Date(2026, 7, 20))).toBe(false);
  });

  it('soma dias e meses sem mutar a data original', () => {
    const base = new Date(2026, 0, 31);
    expect(formatDateParam(addDays(base, 1))).toBe('2026-02-01');
    expect(formatDateParam(addMonths(new Date(2026, 0, 15), 1))).toBe('2026-02-15');
    expect(formatDateParam(base)).toBe('2026-01-31');
  });

  it('calcula dias do mês inclusive em ano bissexto', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
  });
});

describe('computeStats', () => {
  it('encontra pico e índice nos valores reais', () => {
    const stats = computeStats([1, 5, 3], 9, 3);
    expect(stats.peakValue).toBe(5);
    expect(stats.peakIndex).toBe(1);
    expect(stats.total).toBe(9);
    expect(stats.average).toBe(3);
  });

  it('cai para índice 0 quando não há valores positivos', () => {
    expect(computeStats([0, 0], 0, 0).peakIndex).toBe(0);
  });
});

describe('escala do gráfico', () => {
  it('visibleScaleMax adiciona margem superior e evita divisão por zero', () => {
    expect(visibleScaleMax([10])).toBeCloseTo(11.8);
    expect(visibleScaleMax([0, 0])).toBe(1);
    expect(visibleScaleMax([])).toBe(1);
  });

  it('niceScale produz marcações redondas com margem', () => {
    const scale = niceScale(95, 3);
    expect(scale.max).toBe(150);
    expect(scale.ticks).toEqual([0, 50, 100, 150]);
  });

  it('niceScale trata máximos inválidos', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(Number.NaN)).toEqual({ max: 1, ticks: [0, 1] });
  });
});

describe('janela de navegação', () => {
  it('clampWindowStart limita aos extremos e trata NaN', () => {
    expect(clampWindowStart(-5, 7, 24)).toBe(0);
    expect(clampWindowStart(30, 7, 24)).toBe(17);
    expect(clampWindowStart(Number.NaN, 7, 24)).toBe(0);
  });

  it('windowSizeFor limita dia e mês a 7 e mostra tudo nos demais', () => {
    expect(windowSizeFor('day', 24)).toBe(7);
    expect(windowSizeFor('month', 31)).toBe(7);
    expect(windowSizeFor('week', 7)).toBe(7);
    expect(windowSizeFor('year', 12)).toBe(12);
  });

  it('defaultWindowStart centraliza o dia no pico e ancora o mês no dia atual', () => {
    const values = new Array(24).fill(1);
    expect(defaultWindowStart('day', values, 7, 0, 12)).toBe(9);
    expect(defaultWindowStart('month', new Array(31).fill(1), 7, 16, 0)).toBe(9);
    expect(defaultWindowStart('week', new Array(7).fill(1), 7, 0, 3)).toBe(0);
  });
});
