import { create } from "zustand";
import authService, { UserInfo } from "../services/auth";

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
    } catch (error) {
      set({ error: "登录失败", loading: false });
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await authService.logout();
      set({ isLoggedIn: false, user: null, loading: false });
    } catch (error) {
      set({ error: "登出失败", loading: false });
    }
  },
  sendCode: async (phone) => {
    set({ loading: true, error: null });
    try {
      const success = await authService.sendVerificationCode(phone);
      set({ loading: false });
      return success;
    } catch (error) {
      set({ error: "发送验证码失败", loading: false });
      return false;
    }
  },
  checkAuth: async () => {
    set({ loading: true });
    try {
      const token = await authService.getToken();
      const user = await authService.getUserInfo();
      if (token && user) {
        const valid = await authService.validateToken();
        if (valid) {
          set({ isLoggedIn: true, user, loading: false });
          return true;
        }
      }
      set({ isLoggedIn: false, user: null, loading: false });
      return false;
    } catch (error) {
      set({ isLoggedIn: false, user: null, loading: false });
      return false;
    }
  },
}));
