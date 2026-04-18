import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import * as notebookService from '../services/notebookService';

export interface Notebook {
  _id: string;
  name: string;
  createdAt: string;
}

interface NotebookState {
  notebooksByUserId: Record<string, Notebook[]>;
  currentNotebookIdByUserId: Record<string, string>;
  isLoading: boolean;

  fetchNotebooks: (userId: string) => Promise<void>;
  getNotebooks: (userId: string) => Notebook[];
  getCurrentNotebook: (userId: string) => Notebook;
  addNotebook: (userId: string, name: string) => Promise<Notebook>;
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
            const defaultNb = await notebookService.createNotebook(userId, '毛球日记');
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
          return [{ _id: 'default', name: '毛球日记', createdAt: new Date().toISOString() }];
        }
        return notebooks;
      },

      getCurrentNotebook: (userId: string) => {
        const notebooks = get().getNotebooks(userId);
        const currentId = get().currentNotebookIdByUserId[userId] || 'default';
        const notebook = notebooks.find((n) => n._id === currentId);
        return notebook || notebooks[0];
      },

      addNotebook: async (userId: string, name: string) => {
        // 先调用云端
        const newNotebook = await notebookService.createNotebook(userId, name);

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
