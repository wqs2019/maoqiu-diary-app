import * as RNIap from 'react-native-iap';

let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

/**
 * 确保 IAP 连接已经初始化（单例模式）
 * 如果正在连接中，会返回同一个 Promise，防止并发初始化
 */
export const ensureIAPConnection = async (): Promise<boolean> => {
  if (isConnected) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log('IAP Manager: Initializing connection...');
      await RNIap.initConnection();
      isConnected = true;
      console.log('IAP Manager: Connection initialized successfully.');
      return true;
    } catch (error) {
      console.error('IAP Manager: Failed to initialize connection:', error);
      isConnected = false;
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

/**
 * 关闭 IAP 连接
 * 建议只在 App 彻底退出或注销时调用
 */
export const closeIAPConnection = async (): Promise<void> => {
  if (!isConnected) return;
  try {
    console.log('IAP Manager: Ending connection...');
    await RNIap.endConnection();
    isConnected = false;
    console.log('IAP Manager: Connection ended.');
  } catch (error) {
    console.error('IAP Manager: Failed to end connection:', error);
  }
};
