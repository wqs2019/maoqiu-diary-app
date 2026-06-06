import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  LinkingOptions,
} from '@react-navigation/native';
import * as Linking from 'expo-linking';
import React from 'react';

import AppErrorBoundary from '@/components/common/AppErrorBoundary';
import {
  installGlobalErrorHandler,
  setCurrentMonitoringScreen,
  trackPageView,
} from '@/services/monitorService';
import { RootNavigator, RootStackParamList } from './RootNavigator';
import { useAppTheme } from '../hooks/useAppTheme';

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
      UserProfile: 'user/:userId',
    },
  },
};

export const Navigation = () => {
  const { isDark, colors } = useAppTheme();
  const navigationRef = React.useRef<any>(null);
  const routeSignatureRef = React.useRef('');

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

  React.useEffect(() => {
    installGlobalErrorHandler();
  }, []);

  const handleTrackCurrentRoute = React.useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute?.();
    if (!currentRoute?.name) {
      return;
    }

    const routeSignature = `${currentRoute.name}:${currentRoute.key || ''}`;
    setCurrentMonitoringScreen(currentRoute.name, currentRoute.key);

    if (routeSignatureRef.current === routeSignature) {
      return;
    }

    routeSignatureRef.current = routeSignature;
    trackPageView({
      pageName: currentRoute.name,
      routeKey: currentRoute.key,
    });
  }, []);

  return (
    <AppErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        theme={appTheme}
        linking={linking}
        onReady={handleTrackCurrentRoute}
        onStateChange={handleTrackCurrentRoute}
      >
        <RootNavigator />
      </NavigationContainer>
    </AppErrorBoundary>
  );
};
