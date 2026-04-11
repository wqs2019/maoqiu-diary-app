// TCB 服务 - 完整的云函数调用实现
import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-rn';
import tcbConfig from '../config/tcb';

// 使用适配器
cloudbase.useAdapters(adapter);

let appInstance: any = null;

/**
 * 初始化 CloudBase
 */
const initTCB = () => {
  if (appInstance) return appInstance;

  if (tcbConfig.env === 'YOUR_ENV_ID' || !tcbConfig.env) {
    console.warn('[TCB] Environment ID not configured');
    return null;
  }

  try {
    console.log('[TCB] Initializing app...');
    appInstance = cloudbase.init({
      env: tcbConfig.env,
      region: tcbConfig.region,
    });
    console.log('[TCB] App initialized:', tcbConfig.env);
    return appInstance;
  } catch (error: any) {
    console.error('[TCB] Init error:', error);
    return null;
  }
};

/**
 * 确保已认证
 */
const ensureAuth = async (appInstance: any) => {
  const auth = appInstance.auth({ persistence: 'local' });

  // 检查是否已登录
  if (auth.hasLoginState && auth.hasLoginState()) {
    console.log('[TCB] Already logged in');
    return auth;
  }

  // 使用匿名登录
  console.log('[TCB] Anonymous login...');

  if (auth.anonymousAuthProvider) {
    await auth.anonymousAuthProvider().signIn();
    console.log('[TCB] Anonymous login (anonymousAuthProvider)');
  } else if (auth.signInAnonymously) {
    await auth.signInAnonymously();
    console.log('[TCB] Anonymous login (signInAnonymously)');
  } else {
    console.warn('[TCB] Anonymous login methods not available');
    throw new Error('Cannot find anonymous login method on auth object');
  }

  return auth;
};

export const CloudService = {
  /**
   * 获取 TCB 应用实例
   */
  getApp: () => {
    return initTCB();
  },

  /**
   * 确保已认证
   */
  ensureAuth: async (appInstance?: any) => {
    if (!appInstance) {
      appInstance = initTCB();
      if (!appInstance) {
        throw new Error('TCB init failed');
      }
    }
    return ensureAuth(appInstance);
  },

  /**
   * 检查是否已配置
   */
  isConfigured: () => {
    return tcbConfig.env !== 'YOUR_ENV_ID' && !!tcbConfig.env;
  },

  /**
   * 调用云函数
   */
  callFunction: async <T = any>(
    name: string,
    data: any,
    options?: any
  ): Promise<{ code: number; message: string; data: T }> => {
    if (!CloudService.isConfigured()) {
      console.warn('[TCB] Not configured');
      throw new Error('TCB not configured');
    }

    const app = initTCB();
    if (!app) {
      throw new Error('TCB app not initialized');
    }

    try {
      console.log('[TCB] Calling function:', name, 'data:', JSON.stringify(data));

      // 确保已认证
      await ensureAuth(app);

      const res = await app.callFunction({
        name,
        data,
        ...options,
      });

      console.log('[TCB] Function result received');

      // 将响应转换为纯 JSON 对象
      const responseData = res.result;
      const cleanData = JSON.parse(JSON.stringify(responseData || {}));

      return {
        code: 0,
        message: '',
        data: cleanData as T,
      };
    } catch (error: any) {
      console.error(`[TCB] Call function ${name} error:`, error);
      console.error('[TCB] Error message:', error.message);
      throw error;
    }
  },
};

export default CloudService;
