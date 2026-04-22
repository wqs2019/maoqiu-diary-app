import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initSentry, setUser, clearUser } from '@/config/sentry';
import { Navigation } from '@/navigation';
import { AppQueryProvider } from '@/providers/AppQueryProvider';
import { PortalProvider } from '@/components/common/Portal';
import { ToastProvider } from '@/components/common/Toast';
import CustomSplashScreen from '@/screens/common/CustomSplashScreen';
import LoadingScreen from '@/screens/common/LoadingScreen';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

// 保持原生 SplashScreen 阻止隐藏，直到我们的 CustomSplashScreen 准备就绪
SplashScreen.preventAutoHideAsync().catch(() => {});

// 初始化 Sentry（仅生产环境）
if (!__DEV__) {
  initSentry();
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const user = useAuthStore((state) => state.user);
  const theme = useAppStore((state) => state.theme);
  const initTheme = useAppStore((state) => state.initTheme);
  const [appLoading, setAppLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await initTheme();
      await useAppStore.getState().initFirstLaunch();
      await useAppStore.getState().initNotifications();
      await checkAuth();
      setAppLoading(false);
      // 数据准备完毕后，隐藏原生启动屏，此时界面由 CustomSplashScreen 接管
      await SplashScreen.hideAsync();
    };
    initApp();
  }, []); // Only once on mount

  // 设置 Sentry 用户上下文
  useEffect(() => {
    if (user && user._id) {
      setUser({
        id: user._id,
        username: user.nickname || user.phone,
        email: undefined,
      });
    } else {
      clearUser();
    }
  }, [user]);

  const systemColorScheme = useColorScheme();
  const actualTheme = theme === 'system' ? (systemColorScheme || 'light') : theme;

  if (appLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <PortalProvider>
          <StatusBar style={actualTheme === 'dark' ? 'light' : 'dark'} />
          {showCustomSplash ? (
            <CustomSplashScreen
              onFinish={() => {
                setShowCustomSplash(false);
              }}
            />
          ) : (
            <AppQueryProvider>
              <Navigation />
            </AppQueryProvider>
          )}
        </PortalProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
