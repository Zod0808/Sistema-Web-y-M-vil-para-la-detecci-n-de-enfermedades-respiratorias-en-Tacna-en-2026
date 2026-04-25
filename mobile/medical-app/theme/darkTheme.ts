/**
 * RespiCare Dark Theme
 * Dark mode color tokens
 */

import { theme } from './theme';
import type { Theme } from './theme';

export const darkTheme: Theme = {
  roundness: theme.roundness,
  colors: {
    primary: '#42a5f5',
    secondary: '#ce93d8',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
    error: '#ef5350',
    warning: '#ffa726',
    success: '#66bb6a',
    info: '#29b6f6',
  },
  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};