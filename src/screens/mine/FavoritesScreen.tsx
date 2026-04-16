import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimelineView } from '../../components/handDrawn/TimelineView';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';
import { TimelineItem, Diary } from '../../types';
import { AnimatedBackgroundBlobs } from '../../components/common/AnimatedBackgroundBlobs';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const userId = user?._id;

  const { data: diaryList, isLoading, error } = useDiaryList({
    page: 1,
    pageSize: 100, // 收藏页暂不分页，获取尽可能多的数据
    userId,
    isFavorite: true,
  });

  const handleTimelineItemPress = (item: TimelineItem) => {
    navigation.navigate('DiaryDetail', { _id: item._id });
  };

  const convertDiaryToTimelineItem = (diary: Diary): TimelineItem => {
    return {
      _id: diary._id,
      type: 'diary',
      title: diary.title || '无标题',
      description: diary.content || '',
      date: diary.date || diary.createdAt || new Date().toISOString(),
      scenario: diary.scenario,
      mood: diary.mood,
      weather: diary.weather,
      location: diary.location,
      media: diary.media,
    };
  };

  const timelineItems: TimelineItem[] = diaryList?.list?.map(convertDiaryToTimelineItem) || [];

  return (
    <View style={styles.container}>
      <AnimatedBackgroundBlobs />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>收藏夹</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
          <Text style={styles.loadingText}>正在加载收藏...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>加载失败，请稍后重试</Text>
        </View>
      ) : timelineItems.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.ticketIcon}>🌟</Text>
          <Text style={styles.emptyStateText}>还没有收藏的日记</Text>
          <Text style={styles.emptyStateSubText}>去详情页点击右上角的星星收藏吧</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TimelineView items={timelineItems} onItemPress={handleTimelineItemPress} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 1,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 14,
    color: HEALING_COLORS.pink[400],
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ticketIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});

export default FavoritesScreen;