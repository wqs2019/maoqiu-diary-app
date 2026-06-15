import { create } from 'zustand';

import { getUnreadNotificationCount } from '../services/notificationService';

const CIRCLE_INTERACTION_TYPES = ['like', 'comment', 'follow'] as const;

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
        getUnreadNotificationCount(userId, { excludeTypes: [...CIRCLE_INTERACTION_TYPES] }),
        getUnreadNotificationCount(userId, { types: [...CIRCLE_INTERACTION_TYPES] }),
      ]);
      // #region debug-point B:refresh-unread-success
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'B',location:'notificationStore.refreshUnreadCount:success',msg:'[DEBUG] unread count refreshed',data:{userId,centerCount,circleCount,interactionTypes:[...CIRCLE_INTERACTION_TYPES]},ts:Date.now()})}).catch(()=>{});
      // #endregion
      set({
        centerUnreadCount: Math.max(0, centerCount),
        circleUnreadCount: Math.max(0, circleCount),
      });
      return { centerCount, circleCount };
    } catch (error) {
      // #region debug-point B:refresh-unread-error
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'B',location:'notificationStore.refreshUnreadCount:error',msg:'[DEBUG] unread count refresh failed',data:{userId,error:error instanceof Error ? error.message : String(error)},ts:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Failed to refresh unread notification count:', error);
      return { centerCount: 0, circleCount: 0 };
    }
  },
}));
