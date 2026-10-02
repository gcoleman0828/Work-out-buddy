import { useColorScheme } from 'react-native';

/** Design tokens. Screens never hardcode a color, spacing or font size. */
export interface Palette {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  success: string;
  warning: string;
}

const LIGHT: Palette = {
  background: '#F4F6F8',
  card: '#FFFFFF',
  text: '#101828',
  textMuted: '#667085',
  border: '#E4E7EC',
  primary: '#0F766E',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  success: '#15803D',
  warning: '#B45309',
};

const DARK: Palette = {
  background: '#0B0F14',
  card: '#151B23',
  text: '#F2F4F7',
  textMuted: '#98A2B3',
  border: '#263040',
  primary: '#2DD4BF',
  onPrimary: '#042F2E',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const fontSize = { small: 13, body: 16, title: 20, display: 30 } as const;
