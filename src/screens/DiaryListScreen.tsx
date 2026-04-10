// 日记列表页面示例 - 展示如何使用 React Query 管理服务端状态
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiaryList, useCreateDiary, useDeleteDiary } from '../hooks/useDiaryQuery';
import { COLORS, SPACING } from '../config/constant';
import type { Diary } from '../api/diaryApi';

interface DiaryCardProps {
  diary: Diary;
  onDelete: (id: string) => void;
}

// 日记卡片组件
const DiaryCard: React.FC<DiaryCardProps> = ({ diary, onDelete }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{diary.title}</Text>
        <View style={styles.cardIcons}>
          <Text>{diary.mood}</Text>
          <Text>{diary.weather}</Text>
        </View>
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>
        {diary.content}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(diary.createdAt).toLocaleDateString('zh-CN')}
        </Text>
        <TouchableOpacity onPress={() => onDelete(diary.id)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DiaryListScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 使用 React Query 获取日记列表（简单分页示例）
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDiaryList({ page, pageSize });

  // 创建日记突变
  const createMutation = useCreateDiary();

  // 删除日记突变
  const deleteMutation = useDeleteDiary();

  // 下拉刷新
  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  // 加载更多（简单分页）
  const handleLoadMore = () => {
    if (!isFetching && data && data.list.length < data.total) {
      setPage(prev => prev + 1);
    }
  };

  // 删除日记
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text>加载中...</Text>
      </View>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>加载失败：{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 渲染空状态
  if (!data?.list || data.list.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>暂无日记</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => createMutation.mutate({
            title: '新日记',
            content: '这是第一条日记',
            mood: 'happy',
            weather: 'sunny',
          })}
        >
          <Text style={styles.createButtonText}>创建第一条日记</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data.list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiaryCard diary={item} onDelete={handleDelete} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching && page > 1 ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.medium,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  cardIcons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  cardContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.small,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: SPACING.medium,
  },
  retryButton: {
    marginTop: SPACING.medium,
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.small,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.medium,
  },
  createButton: {
    marginTop: SPACING.medium,
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.small,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  createButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default DiaryListScreen;
