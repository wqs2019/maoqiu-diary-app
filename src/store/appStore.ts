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
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: I18nLangType) => void;
  setLoading: (loading: boolean) => void;
  setFirstLaunch: (isFirst: boolean) => Promise<void>;
  initFirstLaunch: () => Promise<void>;
  initTheme: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  language: 'zh-CN',
  isLoading: false,
  isFirstLaunch: true, // Default to true until checked
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
  setFirstLaunch: async (isFirst) => {
    await StorageUtil.set('isFirstLaunch', isFirst);
    set({ isFirstLaunch: isFirst });
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
}));
