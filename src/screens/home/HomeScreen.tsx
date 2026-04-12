import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, PanResponder, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HEALING_COLORS, HAND_DRAWN_STYLES } from '../../config/handDrawnTheme';
import { MAOQIU_MASCOTS, MASCOT_INTERACTIONS } from '../../config/mascot';
import { ScenarioType, TimelineItem, Diary } from '../../types';
import { HandDrawnCard } from '../../components/handDrawn/HandDrawnCard';
import { HandDrawnButton } from '../../components/handDrawn/HandDrawnButton';
import { MascotCharacter } from '../../components/handDrawn/MascotCharacter';
import { ScenarioChip } from '../../components/handDrawn/ScenarioChip';
import { TimelineView } from '../../components/handDrawn/TimelineView';
import { useDiaryList } from '../../hooks/useDiaryQuery';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | 'all'>('all');

  // 从云端获取日记列表
  const { data: diaryList, isLoading, error, refetch } = useDiaryList({
    page: 1,
    pageSize: 20,
    scenario: selectedScenario === 'all' ? undefined : selectedScenario,
  });

  // 悬浮按钮拖动
  const pan = useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }).current;
  const lastPanY = useRef(0);
  const minTranslateY = -580; // 向上最多拖动 580px
  const maxTranslateY = 0;    // 向下最多拖动 0px
  const addRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // 重置为 0，准备新的拖动
      },
      onPanResponderMove: (e, gestureState) => {
        let newY = lastPanY.current + gestureState.dy;

        // Clamp - 限制范围
        if (newY < minTranslateY) newY = minTranslateY;
        if (newY > maxTranslateY) newY = maxTranslateY;

        pan.y.setValue(newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        let finalY = lastPanY.current + gestureState.dy;
        // Clamp - 限制范围
        if (finalY < minTranslateY) finalY = minTranslateY;
        if (finalY > maxTranslateY) finalY = maxTranslateY;
        lastPanY.current = finalY;
      },
    })
  ).current;

  // 获取当前时间段的问候语
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();

    for (const [key, value] of Object.entries(MASCOT_INTERACTIONS)) {
      const [start, end] = value.timeRange;
      if (key === 'night' ? hour >= start || hour < end : hour >= start && hour < end) {
        return value.messages[Math.floor(Math.random() * value.messages.length)];
      }
    }

    return '你好呀～';
  };

  const handleRefresh = async () => {
    console.log('[HomeScreen] handleRefresh called');
    setRefreshing(true);
    try {
      console.log('[HomeScreen] Calling refetch...');
      await refetch();
      console.log('[HomeScreen] Refetch completed');
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

  const handDrawnStyle = HAND_DRAWN_STYLES.soft;

  return (
    <View style={styles.container}>
      {/* 头部区域 */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            borderRadius: handDrawnStyle.borderRadius,
            backgroundColor: HEALING_COLORS.pink[50],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
            <Text style={styles.subGreeting}>记录生活的每一份美好 ✨</Text>
          </View>

          <MascotCharacter
            mascot={MAOQIU_MASCOTS[0]}
            expression="happy"
            size="small"
            animated
          />
        </View>

        {/* 快捷操作 */}
        <View style={styles.quickActions}>
          <HandDrawnButton
            title="写日记"
            icon="📝"
            onPress={() => handleCreateDiary('daily')}
            size="medium"
          />
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="camera-outline" size={24} color={HEALING_COLORS.pink[400]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={24} color={HEALING_COLORS.pink[400]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 场景筛选 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.scrollerContent}
      >
        <ScenarioChip
          type="daily"
          selected={selectedScenario === 'all'}
          onPress={() => setSelectedScenario('all')}
        />
        {(['travel', 'movie', 'outing', 'food', 'special'] as ScenarioType[]).map((type) => (
          <ScenarioChip
            key={type}
            type={type}
            selected={selectedScenario === type}
            onPress={() => setSelectedScenario(type)}
            count={Math.floor(Math.random() * 10)}
          />
        ))}
      </ScrollView>

      {/* 时间轴 */}
      <ScrollView
        style={styles.timelineScrollView}
        contentContainerStyle={styles.timelineScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
      >
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>时间轴</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>查看全部</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>加载失败，请稍后重试</Text>
          </View>
        ) : timelineItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>还没有日记记录</Text>
            <Text style={styles.emptySubText}>点击右下角"+"开始记录生活吧～</Text>
          </View>
        ) : (
          <TimelineView items={timelineItems} onItemPress={handleTimelineItemPress} />
        )}
      </ScrollView>

      {/* 悬浮按钮 */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: 20,
            transform: [{ translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View ref={addRef} collapsable={false}>
          <TouchableOpacity
            style={[
              styles.fab,
              {
                shadowColor: handDrawnStyle.shadowColor,
                shadowOpacity: handDrawnStyle.shadowOpacity,
                shadowRadius: handDrawnStyle.shadowRadius,
              },
            ]}
            onPress={() => handleCreateDiary()}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: HEALING_COLORS.pink[200],
  },
  scroller: {
    maxHeight: 60,
    marginBottom: 12,
  },
  scrollerContent: {
    paddingHorizontal: 16,
  },
  timelineScrollView: {
    flex: 1,
  },
  timelineScrollContent: {
    flexGrow: 1,
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  viewAll: {
    fontSize: 14,
    color: HEALING_COLORS.pink[400],
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: HEALING_COLORS.pink[400],
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#CCC',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: HEALING_COLORS.pink[400],
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
});

export default HomeScreen;
