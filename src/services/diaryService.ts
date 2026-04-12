// 日记服务层
import CloudService from './tcb';
import { Diary, DiaryListResponse, ScenarioType, MoodType, TagType } from '../types';

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
 * 云函数响应格式
 */
interface CloudFunctionResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * 获取日记列表
 */
export const getDiaryList = async (params: DiaryListParams): Promise<DiaryListResponse> => {
  console.log('[diaryService] Calling getDiaryList with params:', params);

  const result = await CloudService.callFunction<CloudFunctionResponse<DiaryListResponse>>(
    'diary',
    {
      action: 'list',
      data: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        mood: params.mood,
        scenario: params.scenario,
        startDate: params.startDate,
        endDate: params.endDate,
        tags: params.tags,
      },
    }
  );
  const cloudFunctionResult = result.data;
  return cloudFunctionResult.data;
};

/**
 * 获取日记详情
 */
export const getDiaryDetail = async (_id: string): Promise<Diary> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<Diary[]>>('diary', {
    action: 'get',
    data: { _id },
  });
  // 云函数返回的是数组，取第一个元素
  const diary = result.data.data[0];
  if (!diary) {
    throw new Error('日记不存在');
  }
  return diary;
};

/**
 * 创建日记
 */
export const createDiary = async (
  data: Omit<Diary, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Diary> => {
  const result = await CloudService.callFunction<Diary>('diary', {
    action: 'create',
    data,
  });
  return result.data;
};

/**
 * 更新日记
 */
export const updateDiary = async (_id: string, data: Partial<Diary>): Promise<Diary> => {
  const result = await CloudService.callFunction<Diary>('diary', {
    action: 'update',
    data: { _id, ...data },
  });
  return result.data;
};

/**
 * 删除日记
 */
export const deleteDiary = async (_id: string): Promise<void> => {
  const result = await CloudService.callFunction('diary', {
    action: 'delete',
    data: { _id },
  });
  return result.data;
};
