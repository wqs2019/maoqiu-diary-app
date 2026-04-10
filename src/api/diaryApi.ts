// 日记 API 接口定义
import { callFunction } from '../services/tcb';

export interface Diary {
  id: string;
  title: string;
  content: string;
  mood: 'happy' | 'sad' | 'normal' | 'excited' | 'angry';
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  createdAt: string;
  updatedAt: string;
}

export interface DiaryListParams {
  page?: number;
  pageSize?: number;
  mood?: string;
  startDate?: string;
  endDate?: string;
}

export interface DiaryListResponse {
  list: Diary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取日记列表
 */
export const getDiaryList = async (params: DiaryListParams): Promise<DiaryListResponse> => {
  const result = await callFunction<DiaryListResponse>('getDiaryList', {
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    mood: params.mood,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return result.data;
};

/**
 * 获取日记详情
 */
export const getDiaryDetail = async (id: string): Promise<Diary> => {
  const result = await callFunction<Diary>('getDiaryDetail', { id });
  return result.data;
};

/**
 * 创建日记
 */
export const createDiary = async (data: Omit<Diary, 'id' | 'createdAt' | 'updatedAt'>): Promise<Diary> => {
  const result = await callFunction<Diary>('createDiary', data);
  return result.data;
};

/**
 * 更新日记
 */
export const updateDiary = async (id: string, data: Partial<Diary>): Promise<Diary> => {
  const result = await callFunction<Diary>('updateDiary', { id, ...data });
  return result.data;
};

/**
 * 删除日记
 */
export const deleteDiary = async (id: string): Promise<void> => {
  await callFunction('deleteDiary', { id });
};
