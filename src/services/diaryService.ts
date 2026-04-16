// 日记服务层
import CloudService from './tcb';
import { Diary, DiaryListResponse, ScenarioType, MoodType, TagType } from '../types';

export { Diary, DiaryListResponse };

export interface DiaryListParams {
  page?: number;
  pageSize?: number;
  notebookId?: string;
  mood?: MoodType;
  scenario?: ScenarioType;
  startDate?: string;
  endDate?: string;
  tags?: TagType[];
  keyword?: string;
  userId?: string;
  isFavorite?: boolean;
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
        notebookId: params.notebookId,
        mood: params.mood,
        scenario: params.scenario,
        startDate: params.startDate,
        endDate: params.endDate,
        tags: params.tags,
        keyword: params.keyword,
        userId: params.userId,
        isFavorite: params.isFavorite,
      },
    }
  );

  // CloudService.callFunction 会把 result.data 也就是 { success: true, data: { list, total, page, pageSize } }
  // 或者 { code: 0, message: '', data: { success: true, data: ... } } 返回给我们
  const cloudFunctionResult = result.data;

  // 检查 cloudFunctionResult 是否已经是期望的数据格式（或者包裹了一层 data）
  if (
    cloudFunctionResult &&
    cloudFunctionResult.data &&
    Array.isArray((cloudFunctionResult.data as any).list)
  ) {
    return cloudFunctionResult.data as unknown as DiaryListResponse;
  }

  // 处理可能嵌套一层的场景
  if (cloudFunctionResult && Array.isArray((cloudFunctionResult as any).list)) {
    return cloudFunctionResult as unknown as DiaryListResponse;
  }

  // 默认返回空结构以防 undefined
  return {
    list: [],
    total: 0,
    page: params.page || 1,
    pageSize: params.pageSize || 10,
  };
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
