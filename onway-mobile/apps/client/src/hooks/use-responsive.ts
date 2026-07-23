import { useWindowDimensions } from 'react-native';

import { spacing } from '@/constants/theme';

export type ResponsiveMetrics = {
  width: number;
  /** Telas estreitas (SE, mini, ~<380pt). */
  isCompact: boolean;
  /** Telas largas (Pro Max, ~>=430pt). */
  isLarge: boolean;
  /** Padding horizontal do conteúdo, proporcional ao espaço disponível. */
  contentPadding: number;
  /** Fator de escala suave em torno de 390pt, limitado para não distorcer. */
  fontScale: number;
  /** Escala uma fonte base pelo espaço disponível (nunca reduz demais). */
  scaleFont: (base: number) => number;
};

const BASELINE_WIDTH = 390;

/**
 * Responsividade baseada no espaço real (largura da janela), não em modelos de
 * aparelho. Fornece padding e escala tipográfica que se adaptam continuamente,
 * reaproveitando os tokens de `spacing` do design system.
 */
export function useResponsive(): ResponsiveMetrics {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isLarge = width >= 430;

  const contentPadding = isCompact ? spacing.lg : isLarge ? spacing.xxl + spacing.xs : spacing.xl; // 16 / 20 / 28
  const fontScale = Math.max(0.94, Math.min(1.08, width / BASELINE_WIDTH));
  const scaleFont = (base: number) => Math.round(base * fontScale);

  return { width, isCompact, isLarge, contentPadding, fontScale, scaleFont };
}
