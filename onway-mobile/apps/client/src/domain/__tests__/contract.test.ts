import {
  formatCurrency,
  invoiceReferenceLabel,
  monthKeyFromRaw,
  toContract,
  toInvoice,
  toInvoiceSummary,
  toOcrExtraction,
} from '@/domain/contract';
import type { ApiContract, ApiInvoice, ApiOcrResponse, InvoicesResponse } from '@/services/mobile-api';

// Intl usa espaços não separáveis (NBSP/NNBSP) na moeda; normaliza para comparar.
function plainSpaces(value: string) {
  return value.replace(/[  ]/g, ' ');
}

function apiInvoice(overrides: Partial<ApiInvoice> = {}): ApiInvoice {
  return {
    id: 'f1',
    usinaId: 'u1',
    usinaNome: 'Usina Alpha',
    mesAno: '2026-03',
    concessionaria: 'Neoenergia',
    consumoKwh: 320,
    injetadoKwh: 410,
    precoUnitario: 0.95,
    valorPago: 180.4,
    valorSemSolar: 610.9,
    economiaReais: 430.5,
    status: 'pago',
    origem: 'ocr',
    temAnexo: true,
    criadaEm: '2026-04-02T10:00:00.000Z',
    ...overrides,
  };
}

function apiContract(overrides: Partial<ApiContract> = {}): ApiContract {
  return {
    id: 'c1',
    titulo: 'Contrato Alpha',
    contratoTipo: 'pos_venda',
    planoNome: 'Plano Ouro',
    dataAtivacao: '2025-06-15T00:00:00.000Z',
    valorMensal: 250,
    kwp: 12.5,
    nivelCobertura: 'completa',
    servicosInclusos: null,
    beneficios: null,
    servicosContratados: [
      {
        descricao: 'Visita técnica',
        unidade: 'visita',
        quantidadePrevista: 2,
        quantidadeConsumida: 1,
        recorrente: false,
        beneficio: false,
      },
      {
        descricao: 'Monitoramento',
        unidade: null,
        quantidadePrevista: null,
        quantidadeConsumida: null,
        recorrente: true,
        beneficio: true,
      },
    ],
    usinas: [{ id: 'u1', nome: 'Usina Alpha', cidade: 'Goiânia' }],
    ...overrides,
  };
}

describe('invoiceReferenceLabel', () => {
  it('aceita o formato ISO YYYY-MM (origem app)', () => {
    expect(invoiceReferenceLabel('2026-03')).toBe('Março De 2026');
  });

  it('aceita o formato MM/YYYY (origem ocr)', () => {
    expect(invoiceReferenceLabel('03/2026')).toBe('Março De 2026');
  });

  it('aceita ano com dois dígitos', () => {
    expect(invoiceReferenceLabel('03/26')).toBe('Março De 2026');
  });

  it('devolve o valor cru quando o mês é inválido', () => {
    expect(invoiceReferenceLabel('13/2026')).toBe('13/2026');
  });

  it('usa fallback para valor vazio', () => {
    expect(invoiceReferenceLabel('')).toBe('Fatura');
    expect(invoiceReferenceLabel(null)).toBe('Fatura');
  });
});

describe('formatCurrency', () => {
  it('formata em BRL', () => {
    expect(plainSpaces(formatCurrency(1234.5))).toBe('R$ 1.234,50');
  });

  it('usa travessão para valores ausentes', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(Number.NaN)).toBe('—');
  });
});

describe('toInvoice', () => {
  it('mapeia status conhecidos com tom visual', () => {
    const paid = toInvoice(apiInvoice({ status: 'pago' }));
    expect(paid.statusLabel).toBe('Paga');
    expect(paid.statusTone).toBe('success');

    const pending = toInvoice(apiInvoice({ status: 'pendente' }));
    expect(pending.statusLabel).toBe('Pendente');
    expect(pending.statusTone).toBe('warning');
  });

  it('titleiza status desconhecido com tom neutro', () => {
    const unknown = toInvoice(apiInvoice({ status: 'em_analise' }));
    expect(unknown.statusLabel).toBe('Em Analise');
    expect(unknown.statusTone).toBe('neutral');
  });

  it('traduz a origem da fatura', () => {
    expect(toInvoice(apiInvoice({ origem: 'ocr' })).originLabel).toBe('Lida do PDF');
    expect(toInvoice(apiInvoice({ origem: 'app' })).originLabel).toBe('Inserida no app');
  });

  it('não formata economia ausente', () => {
    const invoice = toInvoice(apiInvoice({ economiaReais: null }));
    expect(invoice.savings).toBeNull();
    expect(invoice.savingsLabel).toBeNull();
  });
});

