import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import React from 'react';

import { RootNavigator, RootStackParamList } from './RootNavigator';
import { useAppTheme } from '../hooks/useAppTheme';
import { routingInstrumentation } from '../config/sentry';
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'maoqiudiary://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Circle: 'circle',
          Category: 'category',
          AI: 'ai',
          Mine: 'mine',
        },
      },
      CircleDetail: 'circle/:_id',
      DiaryDetail: 'diary/:_id',
    },
  },
};

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
    <NavigationContainer ref={navigationRef} theme={appTheme} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
};
