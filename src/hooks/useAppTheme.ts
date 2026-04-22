import { useColorScheme } from 'react-native';

import { THEMES } from '../config/theme';
import { useAppStore } from '../store/appStore';

export const useAppTheme = () => {
  const theme = useAppStore((state) => state.theme);
  const systemColorScheme = useColorScheme();

  const actualThemeName = theme === 'system' ? systemColorScheme || 'light' : theme;
  const currentTheme = THEMES[actualThemeName];

  return {
    themeName: actualThemeName,
    theme: currentTheme,
    colors: currentTheme.colors,
    isDark: actualThemeName === 'dark',
  };
};
