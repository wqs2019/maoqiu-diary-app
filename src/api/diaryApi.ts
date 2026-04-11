// 日记 API 接口定义
import { callFunction } from '../services/tcb';
import { Diary, DiaryListResponse, ScenarioType, MoodType, WeatherType, TagType } from '../types';

export { Diary, DiaryListResponse };

export interface DiaryListParams {
  page?: number;
  pageSize?: number;
  mood?: MoodType;
  scenario?: ScenarioType;
  startDate?: string;
  endDate?: string;
  tags?: TagType[];
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
export const getDiaryDetail = async (_id: string): Promise<Diary> => {
  const result = await callFunction<Diary>('getDiaryDetail', { _id });
  return result.data;
};

/**
 * 创建日记
 */
export const createDiary = async (data: Omit<Diary, '_id' | 'createdAt' | 'updatedAt'>): Promise<Diary> => {
  const result = await callFunction<Diary>('createDiary', data);
  return result.data;
};

/**
 * 更新日记
 */
export const updateDiary = async (_id: string, data: Partial<Diary>): Promise<Diary> => {
  const result = await callFunction<Diary>('updateDiary', { _id, ...data });
  return result.data;
};

/**
 * 删除日记
 */
export const deleteDiary = async (_id: string): Promise<void> => {
  await callFunction('deleteDiary', { _id });
};
