import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import CloudService from '@/services/tcb';
import { useAuthStore } from '@/store/authStore';

export type MonitoringTrendPoint = {
  date: string;
  label: string;
  pv: number;
  uv: number;
};

export type MonitoringPageStat = {
  pageName: string;
  totalPv: number;
  totalUv: number;
  trend: MonitoringTrendPoint[];
};

export type MonitoringErrorItem = {
  _id?: string;
  pageName: string;
  source?: string;
  errorName?: string;
  errorMessage: string;
  stack?: string;
  createdAt?: string | number;
  isFatal?: boolean;
  userId?: string;
  userSnapshot?: {
    _id?: string;
    nickname?: string;
    phone?: string;
    avatar?: string;
  };
  deviceInfo?: {
    platform?: string;
    osVersion?: string;
    brand?: string;
    modelName?: string | null;
    appVersion?: string;
  };
};

export type MonitoringDashboard = {
  overview: {
    totalPv: number;
    totalUv: number;
    totalErrors: number;
    pageCount: number;
  };
  pageTrend: MonitoringTrendPoint[];
  pageStats: MonitoringPageStat[];
  errorTrend: Array<{ date: string; label: string; count: number }>;
  recentErrors: MonitoringErrorItem[];
};

const APP_VERSION = Constants.expoConfig?.version || Constants.nativeAppVersion || 'unknown';
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
let currentScreenName = 'Unknown';
let currentRouteKey = '';
let hasInstalledGlobalErrorHandler = false;
let isReportingError = false;

const sanitizeText = (value?: string | null, maxLength = 500) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, maxLength);
};

const getCurrentUserSnapshot = () => {
  const user = useAuthStore.getState().user;
  if (!user?._id) {
    return undefined;
  }

  return {
    _id: user._id,
    nickname: sanitizeText(user.nickname, 60),
    phone: sanitizeText(user.phone, 30),
    avatar: sanitizeText(user.avatar, 500),
  };
};

const getDeviceInfo = () => ({
  platform: Platform.OS,
  osVersion: sanitizeText(String(Device.osVersion || ''), 30),
  brand: sanitizeText(Device.brand || '', 40),
  modelName: sanitizeText(Device.modelName || '', 60),
  appVersion: APP_VERSION,
});

export const setCurrentMonitoringScreen = (pageName: string, routeKey?: string) => {
  currentScreenName = pageName || 'Unknown';
  currentRouteKey = routeKey || '';
};

export const trackPageView = async (payload: { pageName: string; routeKey?: string }) => {
  try {
    const user = useAuthStore.getState().user;
    const normalizedPageName = payload.pageName || 'Unknown';
    setCurrentMonitoringScreen(normalizedPageName, payload.routeKey);

    await CloudService.callFunction('monitor', {
      action: 'trackPageView',
      data: {
        pageName: normalizedPageName,
        routeKey: payload.routeKey || '',
        sessionId: SESSION_ID,
        userId: user?._id,
        userSnapshot: getCurrentUserSnapshot(),
        deviceInfo: getDeviceInfo(),
      },
    });
  } catch (error) {
    console.error('trackPageView failed:', error);
  }
};

export const reportClientError = async (
  error: unknown,
  extra?: {
    pageName?: string;
    source?: string;
    isFatal?: boolean;
    extraData?: Record<string, any>;
  }
) => {
  if (isReportingError) {
    return;
  }

  try {
    isReportingError = true;
    const user = useAuthStore.getState().user;
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'Unknown error');

    await CloudService.callFunction('monitor', {
      action: 'reportError',
      data: {
        sessionId: SESSION_ID,
        userId: user?._id,
        userSnapshot: getCurrentUserSnapshot(),
        pageName: extra?.pageName || currentScreenName || 'Unknown',
        routeKey: currentRouteKey,
        source: extra?.source || 'manual',
        isFatal: !!extra?.isFatal,
        errorName: sanitizeText(normalizedError.name || 'Error', 120),
        errorMessage: sanitizeText(normalizedError.message || 'Unknown error', 1000),
        stack: sanitizeText(normalizedError.stack || '', 4000),
        deviceInfo: getDeviceInfo(),
        extraData: extra?.extraData || {},
      },
    });
  } catch (reportError) {
    console.error('reportClientError failed:', reportError);
  } finally {
    isReportingError = false;
  }
};

export const installGlobalErrorHandler = () => {
  if (hasInstalledGlobalErrorHandler) {
    return;
  }

  const errorUtils = (global as any).ErrorUtils as
    | {
        getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      }
    | undefined;

  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
    return;
  }

  const defaultHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    reportClientError(error, {
      source: 'global_js',
      isFatal: !!isFatal,
    });

    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });

  hasInstalledGlobalErrorHandler = true;
};

export const fetchMonitoringDashboard = async (adminUserId: string): Promise<MonitoringDashboard> => {
  const response = await CloudService.callFunction<{
    success: boolean;
    data?: MonitoringDashboard;
    message?: string;
  }>('monitor', {
    action: 'dashboard',
    data: {
      adminUserId,
      days: 7,
    },
  });

  if (response.code !== 0 || response.data?.success === false || !response.data?.data) {
    throw new Error(response.data?.message || response.message || '获取监控大盘失败');
  }

  return response.data.data;
};

export const PAGE_LABELS: Record<string, string> = {
  Main: '主容器',
  Home: '足迹',
  Circle: '圈子',
  Category: '分类',
  AI: 'AI问答',
  Mine: '我的',
  EditDiary: '写日记',
  DiaryDetail: '日记详情',
  CircleDetail: '圈子详情',
  UserProfile: '个人主页',
  ReportDiaryPicker: '关联笔记选择',
  EditProfile: '编辑资料',
  NotificationCenter: '站内信',
  AdminCenter: '管理员中心',
  AdminModeration: '内容审核',
  MonitoringDashboard: '监控大盘',
  SystemConfig: '系统配置',
  Settings: '设置',
  Feedback: '意见反馈',
  Subscription: '订阅中心',
};

export const getMonitoringPageLabel = (pageName: string) => PAGE_LABELS[pageName] || pageName;
