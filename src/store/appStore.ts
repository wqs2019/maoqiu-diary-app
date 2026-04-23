import { create } from 'zustand';

import { ThemeType } from '../config/theme';
import StorageUtil from '../utils/storage';

export type I18nLangType = 'zh-CN' | 'en-US';
export type { ThemeType };

export interface AppState {
  theme: ThemeType;
  language: I18nLangType;
  isLoading: boolean;
  isFirstLaunch: boolean;
  notificationsEnabled: boolean;
  appLockEnabled: boolean;
  appLockPassword: string | null;
  isUnlocked: boolean; // Runtime only state
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: I18nLangType) => void;
  setLoading: (loading: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setFirstLaunch: (isFirst: boolean) => Promise<void>;
  setAppLock: (enabled: boolean, password?: string | null) => Promise<void>;
  setUnlocked: (unlocked: boolean) => void;
  initFirstLaunch: () => Promise<void>;
  initTheme: () => Promise<void>;
  initNotifications: () => Promise<void>;
  initAppLock: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  language: 'zh-CN',
  isLoading: false,
  isFirstLaunch: true, // Default to true until checked
  notificationsEnabled: false,
  appLockEnabled: false,
  appLockPassword: null,
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
  setAppLock: async (enabled, password) => {
    await StorageUtil.set('appLockEnabled', enabled);
    if (password !== undefined) {
      await StorageUtil.set('appLockPassword', password);
      set({ appLockEnabled: enabled, appLockPassword: password, isUnlocked: true });
    } else {
      set({ appLockEnabled: enabled, isUnlocked: true });
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
    const enabled = await StorageUtil.get<boolean>('appLockEnabled');
    const password = await StorageUtil.get<string>('appLockPassword');
    if (enabled !== null) {
      set({ appLockEnabled: enabled, isUnlocked: !enabled });
    }
    if (password !== null) {
      set({ appLockPassword: password });
    }
  },
}));
