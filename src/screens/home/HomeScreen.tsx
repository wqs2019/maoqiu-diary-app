import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, PanResponder, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HEALING_COLORS, HAND_DRAWN_STYLES } from '../../config/handDrawnTheme';
import { MAOQIU_MASCOTS, MASCOT_INTERACTIONS } from '../../config/mascot';
import { ScenarioType, TimelineItem } from '../../types';
import { HandDrawnCard } from '../../components/handDrawn/HandDrawnCard';
import { HandDrawnButton } from '../../components/handDrawn/HandDrawnButton';
import { MascotCharacter } from '../../components/handDrawn/MascotCharacter';
import { ScenarioChip } from '../../components/handDrawn/ScenarioChip';
import { TimelineView } from '../../components/handDrawn/TimelineView';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | 'all'>('all');

  // 悬浮按钮拖动
  const panY = useRef(new Animated.Value(0)).current;
  const [fabBottom, setFabBottom] = useState(20);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panY.setOffset(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: panY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        // 计算新位置
        const newBottom = Math.max(20, Math.min(300, fabBottom - gestureState.dy));
        setFabBottom(newBottom);
        panY.setValue(0);
        panY.setOffset(0);
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

  const handleRefresh = () => {
    setRefreshing(true);
    // TODO: 刷新数据
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCreateDiary = (scenario?: ScenarioType) => {
    (navigation as any).navigate('EditDiary', { scenario: scenario || 'daily' });
  };

  const handleTimelineItemPress = (item: TimelineItem) => {
    // TODO: 跳转到日记详情
    console.log('Clicked item:', item);
  };

  // 模拟时间轴数据
  const timelineItems: TimelineItem[] = [
    {
      _id: '1',
      type: 'diary',
      title: '周末的咖啡馆时光',
      description: '发现了一家超级温馨的咖啡馆，手冲咖啡的味道很棒...',
      date: new Date().toISOString(),
      scenario: 'daily',
      mood: 'relaxed',
      location: '街角咖啡馆',
    },
    {
      _id: '2',
      type: 'diary',
      title: '《奥本海默》观影',
      description: '诺兰导演的又一力作，基里安·墨菲的表演太震撼了！',
      date: new Date(Date.now() - 86400000).toISOString(),
      scenario: 'movie',
      mood: 'touched',
    },
  ];

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
      <View style={styles.timelineContainer}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>时间轴</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>查看全部</Text>
          </TouchableOpacity>
        </View>

        <TimelineView items={timelineItems} onItemPress={handleTimelineItemPress} />
      </View>

      {/* 悬浮按钮 */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: fabBottom,
            transform: [{ translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
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
