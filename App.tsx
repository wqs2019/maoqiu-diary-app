import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import LoadingScreen from '@/screens/common/LoadingScreen';
import { Navigation } from '@/navigation';

export default function App() {
  const { checkAuth, loading: authLoading } = useAuthStore();
  const { theme } = useAppStore();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await checkAuth();
      setAppLoading(false);
    };
    initApp();
  }, [checkAuth]);

  if (appLoading || authLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Navigation />
    </SafeAreaProvider>
  );
}
