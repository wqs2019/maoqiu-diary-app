import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import LoadingScreen from '@/screens/common/LoadingScreen';
import { Navigation } from '@/navigation';
import { initSentry, setUser, clearUser } from '@/config/sentry';
import { AppQueryProvider } from '@/providers/AppQueryProvider';

// 初始化 Sentry（仅生产环境）
if (!__DEV__) {
  initSentry();
}

export default function App() {
  const { checkAuth, loading: authLoading, user } = useAuthStore();
  const { theme } = useAppStore();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await checkAuth();
      setAppLoading(false);
    };
    initApp();
  }, [checkAuth]);

  // 设置 Sentry 用户上下文
  useEffect(() => {
    if (user && user.id) {
      setUser({
        id: user.id,
        username: user.nickname || user.phone,
        email: undefined,
      });
    } else {
      clearUser();
    }
  }, [user]);

  if (appLoading || authLoading) {
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
