import type { Plant } from '@/domain/client';
import { formatCurrency } from '@/domain/contract';

// Premissas mockadas até o backend expor investimento e tarifa reais por usina.
const COST_PER_KWP = 4200; // R$ por kWp instalado
const TARIFF_PER_KWH = 0.98; // R$ por kWh economizado

export type PaybackEstimate = {
  investment: number;
  accumulatedSavings: number;
  monthlySavings: number;
  percentPaid: number; // 0..100
  isPaidOff: boolean;
  remainingMonths: number | null;
  projectedDateLabel: string | null;
  returnAmount: number; // economia além do investimento (quando já pago)
  investmentLabel: string;
  accumulatedSavingsLabel: string;
  returnAmountLabel: string;
};

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function computePayback(plant: Plant): PaybackEstimate {
  const investment = Math.max(0, plant.powerKwp * COST_PER_KWP);
  const accumulatedSavings = Math.max(0, plant.accumulatedGeneration * TARIFF_PER_KWH);
  const monthlySavings = Math.max(0, plant.generationMonth * TARIFF_PER_KWH);

  const percentPaid = investment > 0
    ? Math.min(100, (accumulatedSavings / investment) * 100)
    : 0;
  const isPaidOff = investment > 0 && accumulatedSavings >= investment;

  let remainingMonths: number | null = null;
  let projectedDateLabel: string | null = null;
  if (!isPaidOff && investment > 0 && monthlySavings > 0) {
    remainingMonths = Math.ceil((investment - accumulatedSavings) / monthlySavings);
    const projected = addMonths(new Date(), remainingMonths);
    projectedDateLabel = projected.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }

  const returnAmount = isPaidOff ? accumulatedSavings - investment : 0;

  return {
    investment,
    accumulatedSavings,
    monthlySavings,
    percentPaid,
    isPaidOff,
    remainingMonths,
    projectedDateLabel,
    returnAmount,
    investmentLabel: formatCurrency(investment),
    accumulatedSavingsLabel: formatCurrency(accumulatedSavings),
    returnAmountLabel: formatCurrency(returnAmount),
  };
}
