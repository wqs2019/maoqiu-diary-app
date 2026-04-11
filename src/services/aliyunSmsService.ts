// 阿里云短信服务 - 通过云函数调用
// 安全提示：客户端不应直接调用短信 API，必须通过云函数中转

import { Alert } from 'react-native';
import tcbService from './tcb';

class AliyunSmsService {
  // 测试模式：内存存储验证码（仅开发环境使用）
  private sentCodes: Map<string, { code: string; expires: number }> = new Map();

  /**
   * 发送短信验证码 - 通过云函数调用
   * @param phoneNumber 手机号
   */
  async sendSmsVerifyCode(phoneNumber: string): Promise<boolean> {
    try {
      // 调用云函数发送验证码
      const result = await tcbService.callFunction('sendCode', {
        phone: phoneNumber,
      });

      if (result.code !== 0) {
        throw new Error(result.message || '发送验证码失败');
      }

      return true;
    } catch (error: any) {
      console.error('Send SMS error:', error);

      // 开发环境：如果云函数未配置，使用 Mock 模式
      if (__DEV__) {
        const mockCode = '123456';
        this.sentCodes.set(phoneNumber, {
          code: mockCode,
          expires: Date.now() + 5 * 60 * 1000,
        });
        Alert.alert(
          '测试模式',
          `云函数未配置，使用模拟验证码：${mockCode}\n(有效期 5 分钟)`,
        );
        return true;
      }

      Alert.alert('发送失败', error.message || '网络错误');
      return false;
    }
  }

  /**
   * 验证短信验证码 - 通过云函数调用
   * @param phoneNumber 手机号
   * @param inputCode 输入的验证码
   */
  async verifyCode(phoneNumber: string, inputCode: string): Promise<boolean> {
    try {
      // 测试模式：验证码 123456 直接通过
      if (__DEV__ && inputCode === '123456') {
        return true;
      }

      // 调用云函数验证验证码
      const result = await tcbService.callFunction('verifyCode', {
        phone: phoneNumber,
        code: inputCode,
      });

      return result.code === 0;
    } catch (error: any) {
      console.error('Verify code error:', error);

      // 开发环境：检查本地存储的验证码
      if (__DEV__) {
        const record = this.sentCodes.get(phoneNumber);
        if (!record) return false;
        if (Date.now() > record.expires) {
          this.sentCodes.delete(phoneNumber);
          return false;
        }
        if (record.code === inputCode) {
          this.sentCodes.delete(phoneNumber);
          return true;
        }
      }

      return false;
    }
  }
}

export default new AliyunSmsService();
