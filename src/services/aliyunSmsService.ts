// 阿里云短信服务 - 客户端代理
// 为了保护您的阿里云 AccessKey 安全，客户端仅负责调用部署在腾讯云开发(TCB)的云函数
// 真实的短信发送逻辑和密钥配置在 cloudfunctions/sendCode 中

import { Alert } from 'react-native';

import { CloudService } from './tcb';

class AliyunSmsService {
  /**
   * 发送短信验证码
   * @param phoneNumber 手机号
   */
  async sendSmsVerifyCode(phoneNumber: string): Promise<boolean> {
    try {
      // 通过 TCB 调用云函数 'smsAuth'
      const result = await CloudService.callFunction('smsAuth', {
        action: 'send',
        phone: phoneNumber,
      });

      // 根据你之前项目中的云函数响应规范判断 code 是否为 0
      if (result.code === 0) {
        return true;
      } else {
        throw new Error(result.message || '发送短信失败');
      }
    } catch (error: any) {
      console.error('Send SMS error:', error);
      Alert.alert('发送失败', error.message || '网络错误，请稍后重试');
      return false;
    }
  }

  /**
   * 验证短信验证码
   * @param phoneNumber 手机号
   * @param inputCode 输入的验证码
   */
  async verifyCode(phoneNumber: string, inputCode: string): Promise<boolean> {
    try {
      // 通过 TCB 调用云函数 'smsAuth'，在数据库中匹配验证码是否正确且未过期
      const result = await CloudService.callFunction('smsAuth', {
        action: 'verify',
        phone: phoneNumber,
        code: inputCode,
      });

      return result.code === 0;
    } catch (error: any) {
      console.error('Verify code error:', error);
      return false;
    }
  }
}

export default new AliyunSmsService();
