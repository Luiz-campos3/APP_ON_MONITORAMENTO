function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

export const features = {
  // O payback usa premissas inventadas (R$/kWp e tarifa) até o backend expor
  // investimento e tarifa reais por contrato/usina (input I5 do plano V2).
  // Número financeiro fictício não aparece por default — nem em demonstração.
  paybackCard: enabled(process.env.EXPO_PUBLIC_ENABLE_PAYBACK),
};
