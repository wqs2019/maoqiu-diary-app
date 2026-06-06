import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDiaryList } from '@/hooks/useDiaryQuery';
import { useAuthStore } from '@/store/authStore';
import { Diary } from '@/types';
import { FormatUtil } from '@/utils/format';

const getReportDiaryTitle = (diary: Diary): string => {
  const title = diary.title?.trim();
  if (title) return title;

  const content = diary.content?.trim();
  if (content) return content.slice(0, 24);

  return '未命名公开笔记';
};

const ReportDiaryPickerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, selectedDiaryId } = route.params || {};
  const { isDark } = useAppTheme();
  const currentUser = useAuthStore((state) => state.user);

  const { data, isLoading, refetch, isRefetching } = useDiaryList({
    page: 1,
    pageSize: 100,
    userId,
    isPublic: true,
    viewerId: currentUser?._id,
  });

  const diaries = data?.list || [];

  const handleSelectDiary = (item: Diary) => {
    const state = navigation.getState();
    const previousRoute = state.routes[state.routes.length - 2];

    if (previousRoute?.name === 'UserProfile') {
      navigation.dispatch({
        ...CommonActions.setParams({
          selectedReportDiary: {
            _id: item._id,
            title: item.title,
            content: item.content,
            mediaCount: item.media?.length || 0,
            createdAt: item.createdAt,
            date: item.date,
          },
        }),
        source: previousRoute.key,
      });
    }

    navigation.goBack();
  };

  const renderItem = ({ item }: { item: Diary }) => {
    const selected = selectedDiaryId === item._id;

    return (
      <TouchableOpacity
        style={[
          styles.diaryCard,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: selected ? HEALING_COLORS.pink[500] : isDark ? '#333' : '#E5E7EB',
          },
        ]}
        onPress={() => handleSelectDiary(item)}
      >
        <View style={styles.diaryHeader}>
          <Text
            style={[
              styles.diaryTitle,
              { color: selected ? HEALING_COLORS.pink[500] : isDark ? '#FFF' : '#111827' },
            ]}
            numberOfLines={1}
          >
            {getReportDiaryTitle(item)}
          </Text>
          {selected ? <Ionicons name="checkmark-circle" size={18} color={HEALING_COLORS.pink[500]} /> : null}
        </View>
        {!!item.content && (
          <Text
            style={[styles.diaryContent, { color: isDark ? '#AAA' : '#6B7280' }]}
            numberOfLines={3}
          >
            {item.content}
          </Text>
        )}
        <Text style={[styles.diaryMeta, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
          {FormatUtil.formatRelativeTime(item.createdAt || item.date)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color={HEALING_COLORS.pink[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
      <FlatList
        data={diaries}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerTip}>
            <Text style={[styles.headerTipTitle, { color: isDark ? '#FFF' : '#111827' }]}>
              选择一篇公开笔记
            </Text>
            <Text style={[styles.headerTipText, { color: isDark ? '#AAA' : '#6B7280' }]}>
              关联后，管理员可以结合该用户发布的公开内容更快定位问题。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={40} color={isDark ? '#555' : '#D1D5DB'} />
            <Text style={[styles.emptyText, { color: isDark ? '#AAA' : '#6B7280' }]}>
              该用户当前没有可关联的公开笔记
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerTip: {
    marginBottom: 12,
  },
  headerTipTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTipText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  diaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  diaryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  diaryContent: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  diaryMeta: {
    marginTop: 8,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default ReportDiaryPickerScreen;
