export interface UserInfo {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  sendCode: (phone: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
}

export type I18nLangType = 'zh-CN' | 'en-US';

export type ThemeType = 'light' | 'dark';

export interface ComponentProps {
  children?: React.ReactNode;
  style?: any;
}
