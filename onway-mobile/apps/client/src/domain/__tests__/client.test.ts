import {
  forecastPercentage,
  forecastSummary,
  formatLastReading,
  generationPercentage,
  statusLabel,
  toGenerationHistory,
  toPlant,
  type Plant,
} from '@/domain/client';
import type { ApiPlant, PlantHistoryResponse } from '@/services/mobile-api';

const NOW = new Date('2026-08-19T12:00:00.000Z');

function apiPlant(overrides: Partial<ApiPlant> = {}): ApiPlant {
  return {
    id: 'u1',
    nome: ' Usina Alpha ',
    cidade: 'Goiânia',
    fabricante: null,
    status: 'Normal',
    temAlerta: false,
    monitoramentoAtivo: true,
    potenciaKwp: 12.5,
    potenciaPlacaKwp: null,
    qtdPlacas: 20,
    geracaoAtual: 3,
    geracaoAcumuladaKwh: 100,
    geracaoMesKwh: 50,
    expectativaMensalKwh: 60,
    expectativaMesAteHojeKwh: 40,
    fonteExpectativa: 'historico',
    expectativaAnualKwh: 700,
    ultimaLeitura: '2026-08-19T11:00:00.000Z',
    fonteLeitura: 'growatt',
    ...overrides,
  };
}

function plant(overrides: Partial<Plant> = {}): Plant {
  return {
    ...toPlant(apiPlant()),
    ...overrides,
  };
}

