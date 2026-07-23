import type {
  ApiContract,
  ApiContractService,
  ApiInvoice,
  InvoicesResponse,
} from '@/services/mobile-api';

export type ContractService = {
  id: string;
  label: string;
  unit: string;
  planned: number;
  consumed: number;
  recurring: boolean;
  isBenefit: boolean;
  usageLabel: string;
};

export type Contract = {
  id: string;
  title: string;
  planName: string;
  typeLabel: string;
  coverageLabel: string | null;
  monthlyValue: number | null;
  monthlyValueLabel: string;
  kwp: number | null;
  kwpLabel: string;
  activationLabel: string;
  activationDate: Date | null;
  services: ContractService[];
  plantNames: string[];
};

export type InvoiceTone = 'success' | 'warning' | 'neutral';

export type Invoice = {
  id: string;
  plantId: string | null;
  plantName: string | null;
  monthKey: string;
  referenceLabel: string;
  utility: string | null;
  consumptionKwh: number | null;
  injectedKwh: number | null;
  amountPaid: number | null;
  amountPaidLabel: string;
  amountWithoutSolar: number | null;
  amountWithoutSolarLabel: string | null;
  savings: number | null;
  savingsLabel: string | null;
  status: string;
  statusLabel: string;
  statusTone: InvoiceTone;
  origin: string;
  originLabel: string;
  hasAttachment: boolean;
  createdAtLabel: string;
};

export type InvoiceSummary = {
  invoices: Invoice[];
  count: number;
  totalSavings: number;
  totalSavingsLabel: string;
  hasMore: boolean;
};

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function optionalNumeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return currency.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function titleize(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  pos_venda: 'Pós-venda',
  pre_venda: 'Pré-venda',
  manutencao: 'Manutenção',
};

function contractTypeLabel(value: string | null | undefined) {
  const key = normalizeText(value).toLowerCase();
  if (!key) return 'Contrato';
  return CONTRACT_TYPE_LABELS[key] ?? titleize(key);
}

function serviceUsageLabel(service: ApiContractService, planned: number, consumed: number) {
  const unit = normalizeText(service.unidade);
  if (service.recorrente) return unit ? `Recorrente · ${unit}` : 'Recorrente';
  if (planned <= 0) return unit || 'Incluído';
  const unitSuffix = unit ? ` ${unit}${planned > 1 ? 's' : ''}` : '';
  return `${consumed}/${planned}${unitSuffix}`;
}

export function toContract(api: ApiContract): Contract {
  const services = (api.servicosContratados ?? []).map((service, index) => {
    const planned = numeric(service.quantidadePrevista);
    const consumed = numeric(service.quantidadeConsumida);
    return {
      id: `${api.id}-service-${index}`,
      label: normalizeText(service.descricao) || 'Serviço',
      unit: normalizeText(service.unidade),
      planned,
      consumed,
      recurring: Boolean(service.recorrente),
      isBenefit: Boolean(service.beneficio),
      usageLabel: serviceUsageLabel(service, planned, consumed),
    } satisfies ContractService;
  });

  const monthlyValue = optionalNumeric(api.valorMensal);
  const kwp = optionalNumeric(api.kwp);
  const coverage = normalizeText(api.nivelCobertura);

  return {
    id: api.id,
    title: normalizeText(api.titulo) || normalizeText(api.planoNome) || 'Contrato',
    planName: normalizeText(api.planoNome) || 'Plano não informado',
    typeLabel: contractTypeLabel(api.contratoTipo),
    coverageLabel: coverage ? titleize(coverage) : null,
    monthlyValue,
    monthlyValueLabel: formatCurrency(monthlyValue),
    kwp,
    kwpLabel: kwp === null ? '—' : `${kwp.toLocaleString('pt-BR')} kWp`,
    activationLabel: formatDate(api.dataAtivacao) ?? '—',
    activationDate: parseDate(api.dataAtivacao),
    services,
    plantNames: (api.usinas ?? []).map((plant) => normalizeText(plant.nome)).filter(Boolean),
  };
}

// Aceita "YYYY-MM" e "MM/YYYY" (ou "MM/YY") e devolve "Mês de Ano".
export function invoiceReferenceLabel(mesAno: string | null | undefined) {
  const raw = normalizeText(mesAno);
  if (!raw) return 'Fatura';

  let year: number | null = null;
  let month: number | null = null;
  const iso = /^(\d{4})-(\d{1,2})$/.exec(raw);
  const slash = /^(\d{1,2})\/(\d{2,4})$/.exec(raw);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
  } else if (slash) {
    month = Number(slash[1]);
    year = Number(slash[2]) < 100 ? 2000 + Number(slash[2]) : Number(slash[2]);
  }

  if (year && month && month >= 1 && month <= 12) {
    const date = new Date(year, month - 1, 1);
    if (Number.isFinite(date.getTime())) {
      return titleize(date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    }
  }
  return raw;
}

const INVOICE_STATUS: Record<string, { label: string; tone: InvoiceTone }> = {
  pago: { label: 'Paga', tone: 'success' },
  pendente: { label: 'Pendente', tone: 'warning' },
  processando: { label: 'Processando', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

function invoiceStatus(status: string | null | undefined) {
  const key = normalizeText(status).toLowerCase();
  return INVOICE_STATUS[key] ?? { label: key ? titleize(key) : 'Registrada', tone: 'neutral' as InvoiceTone };
}

function originLabel(origem: string | null | undefined) {
  const key = normalizeText(origem).toLowerCase();
  if (key === 'ocr') return 'Lida do PDF';
  if (key === 'app') return 'Inserida no app';
  if (key === 'portal') return 'Portal';
  return key ? titleize(key) : '';
}

export function toInvoice(api: ApiInvoice): Invoice {
  const amountPaid = optionalNumeric(api.valorPago);
  const withoutSolar = optionalNumeric(api.valorSemSolar);
  const savings = optionalNumeric(api.economiaReais);
  const status = invoiceStatus(api.status);

  return {
    id: normalizeText(api.id),
    plantId: normalizeText(api.usinaId) || null,
    plantName: normalizeText(api.usinaNome) || null,
    monthKey: normalizeText(api.mesAno),
    referenceLabel: invoiceReferenceLabel(api.mesAno),
    utility: normalizeText(api.concessionaria) || null,
    consumptionKwh: optionalNumeric(api.consumoKwh),
    injectedKwh: optionalNumeric(api.injetadoKwh),
    amountPaid,
    amountPaidLabel: formatCurrency(amountPaid),
    amountWithoutSolar: withoutSolar,
    amountWithoutSolarLabel: withoutSolar === null ? null : formatCurrency(withoutSolar),
    savings,
    savingsLabel: savings === null ? null : formatCurrency(savings),
    status: normalizeText(api.status),
    statusLabel: status.label,
    statusTone: status.tone,
    origin: normalizeText(api.origem),
    originLabel: originLabel(api.origem),
    hasAttachment: Boolean(api.temAnexo),
    createdAtLabel: formatDate(api.criadaEm?.slice(0, 10)) ?? '—',
  };
}

export function toInvoiceSummary(response: InvoicesResponse): InvoiceSummary {
  const invoices = (response.data ?? []).map((item) => toInvoice(item));
  const totalSavings = numeric(response.resumo?.economiaAcumuladaReais);
  const total = numeric(response.paginacao?.total);

  return {
    invoices,
    count: numeric(response.resumo?.quantidade) || total,
    totalSavings,
    totalSavingsLabel: formatCurrency(totalSavings),
    hasMore: total > invoices.length,
  };
}
