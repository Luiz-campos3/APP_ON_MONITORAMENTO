import { runCheckup } from '@/domain/checkup';
import type { Plant } from '@/domain/client';

const NOW = new Date('2026-08-19T12:00:00.000Z');

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

function itemById(report: ReturnType<typeof runCheckup>, id: string) {
  const item = report.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`item ${id} ausente do checkup`);
  return item;
}

describe('checagem de comunicação', () => {
  it('ok com leitura recente', () => {
    expect(itemById(runCheckup(plant()), 'comunicacao').status).toBe('ok');
  });

  it('atenção quando a leitura passa do intervalo esperado (>3h)', () => {
    const report = runCheckup(plant({ updatedAt: '2026-08-19T07:00:00.000Z' }));
    expect(itemById(report, 'comunicacao').status).toBe('attention');
  });

  it('crítico sem comunicação há mais de 24h', () => {
    const report = runCheckup(plant({ updatedAt: '2026-08-18T06:00:00.000Z' }));
    expect(itemById(report, 'comunicacao').status).toBe('critical');
  });

  it('atenção sem registro de leitura', () => {
    const report = runCheckup(plant({ updatedAt: null }));
    expect(itemById(report, 'comunicacao').status).toBe('attention');
  });

  it('crítico com monitoramento inativo, mesmo com leitura recente', () => {
    const report = runCheckup(plant({ monitoringActive: false }));
    expect(itemById(report, 'comunicacao').status).toBe('critical');
    expect(itemById(report, 'comunicacao').detail).toContain('Monitoramento inativo');
  });
});

describe('checagem de prognóstico', () => {
  it('ok a partir de 90% do prognóstico', () => {
    expect(itemById(runCheckup(plant()), 'prognostico').status).toBe('ok');
  });

  it('atenção entre 70% e 89%', () => {
    const report = runCheckup(plant({ generationMonth: 750 }));
    expect(itemById(report, 'prognostico').status).toBe('attention');
  });

  it('crítico abaixo de 70%', () => {
    const report = runCheckup(plant({ generationMonth: 500 }));
    expect(itemById(report, 'prognostico').status).toBe('critical');
  });

  it('informativo sem prognóstico cadastrado', () => {
    const item = itemById(runCheckup(plant({ expectedMonthToDate: 0, forecastSource: 'unknown' })), 'prognostico');
    expect(item.status).toBe('info');
    expect(item.valueLabel).toBe('—');
    expect(item.detail).toContain('não disponível');
  });

  it('informativo com detalhe próprio quando a usina não tem histórico', () => {
    const item = itemById(runCheckup(plant({ expectedMonthToDate: 0, forecastSource: 'sem_historico' })), 'prognostico');
    expect(item.status).toBe('info');
    expect(item.detail).toContain('sem histórico');
  });

  it('compara com o esperado-até-hoje, não com a meta do mês cheio', () => {
    // até-hoje 800, geração 750 → 93% (ok); com a meta cheia (1000) seria 75%.
    const item = itemById(runCheckup(plant({ generationMonth: 750, expectedMonthToDate: 800 })), 'prognostico');
    expect(item.status).toBe('ok');
    expect(item.detail).toContain('previsto até hoje');
  });
});

describe('score e resumo', () => {
  it('tudo certo quando tudo ok e completo', () => {
    const report = runCheckup(plant());
    expect(report.score).toBe(100);
    expect(report.headline).toBe('Tudo certo nas verificações');
    expect(report.issues).toBe(0);
    expect(report.incomplete).toBe(false);
  });

  it('penaliza atenção sem derrubar o score para crítico', () => {
    const report = runCheckup(plant({ generationMonth: 750 }));
    expect(report.score).toBe(88);
    expect(report.headline).toBe('Bom, com pontos de atenção');
    expect(report.issues).toBe(1);
  });

  it('acumula penalidades de itens críticos', () => {
    const report = runCheckup(plant({ monitoringActive: false, generationMonth: 500 }));
    expect(report.score).toBe(44);
    expect(report.headline).toBe('Verificação técnica recomendada');
    expect(report.issues).toBe(2);
  });

  it('só usa checagens reais (comunicação e prognóstico)', () => {
    const report = runCheckup(plant());
    expect(report.items).toHaveLength(2);
    expect(report.items.every((item) => item.real)).toBe(true);
  });

  it('verificação parcial quando o prognóstico não foi avaliado', () => {
    const report = runCheckup(plant({ expectedMonthToDate: 0, forecastSource: 'sem_historico' }));
    expect(report.incomplete).toBe(true);
    expect(report.assessed).toBe(1);
    expect(report.total).toBe(2);
    expect(report.headline).toBe('Verificação parcial');
    expect(report.score).toBe(100);
  });

  it('tudo certo quando todas as dimensões foram avaliadas sem problemas', () => {
    const report = runCheckup(plant());
    expect(report.incomplete).toBe(false);
    expect(report.headline).toBe('Tudo certo nas verificações');
  });
});
