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
import * as RNIap from 'react-native-iap';
import { ensureIAPConnection } from '@/services/iapManager';

// 保持原生 SplashScreen 阻止隐藏，直到我们的 CustomSplashScreen 准备就绪
SplashScreen.preventAutoHideAsync().catch(() => {});

// 初始化 Sentry
initSentry();

import { AppLockOverlay } from './src/components/AppLockOverlay';

const checkAndSyncVIPStatus = async () => {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return;

    await ensureIAPConnection();
    const purchases = await RNIap.getAvailablePurchases();
    
    // 如果有有效的订阅记录
    if (purchases && purchases.length > 0) {
        // 获取最近的一个订阅记录
        const activePurchase = purchases[0] as any;
        const expiresAt = activePurchase.expirationDateIOS ? Number(activePurchase.expirationDateIOS) : undefined;
        
        // 如果本地没有 vip 状态或者状态不一致，则更新服务器和本地状态
        if (!user.isVip?.value || user.isVip?.type !== activePurchase.productId || user.isVip?.expiresAt !== expiresAt) {
          console.log('App Startup: Found valid subscription, syncing VIP status...', activePurchase.productId);
          await useAuthStore.getState().updateProfile(user._id, {
            isVip: {
              value: true,
              type: activePurchase.productId,
              expiresAt
            }
          });
        }
      } else {
      // 如果没有有效订阅，但本地还是 vip，则取消 vip
      if (user.isVip?.value) {
        console.log('App Startup: No valid subscription found, removing VIP status...');
        await useAuthStore.getState().updateProfile(user._id, {
          isVip: {
            value: false
          }
        });
      }
    }
  } catch (error) {
    console.error('App Startup IAP Check Error:', error);
  }
};

function App() {
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
      await useAppStore.getState().initAppLock();
      await checkAuth();
      // 在 auth 检查完成后，如果已登录，再去苹果服务核对一下 VIP
      await checkAndSyncVIPStatus();
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
              <AppLockOverlay />
            </AppQueryProvider>
          )}
        </PortalProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

import * as Sentry from '@sentry/react-native';

// 将 App 用 Sentry 包裹以捕获渲染层面的错误 (Error Boundary)
export default Sentry.wrap(App);
