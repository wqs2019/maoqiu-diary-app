import { create } from 'zustand';

import authService, { UserInfo } from '../services/auth';

export interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  sendCode: (phone: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  fetchUserInfo: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  user: null,
  loading: false,
  error: null,
  login: async (phone, code) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await authService.login(phone, code);
      await authService.saveToken(token);
      await authService.saveUserInfo(user);
      set({ isLoggedIn: true, user, loading: false });
    } catch (error: any) {
      console.error('Login failed in store:', error);
      set({ error: error.message || '登录失败', loading: false });
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await authService.logout();
      set({ isLoggedIn: false, user: null, loading: false });
    } catch (error) {
      set({ error: '登出失败', loading: false });
    }
  },
  sendCode: async (phone) => {
    set({ loading: true, error: null });
    try {
      const success = await authService.sendVerificationCode(phone);
      set({ loading: false });
      return success;
    } catch (error) {
      set({ error: '发送验证码失败', loading: false });
      return false;
    }
  },
  checkAuth: async () => {
    set({ loading: true });
    try {
      const token = await authService.getToken();
      if (token) {
        // 先尝试获取本地缓存，让用户能快速进入首页
        const localUser = await authService.getUserInfo();
        if (localUser) {
          set({ isLoggedIn: true, user: localUser, loading: false });
          // 异步刷新云端信息
          authService
            .fetchUserInfoFromServer()
            .then((user) => {
              if (user) set({ user });
            })
            .catch((e) => {
              console.error('Background fetch user info failed:', e);
            });
          return true;
        }

        try {
          const user = await authService.fetchUserInfoFromServer();
          if (user) {
            set({ isLoggedIn: true, user, loading: false });
            return true;
          }
        } catch (fetchError) {
          console.error('Fetch error during auth check:', fetchError);
          // 网络错误时，如果前面没有本地 user，依然保持未登录态比较安全
          // 或者可以根据产品需求放行
        }
      }
      set({ isLoggedIn: false, user: null, loading: false });
      return false;
    } catch (error) {
      set({ isLoggedIn: false, user: null, loading: false });
      return false;
    }
  },
  fetchUserInfo: async () => {
    try {
      const user = await authService.fetchUserInfoFromServer();
      if (user) {
        set({ user });
      }
    } catch (error) {
      console.error('Failed to fetch user info', error);
      // 网络错误等异常时不自动退出登录，以提升用户体验
    }
  },
}));
