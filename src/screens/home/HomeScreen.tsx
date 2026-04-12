import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  PanResponder,
  Animated,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimelineView } from '../../components/handDrawn/TimelineView';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { ScenarioType, TimelineItem, Diary } from '../../types';

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // 简单的防抖处理，避免每次输入都触发网络请求
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(text);
    }, 500); // 500ms 延迟
  };

  // 从云端获取日记列表
  const {
    data: diaryList,
    isLoading,
    error,
    refetch,
  } = useDiaryList({
    page: 1,
    pageSize: 20,
    scenario: undefined,
    keyword: debouncedSearchQuery || undefined,
  });

  // 悬浮按钮拖动
  const panY = useRef(new Animated.Value(0)).current;
  const lastPanY = useRef(0);
  const minTranslateY = -(height * 0.65); // 向上最多滑动区域
  const maxTranslateY = 0; // 向下最多滑动区域

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // panY.setOffset(lastPanY.current);
        // panY.setValue(0);
      },
      onPanResponderMove: (e, gestureState) => {
        let newY = lastPanY.current + gestureState.dy;
        if (newY < minTranslateY) newY = minTranslateY;
        if (newY > maxTranslateY) newY = maxTranslateY;
        panY.setValue(newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        let finalY = lastPanY.current + gestureState.dy;
        if (finalY < minTranslateY) finalY = minTranslateY;
        if (finalY > maxTranslateY) finalY = maxTranslateY;
        lastPanY.current = finalY;
      },
    })
  ).current;

  // 获取当前时间段的问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const getFormattedDate = () => {
    const d = new Date();
    // 使用当前时间格式化，或者固定匹配设计图 2026年3月28日 星期六
    // const d = new Date('2026-03-28T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dayOfWeek = days[d.getDay()];
    return `${year}年${month}月${day}日 ${dayOfWeek}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateDiary = (scenario?: ScenarioType) => {
    (navigation as any).navigate('EditDiary', { scenario: scenario || 'daily' });
  };

  const handleTimelineItemPress = (item: TimelineItem) => {
    (navigation as any).navigate('DiaryDetail', { _id: item._id });
  };

  // 将云端数据转换为 TimelineItem 格式
  const convertDiaryToTimelineItem = (diary: Diary): TimelineItem => {
    return {
      _id: diary._id,
      type: 'diary',
      title: diary.title || '无标题',
      description: diary.content || '',
      date: diary.createdAt || new Date().toISOString(),
      scenario: diary.scenario,
      mood: diary.mood,
      location: diary.location,
    };
  };

  // 从云端获取的时间轴数据
  const timelineItems: TimelineItem[] = diaryList?.list?.map(convertDiaryToTimelineItem) || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobTopRight]} />
      <View style={[styles.blob, styles.blobBottomLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />
      <View style={[styles.blob, styles.blobBottomCenter]} />

      {/* Fixed Header & Search */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>毛球日记</Text>
              <Ionicons name="chevron-down" size={20} color="#333" />
            </View>
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.subtitleText}>生活明朗，万物可爱</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索你的回忆..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="funnel-outline" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Content Area */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>加载失败，请稍后重试</Text>
          </View>
        ) : timelineItems.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.ticketIcon}>🎫</Text>
            <Text style={styles.emptyStateText}>每个平凡的一天，值得被好好保存</Text>
          </View>
        ) : (
          <View style={styles.timelineWrapper}>
            <TimelineView items={timelineItems} onItemPress={handleTimelineItemPress} />
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            handleCreateDiary();
          }}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopLeft: {
    width: 250,
    height: 250,
    backgroundColor: '#FFF0F5', // Light pink
    top: -80,
    left: -80,
    opacity: 0.8,
  },
  blobTopRight: {
    width: 280,
    height: 280,
    backgroundColor: '#E6F7FF', // Light cyan/blue
    top: -50,
    right: -100,
    opacity: 0.8,
  },
  blobBottomLeft: {
    width: 300,
    height: 300,
    backgroundColor: '#FFFFE0', // Light yellow
    bottom: 50,
    left: -150,
    opacity: 0.6,
  },
  blobBottomRight: {
    width: 250,
    height: 250,
    backgroundColor: '#F3E5F5', // Light purple
    bottom: 100,
    right: -100,
    opacity: 0.8,
  },
  blobBottomCenter: {
    width: 400,
    height: 200,
    backgroundColor: '#E8F5E9', // Light green
    bottom: -100,
    alignSelf: 'center',
    opacity: 0.7,
  },
  fixedHeader: {
    paddingHorizontal: 20,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 4,
  },
  greetingText: {
    fontSize: 14,
    color: HEALING_COLORS.pink[400],
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    color: '#888',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 1,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginRight: 12,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    zIndex: 1,
  },
  loadingText: {
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
    minHeight: 300,
    zIndex: 1,
  },
  ticketIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timelineWrapper: {
    flex: 1,
    zIndex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFC0CB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC0CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  fabIcon: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
});

export default HomeScreen;
