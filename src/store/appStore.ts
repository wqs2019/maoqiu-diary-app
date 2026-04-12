import { create } from 'zustand';

import { ThemeType } from '../config/theme';

export type I18nLangType = 'zh-CN' | 'en-US';
export type { ThemeType };

export interface AppState {
  theme: ThemeType;
  language: I18nLangType;
  isLoading: boolean;
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: I18nLangType) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  language: 'zh-CN',
  isLoading: false,
  setTheme: (theme) => {
    set({ theme });
  },
  setLanguage: (language) => {
    set({ language });
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
