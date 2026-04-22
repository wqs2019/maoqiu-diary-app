import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import React from 'react';

import { RootNavigator } from './RootNavigator';
import { useAppTheme } from '../hooks/useAppTheme';

export const Navigation = () => {
  const { isDark, colors } = useAppTheme();

  const appTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={appTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};
