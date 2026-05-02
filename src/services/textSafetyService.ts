import { CloudService } from './tcb';

class TextSafetyService {
  /**
   * 检查文本内容是否安全
   * @param text 需要检测的文本
   * @returns boolean - true 表示安全，false 表示包含敏感词
   */
  async checkContentSafety(text: string): Promise<boolean> {
    if (!text.trim()) return true;

    try {
      // 通过 TCB 调用内容安全检测云函数
      const response = await CloudService.callFunction('securityCheck', {
        action: 'checkText',
        text: text,
      });

      // 约定返回 code === 0 且 data.isSafe === true 表示安全
      if (response.code === 0 && response.data?.isSafe) {
        return true;
      }
      console.log('[TextSafetyService] Content safety check failed:', JSON.stringify(response));
      // 检测出敏感词或接口返回不安全时
      return false;
    } catch (error) {
      console.error('[TextSafetyService] Content safety check failed:', error);
      // 根据产品策略，如果安全接口挂了，可以选择放行或拦截。
      // 这里选择临时放行，防止云服务异常时阻断用户的核心发布流程。
      return true;
    }
  }
}

export const textSafetyService = new TextSafetyService();
