import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';
import { useNotebookStore } from '../store/notebookStore';
import { useNotificationStore } from '../store/notificationStore';
import CloudService from '../services/tcb';

const REMOTE_PUSH_ONLY_SOURCES = new Set([
  'diary_report',
  'user_report',
  'diary_recheck',
]);
const INTERACTION_NOTIFICATION_TYPES = new Set(['like', 'comment', 'follow']);

export const useNotificationWatcher = () => {
  const user = useAuthStore((state) => state.user);
  const watcherRef = useRef<any>(null);
  const latestPushTokenRef = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const resetUnreadCount = useNotificationStore((state) => state.resetUnreadCount);

  useEffect(() => {
    latestPushTokenRef.current = user?.pushToken;
  }, [user?.pushToken]);

  useEffect(() => {
    if (!user?._id) {
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
      }
      resetUnreadCount();
      return;
    }

    const startWatching = async () => {
      try {
        // 确保云开发应用已初始化并完成鉴权
        await CloudService.ensureAuth();
        const app = CloudService.getApp();
        if (!app) return;

        const db = app.database();

        // 监听未读的通知
        watcherRef.current = db.collection('notifications')
          .where({
            receiverId: user._id,
            isRead: false
          })
          .watch({
            onChange: (snapshot: any) => {
              if (snapshot.type === 'init') {
                // #region debug-point C:watcher-init
                void refreshUnreadCount(user._id).then((counts)=>fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'C',location:'useNotificationWatcher:onChange:init',msg:'[DEBUG] watcher init refresh complete',data:{userId:user._id,counts},ts:Date.now()})})).catch(()=>{});
                // #endregion
                return; // 初始加载不触发本地通知
              }

              // #region debug-point C:watcher-change
              void refreshUnreadCount(user._id).then((counts)=>fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'C',location:'useNotificationWatcher:onChange:change',msg:'[DEBUG] watcher change refresh complete',data:{userId:user._id,snapshotType:snapshot.type,counts,docChanges:(snapshot.docChanges||[]).map((change:any)=>({dataType:change.dataType,type:change.doc?.type,receiverId:change.doc?.receiverId,senderId:change.doc?.senderId,_id:change.doc?._id}))},ts:Date.now()})})).catch(()=>{});
              // #endregion

              // 只处理新增的文档
              const newDocs = snapshot.docChanges.filter((change: any) => change.dataType === 'add');
              
              newDocs.forEach((change: any) => {
                const notif = change.doc;
                const isAdminReviewNotification =
                  notif.type === 'system' &&
                  notif.extraData?.feedbackId &&
                  REMOTE_PUSH_ONLY_SOURCES.has(notif.extraData?.source);
                const isInteractionNotification = INTERACTION_NOTIFICATION_TYPES.has(notif.type);
                
                // 根据不同类型设置不同的通知文案
                let title = notif.title || '✨ 收到新通知';
                let body = notif.content || '你有一条新消息~';
                
                // 为了防止短时间内重复弹窗，使用一个简单的去重机制
                const notifId = notif._id || notif.id;
                if ((global as any).__lastNotifId === notifId) return;
                (global as any).__lastNotifId = notifId;

                // 避免重复通知：如果用户有了 pushToken，云端已经发了远程推送
                // 那么本地 watcher 就不需要再弹窗了，仅负责静默刷新 UI 即可
                // 不再特判模拟器，因为如果模拟器共享了带有 pushToken 的账号，云端仍会发送远程推送，
                // 特判会导致模拟器上出现本地+远程的重复弹窗。
                if (!latestPushTokenRef.current && !isAdminReviewNotification && !isInteractionNotification) {
                  // 触发本地系统通知
                  Notifications.scheduleNotificationAsync({
                    content: {
                      title,
                      body,
                      sound: true,
                      data: {
                        type: notif.type,
                        relatedId: notif.relatedId,
                        notebookId: notif.extraData?.notebookId,
                        feedbackId: notif.extraData?.feedbackId,
                        screen: notif.extraData?.screen,
                      }
                    },
                    trigger: null, // 立即触发
                  });
                }

                // 如果是邀请被接受、拒绝，或者解绑，则自动刷新日记本和日记列表
                // 注意：对于解绑，当前用户自己发起的解绑也会在云端修改后触发 watcher（如果不加以区分的话），
                // 但云端通知是发给 "otherId" 的，所以 receiverId 会是对方。
                // 只要收到发给自己的这些通知，就刷新：
                if (
                  (notif.type === 'system' && (notif.title === '共享邀请已接受' || notif.title === '共享邀请已拒绝')) ||
                  notif.type === 'unbind_shared_notebook'
                ) {
                  useNotebookStore.getState().fetchNotebooks(user._id);
                  queryClient.invalidateQueries({ queryKey: ['diaryList'] });
                }
              });
            },
            onError: (err: any) => {
              console.error('Watch notifications error:', err);
            }
          });
      } catch (error) {
        console.error('Failed to start notification watcher:', error);
      }
    };

    startWatching();

    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
      }
    };
  }, [queryClient, refreshUnreadCount, resetUnreadCount, user?._id]);
};
