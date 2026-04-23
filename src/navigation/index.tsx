import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import React from 'react';

import { RootNavigator } from './RootNavigator';
import { useAppTheme } from '../hooks/useAppTheme';
import { routingInstrumentation } from '../config/sentry';

export const Navigation = () => {
  const { isDark, colors } = useAppTheme();
  const navigationRef = React.useRef<any>(null);
  
  // 在组件挂载时注册路由的集成
  React.useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationRef);
  }, []);

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
    <NavigationContainer ref={navigationRef} theme={appTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};
