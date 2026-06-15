import CloudService from './tcb';
import { Notification } from '../types';

interface CloudFunctionResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface NotificationListResponse {
  list: (Notification & { senderInfo?: { nickname?: string; avatar?: string } })[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationQueryOptions {
  types?: Notification['type'][];
  excludeTypes?: Notification['type'][];
  unreadOnly?: boolean;
}

export const getNotifications = async (
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  options: NotificationQueryOptions = {}
): Promise<NotificationListResponse> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<NotificationListResponse>>('notification', {
    action: 'getNotifications',
    data: { userId, page, pageSize, ...options },
  });

  if (result.data?.success && result.data.data) {
    return result.data.data;
  }
  
  return { list: [], total: 0, page, pageSize };
};

export const markNotificationRead = async (
  userId: string,
  notificationIds?: string[],
  markAll: boolean = false,
  options: NotificationQueryOptions = {}
): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notification', {
    action: 'markRead',
    data: { userId, notificationIds, markAll, ...options },
  });

  if (!result.data?.success) {
    throw new Error(result.data?.message || '标记已读失败');
  }
};

export const getUnreadNotificationCount = async (
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<number> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<number>>('notification', {
    action: 'getUnreadCount',
    data: { userId, ...options },
  });

  if (result.data?.success) {
    return result.data.data;
  }
  return 0;
};
