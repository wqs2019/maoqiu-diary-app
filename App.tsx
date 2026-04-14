import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initSentry, setUser, clearUser } from '@/config/sentry';
import { Navigation } from '@/navigation';
import { AppQueryProvider } from '@/providers/AppQueryProvider';
import LoadingScreen from '@/screens/common/LoadingScreen';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

// 初始化 Sentry（仅生产环境）
if (!__DEV__) {
  initSentry();
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const user = useAuthStore((state) => state.user);
  const theme = useAppStore((state) => state.theme);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await checkAuth();
      setAppLoading(false);
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

  if (appLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppQueryProvider>
        <Navigation />
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}
