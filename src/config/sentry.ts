// Sentry 错误追踪配置
// 文档：https://docs.sentry.io/platforms/react-native/

import * as Sentry from '@sentry/react-native';

// Sentry 配置
const SENTRY_CONFIG = {
    dsn: '', // 填入你的 Sentry DSN，生产环境使用
};

// Sentry 初始化配置
export const initSentry = () => {
    // 仅在生产环境启用 Sentry
    if (!__DEV__ && SENTRY_CONFIG.dsn) {
        Sentry.init({
            dsn: SENTRY_CONFIG.dsn,
            enableAutoSessionTracking: true,
            sessionTrackingIntervalMillis: 30000,
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0,
            environment: 'production',
            attachStacktrace: true,
            enableNativeCrashHandling: true,
            enableAutoPerformanceTracing: true,
            enableUserInteractionTracing: true,
            enableAppStartTracking: true,
        });

        // 设置用户上下文
        Sentry.setUser({
            ip_address: '{{auto}}',
        });
    }
};

// 捕获异常
export const captureException = (error: Error, context?: {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    tags?: Record<string, any>;
    extra?: Record<string, any>;
}) => {
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