describe('toInvoiceSummary', () => {
  function response(overrides: Partial<InvoicesResponse> = {}): InvoicesResponse {
    return {
      data: [apiInvoice(), apiInvoice({ id: 'f2', mesAno: '2026-04' })],
      resumo: { quantidade: 5, economiaAcumuladaReais: 861 },
      paginacao: { page: 1, limit: 2, total: 5 },
      ...overrides,
    };
  }

  it('sinaliza que há mais páginas quando o total excede a lista', () => {
    const summary = toInvoiceSummary(response());
    expect(summary.invoices).toHaveLength(2);
    expect(summary.count).toBe(5);
    expect(summary.hasMore).toBe(true);
    expect(plainSpaces(summary.totalSavingsLabel)).toBe('R$ 861,00');
  });

  it('não sinaliza mais páginas quando a lista está completa', () => {
    const summary = toInvoiceSummary(
      response({ resumo: { quantidade: 2, economiaAcumuladaReais: 861 }, paginacao: { page: 1, limit: 10, total: 2 } }),
    );
    expect(summary.hasMore).toBe(false);
  });
});

describe('monthKeyFromRaw', () => {
  it('mantém "YYYY-MM" e completa o zero do mês', () => {
    expect(monthKeyFromRaw('2026-05')).toBe('2026-05');
    expect(monthKeyFromRaw('2026-5')).toBe('2026-05');
  });

  it('converte "MM/YYYY" (formato do OCR) para "YYYY-MM"', () => {
    expect(monthKeyFromRaw('05/2026')).toBe('2026-05');
  });

  it('expande ano de dois dígitos', () => {
    expect(monthKeyFromRaw('05/26')).toBe('2026-05');
  });

  it('rejeita mês inválido ou entrada vazia', () => {
    expect(monthKeyFromRaw('13/2026')).toBeNull();
    expect(monthKeyFromRaw('')).toBeNull();
    expect(monthKeyFromRaw(null)).toBeNull();
  });
});

describe('toOcrExtraction', () => {
  // Estrutura real capturada da API no aceite A2 (POST .../faturas/ocr).
  function ocrResponse(overrides: Partial<ApiOcrResponse> = {}): ApiOcrResponse {
    return {
      campos: {
        mes_ano: '05/2026',
        consumo_kwh: 340,
        consumo_faturado_kwh: null,
        injetado_kwh: 415,
        preco_unitario: null,
        valor_pago: 192.5,
        concessionaria: 'NEOENERGIA',
        titular_nome: null,
        confianca: { mes_ano: 'alta', valor_pago: 'alta' },
      },
      avisos: [],
      titularidade: { status: 'indeterminado', motivo: 'Não foi possível ler o titular.' },
      ocr_ref: 'ref-123',
      ...overrides,
    };
  }

  it('extrai os campos aninhados em snake_case e normaliza o mês', () => {
    const result = toOcrExtraction(ocrResponse());
    expect(result.saved).toBe(false);
    expect(result.monthKey).toBe('2026-05');
    expect(result.consumoKwh).toBe(340);
    expect(result.injetadoKwh).toBe(415);
    expect(result.valorPago).toBe(192.5);
    expect(result.concessionaria).toBe('NEOENERGIA');
  });

  it('trata campos nulos sem quebrar (não vira 0)', () => {
    const result = toOcrExtraction(
      ocrResponse({ campos: { mes_ano: null, consumo_kwh: null, injetado_kwh: null, valor_pago: null, concessionaria: null } }),
    );
    expect(result.monthKey).toBeNull();
    expect(result.consumoKwh).toBeNull();
    expect(result.valorPago).toBeNull();
    expect(result.concessionaria).toBeNull();
  });

  it('sinaliza fatura já gravada quando vem id', () => {
    const result = toOcrExtraction({ id: 'fatura-99', campos: { mes_ano: '05/2026' } });
    expect(result.saved).toBe(true);
    expect(result.savedId).toBe('fatura-99');
  });

  it('coleta apenas avisos textuais não vazios', () => {
    const result = toOcrExtraction(ocrResponse({ avisos: ['Confira o valor.', '', 42, null] as unknown[] }));
    expect(result.warnings).toEqual(['Confira o valor.']);
  });

  it('não quebra com resposta vazia ou nula', () => {
    expect(toOcrExtraction(null).monthKey).toBeNull();
    expect(toOcrExtraction({}).consumoKwh).toBeNull();
  });
});

describe('toContract', () => {
  it('mapeia rótulos de tipo, cobertura e kwp', () => {
    const contract = toContract(apiContract());
    expect(contract.typeLabel).toBe('Pós-venda');
    expect(contract.coverageLabel).toBe('Completa');
    expect(contract.kwpLabel).toBe('12,5 kWp');
    expect(contract.activationDate).not.toBeNull();
    expect(contract.plantNames).toEqual(['Usina Alpha']);
  });

  it('titleiza tipo desconhecido e trata campos nulos', () => {
    const contract = toContract(
      apiContract({ contratoTipo: 'custom_tipo', kwp: null, valorMensal: null, dataAtivacao: null }),
    );
    expect(contract.typeLabel).toBe('Custom Tipo');
    expect(contract.kwpLabel).toBe('—');
    expect(contract.monthlyValueLabel).toBe('—');
    expect(contract.activationLabel).toBe('—');
    expect(contract.activationDate).toBeNull();
  });

  it('monta o rótulo de uso dos serviços', () => {
    const contract = toContract(apiContract());
    expect(contract.services[0].usageLabel).toBe('1/2 visitas');
    expect(contract.services[1].usageLabel).toBe('Recorrente');
    expect(contract.services[1].isBenefit).toBe(true);
  });
});
