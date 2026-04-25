/**
 * RespiCare Light Theme
 * Color tokens and typography for the app
 */

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  error: string
  warning: string
  success: string
  info: string
}

export interface Theme {
  roundness: number
  colors: ThemeColors
  fonts: {
    regular: string
    medium: string
    semibold: string
    bold: string
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    xxl: number
  }
  borderRadius: {
    sm: number
    md: number
    lg: number
    xl: number
    full: number
  }
}

export const theme: Theme = {
  roundness: 8,
  colors: {
    primary: '#1976d2',
    secondary: '#9c27b0',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    warning: '#f57c00',
    success: '#388e3c',
    info: '#0288d1',
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
}