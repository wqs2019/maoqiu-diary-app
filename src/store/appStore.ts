import { create } from 'zustand';

import i18n from '../i18n';
import { ThemeType } from '../config/theme';
import StorageUtil from '../utils/storage';
import { useAuthStore } from './authStore';

export type I18nLangType = 'zh-CN' | 'en-US';
export type { ThemeType };

export type ThemeColorType = 'pink' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'cyan' | 'brown';

export interface AppState {
  theme: ThemeType;
  themeColor: ThemeColorType;
  language: I18nLangType;
  isLoading: boolean;
  isFirstLaunch: boolean;
  notificationsEnabled: boolean;
  reminderTime: { hour: number; minute: number };
  biometricEnabled: boolean;
  isUnlocked: boolean; // Runtime only state
  appConfig: {
    show_ai_chat: boolean;
    show_circle: boolean;
    notification?: string;
  };
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: I18nLangType) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (time: { hour: number; minute: number }) => Promise<void>;
  setFirstLaunch: (isFirst: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setUnlocked: (unlocked: boolean) => void;
  setAppConfig: (config: { show_ai_chat: boolean; show_circle: boolean; notification?: string }) => void;
  setThemeColor: (color: ThemeColorType) => Promise<void>;
  initFirstLaunch: () => Promise<void>;
  initTheme: () => Promise<void>;
  initNotifications: () => Promise<void>;
  initAppLock: () => Promise<void>;
  syncAppLockFromUser: (biometricEnabled?: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  themeColor: 'pink',
  language: 'zh-CN',
  isLoading: false,
  isFirstLaunch: true, // Default to true until checked
  notificationsEnabled: false,
  reminderTime: { hour: 22, minute: 0 },
  biometricEnabled: false,
  isUnlocked: false,
  appConfig: {
    show_ai_chat: true,
    show_circle: true,
  },
  setTheme: async (theme) => {
    await StorageUtil.set('theme', theme);
    set({ theme });
  },
  setThemeColor: async (color) => {
    await StorageUtil.set('themeColor', color);
    set({ themeColor: color });
  },
  setLanguage: async (language) => {
    await StorageUtil.set('language', language);
    await i18n.changeLanguage(language);
    set({ language });
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  setNotificationsEnabled: async (enabled) => {
    await StorageUtil.set('notificationsEnabled', enabled);
    set({ notificationsEnabled: enabled });
  },
  setReminderTime: async (time) => {
    await StorageUtil.set('reminderTime', time);
    set({ reminderTime: time });
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
  setAppConfig: (config) => {
    set({ appConfig: config });
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
    const savedThemeColor = await StorageUtil.get<ThemeColorType>('themeColor');
    if (savedThemeColor) {
      set({ themeColor: savedThemeColor });
    }
    const savedLanguage = await StorageUtil.get<I18nLangType>('language');
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
      set({ language: savedLanguage });
    } else {
      set({ language: i18n.language as I18nLangType });
    }
  },
  initNotifications: async () => {
    const saved = await StorageUtil.get<boolean>('notificationsEnabled');
    if (saved !== null) {
      set({ notificationsEnabled: saved });
    }
    const savedTime = await StorageUtil.get<{ hour: number; minute: number }>('reminderTime');
    if (savedTime) {
      set({ reminderTime: savedTime });
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
