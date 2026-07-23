import { Platform } from 'react-native';

export const brand = {
  green: '#40B09F',
  greenBright: '#40B09F',
  greenDark: '#258C56',
  ink: '#080A09',
  white: '#FFFFFF',
  warning: '#F4B740',
  danger: '#EF6A6A',
  info: '#61A9E8',
} as const;

export const palettes = {
  light: {
    background: '#F3F5F4',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FAF9',
    surfaceMuted: '#E9EFEC',
    text: '#111412',
    textSecondary: '#68706B',
    border: '#DCE4DF',
    input: '#EFF3F1',
    tabBar: '#FFFFFF',
    tabInactive: '#7B8A83',
    accent: brand.greenDark,
    accentSoft: '#DDEFEA',
    shadow: '#16251D',
    scrim: 'rgba(8, 10, 9, 0.38)',
  },
  dark: {
    background: '#080A09',
    surface: '#111412',
    surfaceElevated: '#171B18',
    surfaceMuted: '#222824',
    text: '#F4F5F4',
    textSecondary: '#A7ADA9',
    border: '#2A312D',
    input: '#1A201C',
    tabBar: '#0D100E',
    tabInactive: '#848A86',
    accent: brand.greenBright,
    accentSoft: '#17372A',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.62)',
  },
} as const;

export const brandTypography = {
  family: 'Gilmer',
  light: 'Gilmer-Light',
  medium: 'Gilmer-Medium',
  bold: 'Gilmer-Bold',
  heavy: 'Gilmer-Heavy',
} as const;

export type ThemeMode = keyof typeof palettes;
export type ThemePalette = (typeof palettes)[ThemeMode];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 4 },
  default: { boxShadow: '0 8px 26px rgba(7, 27, 19, 0.10)' },
});

export const maxContentWidth = 720;
