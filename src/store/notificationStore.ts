import { create } from 'zustand';

import { getUnreadNotificationCount } from '../services/notificationService';

interface NotificationState {
  centerUnreadCount: number;
  circleUnreadCount: number;
  setCenterUnreadCount: (count: number) => void;
  setCircleUnreadCount: (count: number) => void;
  resetUnreadCount: () => void;
  refreshUnreadCount: (userId?: string) => Promise<{ centerCount: number; circleCount: number }>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  centerUnreadCount: 0,
  circleUnreadCount: 0,
  setCenterUnreadCount: (count) => {
    set({ centerUnreadCount: Math.max(0, count) });
  },
  setCircleUnreadCount: (count) => {
    set({ circleUnreadCount: Math.max(0, count) });
  },
  resetUnreadCount: () => {
    set({ centerUnreadCount: 0, circleUnreadCount: 0 });
  },
  refreshUnreadCount: async (userId) => {
    if (!userId) {
      set({ centerUnreadCount: 0, circleUnreadCount: 0 });
      return { centerCount: 0, circleCount: 0 };
    }

    try {
      const [centerCount, circleCount] = await Promise.all([
        getUnreadNotificationCount(userId, { excludeTypes: ['like', 'comment'] }),
        getUnreadNotificationCount(userId, { types: ['like', 'comment'] }),
      ]);
      set({
        centerUnreadCount: Math.max(0, centerCount),
        circleUnreadCount: Math.max(0, circleCount),
      });
      return { centerCount, circleCount };
    } catch (error) {
      console.error('Failed to refresh unread notification count:', error);
      return { centerCount: 0, circleCount: 0 };
    }
  },
}));
