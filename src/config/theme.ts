import { COLORS, DARK_COLORS, FONT_SIZES, SPACING } from './constant';

export type ThemeType = 'light' | 'dark' | 'system';

export const THEMES = {
  light: {
    name: 'light' as ThemeType,
    colors: {
      primary: COLORS.primary,
      secondary: COLORS.secondary,
      success: COLORS.success,
      warning: COLORS.warning,
      error: COLORS.error,
      background: COLORS.background,
      surface: COLORS.surface,
      text: COLORS.text,
      textSecondary: COLORS.textSecondary,
      border: COLORS.border,
    },
    fontSizes: FONT_SIZES,
    spacing: SPACING,
  },
  dark: {
    name: 'dark' as ThemeType,
    colors: {
      primary: DARK_COLORS.primary,
      secondary: DARK_COLORS.secondary,
      success: DARK_COLORS.success,
      warning: DARK_COLORS.warning,
      error: DARK_COLORS.error,
      background: DARK_COLORS.background,
      surface: DARK_COLORS.surface,
      text: DARK_COLORS.text,
      textSecondary: DARK_COLORS.textSecondary,
      border: DARK_COLORS.border,
    },
    fontSizes: FONT_SIZES,
    spacing: SPACING,
  },
};
