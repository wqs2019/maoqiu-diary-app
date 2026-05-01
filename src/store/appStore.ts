import { create } from 'zustand';

import { ThemeType } from '../config/theme';
import StorageUtil from '../utils/storage';
import { useAuthStore } from './authStore';

export type I18nLangType = 'zh-CN' | 'en-US';
export type { ThemeType };

export interface AppState {
  theme: ThemeType;
  language: I18nLangType;
  isLoading: boolean;
  isFirstLaunch: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  isUnlocked: boolean; // Runtime only state
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: I18nLangType) => void;
  setLoading: (loading: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setFirstLaunch: (isFirst: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setUnlocked: (unlocked: boolean) => void;
  initFirstLaunch: () => Promise<void>;
  initTheme: () => Promise<void>;
  initNotifications: () => Promise<void>;
  initAppLock: () => Promise<void>;
  syncAppLockFromUser: (biometricEnabled?: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  language: 'zh-CN',
  isLoading: false,
  isFirstLaunch: true, // Default to true until checked
  notificationsEnabled: false,
  biometricEnabled: false,
  isUnlocked: false,
  setTheme: async (theme) => {
    await StorageUtil.set('theme', theme);
    set({ theme });
  },
  setLanguage: (language) => {
    set({ language });
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  setNotificationsEnabled: async (enabled) => {
    await StorageUtil.set('notificationsEnabled', enabled);
    set({ notificationsEnabled: enabled });
  },
  setFirstLaunch: async (isFirst) => {
    await StorageUtil.set('isFirstLaunch', isFirst);
    set({ isFirstLaunch: isFirst });
  },
  setBiometricEnabled: async (enabled) => {
    await StorageUtil.set('biometricEnabled', enabled);
    set({ biometricEnabled: enabled });
    const userId = useAuthStore.getState().user?._id;
    if (userId) {
      useAuthStore.getState().updateProfile(userId, { biometricEnabled: enabled });
    }
  },
  setUnlocked: (unlocked) => {
    set({ isUnlocked: unlocked });
  },
  initFirstLaunch: async () => {
    // set({ isFirstLaunch: true });
    const isFirst = await StorageUtil.get<boolean>('isFirstLaunch');
    if (isFirst === null) {
      set({ isFirstLaunch: true });
    } else {
      set({ isFirstLaunch: isFirst });
    }
  },
  initTheme: async () => {
    const savedTheme = await StorageUtil.get<ThemeType>('theme');
    if (savedTheme) {
      set({ theme: savedTheme });
    }
  },
  initNotifications: async () => {
    const saved = await StorageUtil.get<boolean>('notificationsEnabled');
    if (saved !== null) {
      set({ notificationsEnabled: saved });
    }
  },
  initAppLock: async () => {
    const biometricEnabled = await StorageUtil.get<boolean>('biometricEnabled');
    if (biometricEnabled !== null) {
      set({ biometricEnabled, isUnlocked: !biometricEnabled });
    }
  },
  syncAppLockFromUser: async (biometricEnabled) => {
    if (biometricEnabled !== undefined) {
      await StorageUtil.set('biometricEnabled', biometricEnabled);
      set({ biometricEnabled, isUnlocked: !biometricEnabled });
    }
  },
}));
