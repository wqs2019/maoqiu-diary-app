import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_EXPIRE_DAYS } from '../config/constant';
import tcbService from './tcb';
import aliyunSmsService from './aliyunSmsService';

const TOKEN_KEY = 'user_token';
const USER_INFO_KEY = 'user_info';

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

export class AuthService {
  constructor() {
    // 初始化TCB
    tcbService.init();
  }

  async login(phone: string, code: string): Promise<{ token: string; user: UserInfo }> {
    try {
      // 测试阶段：使用阿里云短信服务验证验证码
      const isValid = await aliyunSmsService.verifyCode(phone, code);
      if (!isValid) {
        throw new Error('验证码错误');
      }

      // 模拟返回数据
      console.log('Testing mode: Login with phone', phone);
      const mockToken = 'mock-token-' + Date.now();
      const mockUser: UserInfo = {
        id: '1',
        phone,
        nickname: '测试用户',
        avatar: '',
      };

      return { token: mockToken, user: mockUser };

      // 实际代码（后面使用时取消注释）
      /*
      const functions = tcbService.getFunctions();
      if (!functions) {
        throw new Error('TCB functions not initialized');
      }

      // 调用登录云函数
      const result = await functions.callFunction({
        name: 'login',
        data: {
          phone,
          code,
        },
      });

      if (result.code !== 0) {
        throw new Error(result.message || '登录失败');
      }

      const { token, user } = result.data;
      return { token, user };
      */
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

      // 实际代码（后面使用时取消注释）
      /*
      const functions = tcbService.getFunctions();
      if (!functions) {
        throw new Error('TCB functions not initialized');
      }

      // 调用发送验证码云函数
      const result = await functions.callFunction({
        name: 'sendCode',
        data: {
          phone,
        },
      });

      return result.code === 0;
      */
    } catch (error) {
      console.error('Send code error:', error);
      throw error;
    }
  }

  async saveToken(token: string): Promise<void> {
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
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  }

  async getUserInfo(): Promise<UserInfo | null> {
    const userInfoStr = await AsyncStorage.getItem(USER_INFO_KEY);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
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
