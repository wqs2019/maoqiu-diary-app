// Sentry 错误追踪配置
// 文档：https://docs.sentry.io/platforms/react-native/

import * as Sentry from '@sentry/react-native';

// 创建一个可以在外部引用的导航集成实例
export const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Sentry 配置
const SENTRY_CONFIG = {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
};

// Sentry 初始化配置
export const initSentry = () => {
  // 我们建议不仅在生产环境，在测试环境也开启部分上报
  if (SENTRY_CONFIG.dsn) {
    Sentry.init({
      dsn: SENTRY_CONFIG.dsn,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 生产环境采样率建议调低
      profilesSampleRate: __DEV__ ? 1.0 : 0.2,
      environment: __DEV__ ? 'development' : 'production',
      attachStacktrace: true,
      enableNativeCrashHandling: true,
      enableAutoPerformanceTracing: true,
      enableUserInteractionTracing: true,
      enableAppStartTracking: true,
      integrations: [
        routingInstrumentation,
      ],
    });
  }
};

// 捕获异常
export const captureException = (
  error: Error,
  context?: {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    tags?: Record<string, any>;
    extra?: Record<string, any>;
  }
) => {
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
  });
};

// 捕获消息
export const captureMessage = (message: string, level?: Sentry.SeverityLevel) => {
  Sentry.captureMessage(message, level);
};

// 设置用户
export const setUser = (user: {
  id?: string;
  username?: string;
  email?: string;
  ip_address?: string;
  name?: string;
}) => {
  Sentry.setUser(user);
};

// 清除用户
export const clearUser = () => {
  Sentry.setUser(null);
};

// 添加 Breadcrumb
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

export default Sentry;
