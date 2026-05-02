import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import * as notebookService from '../services/notebookService';

import { Notebook } from '../types';

interface NotebookState {
  notebooksByUserId: Record<string, Notebook[]>;
  currentNotebookIdByUserId: Record<string, string>;
  isLoading: boolean;

  fetchNotebooks: (userId: string) => Promise<void>;
  getNotebooks: (userId: string) => Notebook[];
  getCurrentNotebook: (userId: string) => Notebook;
  addNotebook: (userId: string, name: string, cover?: string, desc?: string, type?: 'private' | 'shared', inviteePhone?: string) => Promise<Notebook>;
  updateNotebook: (userId: string, notebookId: string, name: string, cover?: string, desc?: string) => Promise<void>;
  deleteNotebook: (userId: string, notebookId: string) => Promise<void>;
  unbindNotebook: (userId: string, notebookId: string) => Promise<void>;
  setCurrentNotebook: (userId: string, notebookId: string) => void;
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set, get) => ({
      notebooksByUserId: {},
      currentNotebookIdByUserId: {},
      isLoading: false,

      fetchNotebooks: async (userId: string) => {
        if (!userId) return;
        set({ isLoading: true });
        try {
          let notebooks = await notebookService.getNotebookList(userId);

          if (!notebooks || notebooks.length === 0) {
            // 云端如果没有，则创建一个默认的
            const defaultNb = await notebookService.createNotebook(userId, '毛球日记', true);
            notebooks = [defaultNb];
          }

          set((state) => ({
            notebooksByUserId: {
              ...state.notebooksByUserId,
              [userId]: notebooks,
            },
            isLoading: false,
          }));

          // 如果没有选中当前日记本，或者选中的日记本已不存在，则重置为第一个
          const currentId = get().currentNotebookIdByUserId[userId];
          if (!currentId || !notebooks.find((n) => n._id === currentId)) {
            get().setCurrentNotebook(userId, notebooks[0]._id);
          }
        } catch (error) {
          console.error('Fetch notebooks error:', error);
          set({ isLoading: false });
        }
      },

      getNotebooks: (userId: string) => {
        const notebooks = get().notebooksByUserId[userId];
        if (!notebooks || notebooks.length === 0) {
          return [
            {
              _id: 'default',
              name: '毛球日记',
              createdAt: new Date().toISOString(),
              isDefault: true,
            },
          ];
        }
        return notebooks;
      },

      getCurrentNotebook: (userId: string) => {
        const notebooks = get().getNotebooks(userId);
        const currentId = get().currentNotebookIdByUserId[userId] || 'default';
        const notebook = notebooks.find((n) => n._id === currentId);
        return notebook || notebooks[0];
      },

      addNotebook: async (userId: string, name: string, cover?: string, desc?: string, type?: 'private' | 'shared', inviteePhone?: string) => {
        // 先调用云端
        const newNotebook = await notebookService.createNotebook(userId, name, false, cover, desc, type, inviteePhone);

        // 更新本地 store
        const notebooks = get().getNotebooks(userId);
        set((state) => ({
          notebooksByUserId: {
            ...state.notebooksByUserId,
            [userId]: [...notebooks, newNotebook],
          },
          currentNotebookIdByUserId: {
            ...state.currentNotebookIdByUserId,
            [userId]: newNotebook._id, // 自动选中新日记本
          },
        }));
        return newNotebook;
      },

      updateNotebook: async (userId: string, notebookId: string, name: string, cover?: string, desc?: string) => {
        await notebookService.updateNotebook(notebookId, name, cover, desc);
        const notebooks = get().getNotebooks(userId);
        set((state) => ({
          notebooksByUserId: {
            ...state.notebooksByUserId,
            [userId]: notebooks.map((nb) => 
              nb._id === notebookId ? { ...nb, name, cover: cover !== undefined ? cover : nb.cover, desc: desc !== undefined ? desc : nb.desc } : nb
            ),
          },
        }));
      },

      deleteNotebook: async (userId: string, notebookId: string) => {
        const notebooks = get().getNotebooks(userId);
        const targetNotebook = notebooks.find((nb) => nb._id === notebookId);
        
        if (targetNotebook?.isDefault) {
          throw new Error('默认日记本不允许删除');
        }

        await notebookService.deleteNotebook(notebookId);
        const newNotebooks = notebooks.filter((nb) => nb._id !== notebookId);
        
        set((state) => {
          const currentId = state.currentNotebookIdByUserId[userId];
          return {
            notebooksByUserId: {
              ...state.notebooksByUserId,
              [userId]: newNotebooks,
            },
            // 如果删除的是当前选中的日记本，切换到第一个（或default）
            currentNotebookIdByUserId: {
              ...state.currentNotebookIdByUserId,
              [userId]: currentId === notebookId ? (newNotebooks[0]?._id || 'default') : currentId,
            },
          };
        });
      },

      unbindNotebook: async (userId: string, notebookId: string) => {
        const notebooks = get().getNotebooks(userId);
        const targetNotebook = notebooks.find((nb) => nb._id === notebookId);
        const isCreator = targetNotebook?.userId === userId;

        await notebookService.unbindSharedNotebook(notebookId, userId);
        
        if (isCreator) {
          // 如果是创建者解绑，保留该日记本，仅改变其状态
          set((state) => ({
            notebooksByUserId: {
              ...state.notebooksByUserId,
              [userId]: notebooks.map((nb) => 
                nb._id === notebookId ? { ...nb, status: 'unbound' } : nb
              ),
            },
          }));
        } else {
          // 如果是非创建者（被邀请者）解绑，该日记本应直接消失，切换到第一个（或default）
          const newNotebooks = notebooks.filter((nb) => nb._id !== notebookId);
          set((state) => {
            const currentId = state.currentNotebookIdByUserId[userId];
            return {
              notebooksByUserId: {
                ...state.notebooksByUserId,
                [userId]: newNotebooks,
              },
              currentNotebookIdByUserId: {
                ...state.currentNotebookIdByUserId,
                [userId]: currentId === notebookId ? (newNotebooks[0]?._id || 'default') : currentId,
              },
            };
          });
        }
      },

      setCurrentNotebook: (userId: string, notebookId: string) => {
        set((state) => ({
          currentNotebookIdByUserId: {
            ...state.currentNotebookIdByUserId,
            [userId]: notebookId,
          },
        }));
      },
    }),
    {
      name: 'notebook-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
