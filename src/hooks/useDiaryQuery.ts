// 日记相关的 React Query Hooks
import React from 'react';

import { useAppQuery, useAppMutation, useQueryClient, useIsMutating } from '../hooks/useQuery';
import * as diaryApi from '../services/diaryService';
import type { DiaryListParams } from '../services/diaryService';
import { useAuthStore } from '../store/authStore';

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
      enabled: !!params.userId || !!params.isPublic, // 仅当 userId 存在或是公开查询时启用查询
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
  const userId = useAuthStore.getState().user?._id;

  return useAppQuery(['diaryDetail', id], () => diaryApi.getDiaryDetail(id, userId), {
    enabled: !!id, // 仅当 id 存在时启用查询
    staleTime: 1000 * 60 * 10, // 10 分钟
    retry: false, // 失败不重试
  });
};

/**
 * 获取日记统计数据（总数、连续打卡天数、徽章数）
 */
export const useDiaryStats = (userId?: string) => {
  const { data: allDiaryData, isLoading } = useDiaryList({
    page: 1,
    pageSize: 1000,
    userId,
  });

  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const stats = React.useMemo(() => {
    let totalDiaries = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let badges = 1;
    let unlockedBadges: string[] = [];

    if (allDiaryData?.list && allDiaryData.list.length > 0) {
      totalDiaries = allDiaryData.total || allDiaryData.list.length;

      const allDiariesMap: Record<string, boolean> = {};
      const uniqueMoods = new Set();

      let nightOwlCount = 0;
      let hasLongStory = false;
      let fullPhotosCount = 0;
      const uniqueLocations = new Set<string>();
      const weekendDates = new Set<string>();

      // 连续雨雪天辅助变量
      let maxRainySnowyStreak = 0;
      let currentRainySnowyStreak = 0;
      let lastRainySnowyDate: Date | null = null;

      // 预处理排序以计算按时间连续的状态（升序，旧的在前）
      const sortedDiaries = [...allDiaryData.list].sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      let tempStreak = 0;
      let lastDateForStreak: Date | null = null;

      sortedDiaries.forEach((diary: any) => {
        const d = new Date(diary.date);
        // Normalize time to midnight for streak calculation
        const currentDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (!lastDateForStreak) {
          tempStreak = 1;
        } else {
          const diffTime = Math.abs(currentDate.getTime() - lastDateForStreak.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
        }
        lastDateForStreak = currentDate;
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }

        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        allDiariesMap[dateKey] = true;

        if (diary.mood) {
          uniqueMoods.add(diary.mood);
        }

        // 9. 午夜守望者：累计 10 篇深夜日记
        if (diary.createdAt) {
          const createdHour = new Date(diary.createdAt).getHours();
          if (createdHour >= 0 && createdHour < 4) nightOwlCount++;
        }

        // 10. 洋洋洒洒：字数超 2000 且至少 3 张图
        if (
          !hasLongStory &&
          diary.content &&
          diary.content.length >= 2000 &&
          diary.media &&
          diary.media.length >= 3
        ) {
          hasLongStory = true;
        }

        // 11. 摄影大师：累计 5 篇含 9 张图的日记
        if (diary.media && diary.media.length >= 9) {
          fullPhotosCount++;
        }

        // 12. 风雨无阻：连续 3 天雨雪天日记
        if (diary.weather === 'rainy' || diary.weather === 'snowy') {
          if (!lastRainySnowyDate) {
            currentRainySnowyStreak = 1;
          } else {
            const diffTime = Math.abs(d.getTime() - lastRainySnowyDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              currentRainySnowyStreak++;
            } else if (diffDays > 1) {
              currentRainySnowyStreak = 1;
            }
          }
          lastRainySnowyDate = d;
          if (currentRainySnowyStreak > maxRainySnowyStreak) {
            maxRainySnowyStreak = currentRainySnowyStreak;
          }
        }

        // 13. 环游世界：至少 5 个不同地点
        if (diary.location && diary.location.trim() !== '') {
          uniqueLocations.add(diary.location.trim());
        }

        // 14. 完美的周末：收集所有打卡过的周末日期
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendDates.add(dateKey);
        }
      });

      // 计算完美的周末：连续 4 个周末（六日均有）
      // 注：不再回溯全部历史，只检查当前的连续状态，历史解锁的徽章已通过云端同步保留
      let hasPerfectWeekends = false;
      if (weekendDates.size >= 8) {
        let consecutivePerfectWeekends = 0;
        const today = new Date();
        const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 调整到最近的一个周日
        if (checkDate.getDay() !== 0) {
          checkDate.setDate(checkDate.getDate() - checkDate.getDay());
        }

        // 往前查最近的几个周末（只要当前连续达到 4 个即可）
        for (let i = 0; i < 5; i++) {
          const sundayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

          const saturday = new Date(checkDate);
          saturday.setDate(saturday.getDate() - 1);
          const saturdayStr = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${String(saturday.getDate()).padStart(2, '0')}`;

          if (weekendDates.has(sundayStr) && weekendDates.has(saturdayStr)) {
            consecutivePerfectWeekends++;
            if (consecutivePerfectWeekends >= 4) {
              hasPerfectWeekends = true;
              break;
            }
          } else {
            // 如果是本周（i === 0）且还没打卡，允许继续往前看上一周
            // 否则一旦断了就说明当前没有连续
            if (i > 0) {
              break;
            }
          }

          // 往前推一周
          checkDate.setDate(checkDate.getDate() - 7);
        }
      }

      const today = new Date();
      const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      while (true) {
        const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (allDiariesMap[dateKey]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (
            currentStreak === 0 &&
            checkDate.getTime() ===
              new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
          ) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      // 计算成就徽章数量
      unlockedBadges = ['badge_0']; // 默认始终拥有萌新徽章

      // 1. 初次见面：写下第 1 篇日记
      if (totalDiaries >= 1) unlockedBadges.push('badge_1');
      // 2. 渐入佳境：累计写满 10 篇日记
      if (totalDiaries >= 10) unlockedBadges.push('badge_2');
      // 3. 习惯养成：累计写满 30 篇日记
      if (totalDiaries >= 30) unlockedBadges.push('badge_3');
      // 4. 百日作家：累计写满 100 篇日记
      if (totalDiaries >= 100) unlockedBadges.push('badge_4');

      // 5. 连续打卡：3天
      if (maxStreak >= 3 || currentStreak >= 3) unlockedBadges.push('badge_5');
      // 6. 连续打卡：7天
      if (maxStreak >= 7 || currentStreak >= 7) unlockedBadges.push('badge_6');
      // 7. 连续打卡：21天
      if (maxStreak >= 21 || currentStreak >= 21) unlockedBadges.push('badge_7');

      // 8. 情绪大师：收集满 7 种不同心情
      if (uniqueMoods.size >= 7) unlockedBadges.push('badge_8');

      // 9. 午夜守望者：累计 10 篇深夜日记
      if (nightOwlCount >= 10) unlockedBadges.push('badge_9');
      // 10. 洋洋洒洒：单篇字数超 2000 且至少 3 张图
      if (hasLongStory) unlockedBadges.push('badge_10');
      // 11. 摄影大师：累计 5 篇含 9 张图的日记
      if (fullPhotosCount >= 5) unlockedBadges.push('badge_11');
      // 12. 风雨无阻：连续 3 天雨雪天日记
      if (maxRainySnowyStreak >= 3) unlockedBadges.push('badge_12');
      // 13. 环游世界：至少 5 个不同地点
      if (uniqueLocations.size >= 5) unlockedBadges.push('badge_13');
      // 14. 完美的周末：连续 4 个周末（六日均有）打卡
      if (hasPerfectWeekends) unlockedBadges.push('badge_14');

      badges = unlockedBadges.length;
    } else {
      unlockedBadges = ['badge_0']; // 保底的新手徽章
      badges = 1;
    }

    return { totalDiaries, currentStreak, maxStreak, badges, unlockedBadges };
  }, [allDiaryData]);

  React.useEffect(() => {
    if (!user?._id || !stats.unlockedBadges.length || user._id !== userId) return;

    const userBadges = user.unlockedBadges || {};
    let hasNew = false;
    const newBadges = { ...userBadges };
    const now = Date.now();

    stats.unlockedBadges.forEach((badgeId) => {
      if (!newBadges[badgeId]) {
        newBadges[badgeId] = now;
        hasNew = true;
      }
    });

    if (hasNew) {
      updateProfile(user._id, { unlockedBadges: newBadges }).catch((err) => {
        console.error('Failed to sync badges:', err);
      });
    }
  }, [stats.unlockedBadges.join(','), user]);

  const finalUnlockedBadges = React.useMemo(() => {
    // If checking current user's stats, merge with persistent badges
    if (user && user._id === userId) {
      const userBadges = user.unlockedBadges || {};
      const localBadges = stats.unlockedBadges;
      const merged = new Set([...Object.keys(userBadges), ...localBadges]);
      return Array.from(merged);
    }
    return stats.unlockedBadges;
  }, [user?.unlockedBadges, stats.unlockedBadges, user?._id, userId]);

  return { ...stats, unlockedBadges: finalUnlockedBadges, isLoading };
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
  const userId = useAuthStore.getState().user?._id;

  return useAppMutation(
    ['diary', 'update'],
    ({ id, ...data }: { id: string } & Partial<diaryApi.Diary>) => {
      if (!userId) throw new Error('用户未登录');
      return diaryApi.updateDiary(id, { ...data, userId });
    },
    {
      onSuccess: (updatedDiaryResult, variables) => {
        // 直接让详情页和列表页重新获取最新数据，不手动维护缓存
        queryClient.invalidateQueries({ queryKey: ['diaryDetail', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['diaryList'] });
      },
    }
  );
};

/**
 * 切换日记点赞状态
 */
export const useLikeDiary = () => {
  const queryClient = useQueryClient();
  const isMutating = useIsMutating({ mutationKey: ['diary', 'like'] });
  type LikeDiaryVariables = { id: string; userId: string; action: 'like' | 'unlike' };
  type LikeDiaryContext = {
    previousDetail?: diaryApi.Diary;
    previousLists: [readonly unknown[], diaryApi.DiaryListResponse | undefined][];
  };

  const toggleLikedState = (diary?: diaryApi.Diary) => (variables: LikeDiaryVariables) => {
    if (!diary) return diary;

    const likedUserIds = diary.likedUserIds || [];
    const hasLiked = likedUserIds.includes(variables.userId);

    return {
      ...diary,
      likedUserIds: hasLiked
        ? likedUserIds.filter((id) => id !== variables.userId)
        : [...likedUserIds, variables.userId],
    };
  };

  const mutation = useAppMutation(
    ['diary', 'like'],
    async ({ id, userId, action }: LikeDiaryVariables) => {
      const result = await diaryApi.likeDiary(id, userId, action);
      return result;
    },
    {
      onMutate: async (variables): Promise<LikeDiaryContext> => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: ['diaryDetail', variables.id] }),
          queryClient.cancelQueries({ queryKey: ['diaryList'] }),
        ]);

        const previousDetail = queryClient.getQueryData<diaryApi.Diary>([
          'diaryDetail',
          variables.id,
        ]);
        const previousLists = queryClient.getQueriesData<diaryApi.DiaryListResponse>({
          queryKey: ['diaryList'],
        });

        queryClient.setQueryData<diaryApi.Diary>(['diaryDetail', variables.id], (old) =>
          toggleLikedState(old)(variables)
        );

        queryClient.setQueriesData<diaryApi.DiaryListResponse>(
          { queryKey: ['diaryList'] },
          (old) => {
            if (!old?.list) return old;

            return {
              ...old,
              list: old.list.map((item) =>
                item._id === variables.id ? (toggleLikedState(item)(variables) ?? item) : item
              ),
            };
          }
        );

        return { previousDetail, previousLists };
      },
      onError: (_error, variables, context) => {
        if (!context) return;

        queryClient.setQueryData(['diaryDetail', variables.id], context.previousDetail);
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      },
      onSettled: (data, error, variables) => {
        // 无论成功还是失败，都重新获取最新数据，保证本地状态与服务器一致
        queryClient.invalidateQueries({ queryKey: ['diaryDetail', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['diaryList'] });
      },
    }
  );

  return { ...mutation, isGlobalMutating: isMutating > 0 };
};

/**
 * 评论日记
 */
export const useCommentDiary = () => {
  const queryClient = useQueryClient();

  return useAppMutation(
    ['diary', 'comment'],
    ({ id, comment }: { id: string; comment: any }) => diaryApi.commentDiary(id, comment),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['diaryDetail', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['diaryList'] });
      },
    }
  );
};

/**
 * 切换收藏状态
 */
export const useToggleFavorite = () => {
  const updateMutation = useUpdateDiary();

  return (id: string, currentStatus: boolean) => {
    return updateMutation.mutateAsync({
      id,
      isFavorite: !currentStatus,
    });
  };
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
  const userId = useAuthStore.getState().user?._id;

  return useAppMutation(['diary', 'delete'], (id: string) => {
    if (!userId) throw new Error('用户未登录');
    return diaryApi.deleteDiary(id, userId);
  }, {
    onSuccess: (_, deletedId) => {
      // 不立即从缓存中移除日记详情，让其随组件卸载自然过期，避免详情页在退出动画期间闪烁“加载失败”
      // queryClient.removeQueries({ queryKey: ['diaryDetail', deletedId] });

      // 从列表中移除该日记（不触发网络查询，直接更新本地缓存刷新首页）
      queryClient.setQueriesData({ queryKey: ['diaryList'] }, (oldData: any) => {
        if (!oldData?.list) return oldData;
        return {
          ...oldData,
          list: oldData.list.filter((item: any) => item._id !== deletedId),
        };
      });
    },
  });
};
