import AsyncStorage from '@react-native-async-storage/async-storage';

import aliyunSmsService from './aliyunSmsService';
import { CloudService } from './tcb';
import { TOKEN_EXPIRE_DAYS } from '../config/constant';

const TOKEN_KEY = 'user_token';
const USER_INFO_KEY = 'user_info';

export interface UserInfo {
  _id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'secret';
  age?: number;
  birthday?: string;
  unlockedBadges?: Record<string, number>;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
}

export class AuthService {
  constructor() {
    // TCB 会在 callFunction 时自动初始化，不需要手动 init
  }

  async login(phone: string, code: string): Promise<{ token: string; user: UserInfo }> {
    try {
      // 测试阶段：使用阿里云短信服务验证验证码
      const isValid = await aliyunSmsService.verifyCode(phone, code);
      if (!isValid) {
        throw new Error('验证码错误');
      }

      // 调用登录云函数
      const response = await CloudService.callFunction('login', {
        action: 'login',
        data: {
          phone,
          code,
        },
      });

      console.log('Login response:', response);

      // 直接使用 response (如果 tcb 返回的是 { code, message, data } 结构)
      const result = response;
      if (result?.code !== 0) {
        throw new Error(result?.message || '登录失败');
      }

      const { token, user } = result.data || {};
      if (!token || !user) {
        throw new Error(result.data?.message || '返回数据格式错误，登录失败');
      }

      return { token, user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async sendVerificationCode(phone: string): Promise<boolean> {
    try {
      // 使用阿里云短信服务发送验证码
      const success = await aliyunSmsService.sendSmsVerifyCode(phone);
      return success;
    } catch (error) {
      console.error('Send code error:', error);
      throw error;
    }
  }

  async saveToken(token: string): Promise<void> {
    if (!token) return;
    const expiresAt = Date.now() + TOKEN_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    const tokenInfo: TokenInfo = { token, expiresAt };
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokenInfo));
  }

  async getToken(): Promise<string | null> {
    const tokenInfoStr = await AsyncStorage.getItem(TOKEN_KEY);
    if (!tokenInfoStr) return null;

    const tokenInfo: TokenInfo = JSON.parse(tokenInfoStr);
    if (Date.now() > tokenInfo.expiresAt) {
      await this.clearToken();
      return null;
    }

    return tokenInfo.token;
  }

  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async saveUserInfo(userInfo: UserInfo): Promise<void> {
    if (!userInfo) return;
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  }

  async getUserInfo(): Promise<UserInfo | null> {
    const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  }

  async fetchUserInfoFromServer(): Promise<UserInfo | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const response = await CloudService.callFunction('login', {
        action: 'validateToken',
        data: {
          token,
        },
      });

      // 根据更新后的 TCB 适配器，如果是直出的 JSON，它本身就是包含 {code, message, data} 的对象
      const result = response;
      if (result?.code === 0 && result.data?.user) {
        const user = result.data.user;
        console.log('Fetched user from server:', user);
        await this.saveUserInfo(user);
        return user;
      }
      // 如果明确是 token 错误或过期，可抛出特定异常，这里简化为返回 null
      return null;
    } catch (error: any) {
      console.error('Fetch user info from server error:', error);
      // 如果是网络错误，我们不应该返回 null 导致外部认为未登录而强制登出
      // 这里可以抛出错误让外层处理，或者根据需要返回本地缓存的用户信息
      throw error;
    }
  }

  async clearUserInfo(): Promise<void> {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  }

  async logout(): Promise<void> {
    await this.clearToken();
    await this.clearUserInfo();
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      // 测试阶段：直接返回true，不需要调用云函数
      console.log('Testing mode: Validate token');
      return true;

      // 实际代码（后面使用时取消注释）
      /*
      const functions = tcbService.getFunctions();
      if (!functions) {
        return false;
      }

      // 调用验证Token云函数
      const result = await functions.callFunction({
        name: 'validateToken',
        data: {
          token,
        },
      });

      return result.code === 0;
      */
    } catch (error) {
      console.error('Validate token error:', error);
      return false;
    }
  }
}

export default new AuthService();