function history(overrides: Partial<PlantHistoryResponse['historico']> = {}): PlantHistoryResponse {
  return {
    historico: {
      dia: [],
      diasHorarios: [],
      semana: [1, 2, 3, 4, 5, 6, 7],
      semanaLabels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
      mes: [],
      mesLabels: [],
      ano: [],
      anoLabels: [],
      custom: [],
      customLabels: [],
      ultimaLeitura: '2026-08-19T11:00:00.000Z',
      ultimaFonte: 'growatt',
      ...overrides,
    },
    fonte: 'growatt',
    computedAt: '2026-08-19T11:05:00.000Z',
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('toPlant', () => {
  it('normaliza textos e usa fallbacks para campos vazios', () => {
    const result = toPlant(apiPlant({ nome: '  ', cidade: null, fabricante: null, fonteLeitura: null }));
    expect(result.name).toBe('Usina sem nome');
    expect(result.city).toBe('Localização não informada');
    expect(result.manufacturer).toBe('Não informado');
    expect(result.source).toBe('sem dados');
  });

  it('mapeia monitoramento inativo para offline', () => {
    expect(toPlant(apiPlant({ monitoramentoAtivo: false })).status).toBe('offline');
  });

  it.each(['Offline', 'Inativo', 'sem dados'])('mapeia status "%s" para offline', (status) => {
    expect(toPlant(apiPlant({ status })).status).toBe('offline');
  });

  it.each(['Atenção', 'Falha no inversor', 'erro'])('mapeia status "%s" para attention', (status) => {
    expect(toPlant(apiPlant({ status })).status).toBe('attention');
  });

  it('mapeia flag temAlerta para attention mesmo com status normal', () => {
    expect(toPlant(apiPlant({ temAlerta: true })).status).toBe('attention');
  });

  it('fallback legado: sem temAlerta, usa alerta=true para attention', () => {
    expect(toPlant(apiPlant({ temAlerta: undefined, alerta: true })).status).toBe('attention');
  });

  it('mapeia status saudável para online', () => {
    expect(toPlant(apiPlant()).status).toBe('online');
  });

  it('usa o primeiro campo numérico disponível para a geração de hoje', () => {
    expect(toPlant(apiPlant({ geracaoHojeKwh: 7 })).generationToday).toBe(7);
    expect(toPlant(apiPlant({ geracaoHojeKwh: null, geracaoDiaKwh: 5 })).generationToday).toBe(5);
    expect(toPlant(apiPlant()).generationToday).toBe(3); // cai em geracaoAtual
    expect(toPlant(apiPlant({ geracaoAtual: null })).generationToday).toBe(0);
  });

  it('mapeia a expectativa: meta do mês, esperado até hoje e fonte', () => {
    const result = toPlant(apiPlant());
    expect(result.expectedMonth).toBe(60); // mês cheio (meta)
    expect(result.expectedMonthToDate).toBe(40); // denominador do %
    expect(result.forecastSource).toBe('historico');
  });

  it('usina sem histórico: kWh caem para 0 e a fonte vira sem_historico', () => {
    const result = toPlant(apiPlant({
      expectativaMensalKwh: null,
      expectativaMesAteHojeKwh: null,
      fonteExpectativa: 'sem_historico',
    }));
    expect(result.expectedMonthToDate).toBe(0);
    expect(result.forecastSource).toBe('sem_historico');
  });

  it('resposta pré-#40 (campos ausentes): fonte vira unknown, sem quebrar', () => {
    const result = toPlant(apiPlant({
      expectativaMesAteHojeKwh: undefined,
      fonteExpectativa: undefined,
    }));
    expect(result.expectedMonthToDate).toBe(0);
    expect(result.forecastSource).toBe('unknown');
  });
});

describe('previsão (% e rótulo)', () => {
  it('usa o esperado-até-hoje como denominador, não a meta do mês cheio', () => {
    // geração 50, até-hoje 40 → 125%; se usasse a meta (60) daria 83%.
    expect(forecastPercentage(plant())).toBe(125);
  });

  it('resume com % quando há expectativa viva', () => {
    expect(forecastSummary(plant())).toBe('125% da previsão');
  });

  it('resume "Sem histórico ainda" quando a usina não tem série', () => {
    expect(forecastSummary(plant({ expectedMonthToDate: 0, forecastSource: 'sem_historico' }))).toBe('Sem histórico ainda');
  });

  it('resume "Sem previsão cadastrada" no fallback/pré-deploy', () => {
    expect(forecastSummary(plant({ expectedMonthToDate: 0, forecastSource: 'unknown' }))).toBe('Sem previsão cadastrada');
  });
});

describe('toGenerationHistory', () => {
  it('semana: usa a série semanal com labels recebidos', () => {
    const result = toGenerationHistory(history(), 'week');
    expect(result.values).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.labels[0]).toBe('S');
    expect(result.total).toBe(28);
    expect(result.average).toBe(4);
  });

  it('dia: usa as horas do dia pedido com labels horários e o total do dia', () => {
    const response = history({
      diasHorarios: [
        { data: '2026-08-18', label: 'Ontem', total: 9, horas: [4, 5] },
        { data: '2026-08-19', label: 'Hoje', total: 10.5, horas: [0, 1, 2, 3] },
      ],
    });
    const result = toGenerationHistory(response, 'day', '2026-08-19');
    expect(result.values).toEqual([0, 1, 2, 3]);
    expect(result.labels).toEqual(['00h', '01h', '02h', '03h']);
    expect(result.total).toBe(10.5);
  });

  it('dia: sem data alvo, prefere o dia rotulado "hoje"', () => {
    const response = history({
      diasHorarios: [
        { data: '2026-08-18', label: 'Ontem', total: 9, horas: [4, 5] },
        { data: '2026-08-19', label: 'Hoje', total: 6, horas: [1, 2] },
      ],
    });
    expect(toGenerationHistory(response, 'day').values).toEqual([1, 2]);
  });

  it('ano: usa a série anual quando preenchida', () => {
    const ano = [10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = toGenerationHistory(history({ ano, anoLabels: ['Jan'] }), 'year');
    expect(result.values).toEqual(ano);
    expect(result.labels[0]).toBe('Jan');
  });

  it('ano: a série do range (custom) tem precedência sobre a série anual default', () => {
    // Produção: `ano` é sempre o ano corrente (insensível ao range); o ano pedido
    // chega em `custom` (diária, a partir de 1º/jan). Deve agregar `custom` em 12
    // meses reais, mesmo com `ano` preenchido — senão todo ano exibiria o corrente.
    const response = history({
      ano: new Array(12).fill(99),
      custom: [1, 2, 3],
      customLabels: ['01/01', '02/01', '03/01'],
    });
    const result = toGenerationHistory(response, 'year', '2026-01-01');
    expect(result.values).toHaveLength(12);
    expect(result.values[0]).toBe(6); // jan = 1+2+3 (primeiros dias)
    expect(result.total).toBe(6); // não 99*12 da série `ano`
  });

  it('ano: navegar para um ano sem geração mostra zeros, não os dados do ano corrente', () => {
    // Regressão do bug: `ano` traz o ano corrente com dados; o ano pedido (custom)
    // vem zerado. Antes, o mapper exibia `ano` e "os dados permaneciam os mesmos".
    const response = history({
      ano: [10, 20, 30, 40, 0, 0, 0, 0, 0, 0, 0, 0],
      anoLabels: ['jan/26'],
      custom: new Array(365).fill(0),
      customLabels: ['01/01'],
    });
    const result = toGenerationHistory(response, 'year', '2025-01-01');
    expect(result.values).toEqual(new Array(12).fill(0));
    expect(result.total).toBe(0);
  });

  it('mês: série custom tem precedência quando presente', () => {
    const response = history({ custom: [5, 6], customLabels: ['a', 'b'], mes: [9, 9, 9] });
    const result = toGenerationHistory(response, 'month');
    expect(result.values).toEqual([5, 6]);
    expect(result.labels).toEqual(['a', 'b']);
  });
});

describe('generationPercentage', () => {
  it('calcula o percentual arredondado', () => {
    expect(generationPercentage(30, 60)).toBe(50);
  });

  it('retorna null sem expectativa cadastrada', () => {
    expect(generationPercentage(10, 0)).toBeNull();
  });

  it('não retorna percentual negativo', () => {
    expect(generationPercentage(-5, 100)).toBe(0);
  });
});

describe('formatLastReading', () => {
  it('trata leitura ausente e data inválida', () => {
    expect(formatLastReading(null)).toBe('sem leitura');
    expect(formatLastReading('not-a-date')).toBe('data indisponível');
  });

  it('formata janelas relativas de minutos, horas e dias', () => {
    expect(formatLastReading('2026-08-19T11:59:40.000Z')).toBe('agora');
    expect(formatLastReading('2026-08-19T11:15:00.000Z')).toBe('há 45 min');
    expect(formatLastReading('2026-08-19T04:00:00.000Z')).toBe('há 8 h');
    expect(formatLastReading('2026-08-17T12:00:00.000Z')).toBe('há 2 d');
  });

  it('usa data absoluta a partir de 7 dias', () => {
    expect(formatLastReading('2026-08-01T12:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{2}/);
  });
});

describe('statusLabel', () => {
  it('traduz os três status', () => {
    expect(statusLabel('online')).toBe('Online');
    expect(statusLabel('attention')).toBe('Atenção');
    expect(statusLabel('offline')).toBe('Offline');
  });
});
