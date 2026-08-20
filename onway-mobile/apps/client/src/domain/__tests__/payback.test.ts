import type { Plant } from '@/domain/client';
import { computePayback } from '@/domain/payback';

const NOW = new Date('2026-08-19T12:00:00.000Z');

// Premissas atuais do módulo (mockadas até o input I5): R$ 4.200/kWp e R$ 0,98/kWh.
function plant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Usina Teste',
    city: 'Brasília',
    status: 'online',
    hasAlert: false,
    monitoringActive: true,
    powerKwp: 10,
    generationToday: 12,
    generationMonth: 950,
    expectedMonth: 1000,
    expectedMonthToDate: 1000,
    forecastSource: 'historico',
    accumulatedGeneration: 10_000,
    updatedAt: '2026-08-19T11:00:00.000Z',
    updatedAtLabel: 'há 1 h',
    manufacturer: 'Growatt',
    source: 'growatt',
    modules: 20,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('computePayback', () => {
  it('calcula investimento, economia e projeção de quitação', () => {
    const payback = computePayback(plant());
    expect(payback.investment).toBe(42_000);
    expect(payback.accumulatedSavings).toBeCloseTo(9_800);
    expect(payback.monthlySavings).toBeCloseTo(931);
    expect(payback.percentPaid).toBeCloseTo(23.33, 1);
    expect(payback.isPaidOff).toBe(false);
    expect(payback.remainingMonths).toBe(35);
    expect(payback.projectedDateLabel).not.toBeNull();
  });

  it('marca sistema quitado e calcula o retorno excedente', () => {
    const payback = computePayback(plant({ accumulatedGeneration: 50_000 }));
    expect(payback.isPaidOff).toBe(true);
    expect(payback.percentPaid).toBe(100);
    expect(payback.returnAmount).toBeCloseTo(7_000);
    expect(payback.remainingMonths).toBeNull();
  });

  it('não projeta quitação sem economia mensal', () => {
    const payback = computePayback(plant({ generationMonth: 0 }));
    expect(payback.remainingMonths).toBeNull();
    expect(payback.projectedDateLabel).toBeNull();
  });

  it('zera com potência desconhecida em vez de dividir por zero', () => {
    const payback = computePayback(plant({ powerKwp: 0 }));
    expect(payback.investment).toBe(0);
    expect(payback.percentPaid).toBe(0);
    expect(payback.isPaidOff).toBe(false);
  });
});
