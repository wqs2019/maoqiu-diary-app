// 日记相关的 React Query Hooks
import { useAppQuery, useAppMutation, useQueryClient } from '../hooks/useQuery';
import * as diaryApi from '../services/diaryService';
import type { DiaryListParams } from '../services/diaryService';

/**
 * 获取日记列表 - 使用 React Query 管理服务端状态
 *
 * 特性：
 * - 自动缓存
 * - 后台自动刷新
 * - 加载状态管理
 * - 错误处理
 * - 分页支持
 *
 * @param params 查询参数
 * @example
 * const { data, isLoading, error, refetch, fetchNextPage, hasNextPage } = useDiaryList({ page: 1, pageSize: 10 });
 */
export const useDiaryList = (params: DiaryListParams = {}) => {
  return useAppQuery(
    // 查询键：用于缓存和失效
    ['diaryList', params],
    // 查询函数：实际的数据获取
    async () => {
      const result = await diaryApi.getDiaryList(params);
      return result;
    },
    {
      // 可选配置
      staleTime: 1000 * 60 * 1, // 1 分钟内数据不失效
      retry: 2, // 失败重试 2 次
    }
  );
};

/**
 * 获取日记详情
 *
 * @param id 日记 ID
 * @example
 * const { data: diary, isLoading } = useDiaryDetail('diary-id-123');
 */
export const useDiaryDetail = (id: string) => {
  return useAppQuery(['diaryDetail', id], () => diaryApi.getDiaryDetail(id), {
    enabled: !!id, // 仅当 id 存在时启用查询
    staleTime: 1000 * 60 * 10, // 10 分钟
    retry: false, // 失败不重试
  });
};

/**
 * 创建日记 - 使用 React Query 管理突变
 *
 * 特性：
 * - 自动更新缓存
 * - 乐观更新支持
 * - 错误回滚
 *
 * @example
 * const createMutation = useCreateDiary();
 * createMutation.mutate({ title: '新日记', content: '内容...', mood: 'happy', weather: 'sunny' });
 */
export const useCreateDiary = () => {
  const queryClient = useQueryClient();

  return useAppMutation(
    ['diary', 'create'],
    (data: Omit<diaryApi.Diary, '_id' | 'createdAt' | 'updatedAt'>) => diaryApi.createDiary(data),
    {
      // 突变成功后执行
      onSuccess: () => {
        // 使日记列表缓存失效，触发重新获取
        queryClient.invalidateQueries({ queryKey: ['diaryList'] });
      },
    }
  );
};

/**
 * 更新日记
 *
 * @example
 * const updateMutation = useUpdateDiary();
 * updateMutation.mutate({ id: 'diary-id', title: '更新后的标题' });
 */
export const useUpdateDiary = () => {
  const queryClient = useQueryClient();

  return useAppMutation(
    ['diary', 'update'],
    ({ id, ...data }: { id: string } & Partial<diaryApi.Diary>) => diaryApi.updateDiary(id, data),
    {
      onSuccess: (updatedDiary, variables) => {
        // 更新单个日记详情缓存
        queryClient.setQueryData(['diaryDetail', variables.id], updatedDiary);
        // 失效列表缓存
        queryClient.invalidateQueries({ queryKey: ['diaryList'] });
      },
    }
  );
};

/**
 * 删除日记
 *
 * @example
 * const deleteMutation = useDeleteDiary();
 * deleteMutation.mutate('diary-id');
 */
export const useDeleteDiary = () => {
  const queryClient = useQueryClient();

  return useAppMutation(['diary', 'delete'], (id: string) => diaryApi.deleteDiary(id), {
    onSuccess: (_, deletedId) => {
      // 不立即从缓存中移除日记详情，让其随组件卸载自然过期，避免详情页在退出动画期间闪烁“加载失败”
      // queryClient.removeQueries({ queryKey: ['diaryDetail', deletedId] });

      // 从列表中移除该日记（不触发网络查询，直接更新本地缓存刷新首页）
      queryClient.setQueriesData({ queryKey: ['diaryList'] }, (oldData: any) => {
        if (!oldData || !oldData.list) return oldData;
        return {
          ...oldData,
          list: oldData.list.filter((item: any) => item._id !== deletedId),
        };
      });
    },
  });
};
