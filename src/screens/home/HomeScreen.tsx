import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBackgroundBlobs } from '../../components/common/AnimatedBackgroundBlobs';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { TimelineView } from '../../components/handDrawn/TimelineView';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useVipGuard } from '../../hooks/useVipGuard';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';
import { ScenarioType, TimelineItem, Diary } from '../../types';

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { fetchUserInfo } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [yearLayouts, setYearLayouts] = useState<Record<string, number>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeYear, setActiveYear] = useState<string | null>(null);

  const { themeName, isDark } = useAppTheme();

  // 场景筛选状态
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | undefined>(undefined);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isNotebookModalVisible, setIsNotebookModalVisible] = useState(false);
  const newNotebookNameRef = useRef('');
  const newNotebookInputRef = useRef<TextInput>(null);

  // 记录是否是代码触发的滚动，避免 onScroll 冲突
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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
  const user = useAuthStore((state) => state.user);
  const userId = user?._id;

  const getNotebooks = useNotebookStore((state) => state.getNotebooks);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);
  const setCurrentNotebook = useNotebookStore((state) => state.setCurrentNotebook);
  const addNotebook = useNotebookStore((state) => state.addNotebook);
  const fetchNotebooks = useNotebookStore((state) => state.fetchNotebooks);

  // 监听当前用户的日记本数据和选中的日记本ID，以便在切换时触发重新渲染
  const userNotebooks = useNotebookStore((state) =>
    userId ? state.notebooksByUserId[userId] : undefined
  );
  const currentNotebookId = useNotebookStore((state) =>
    userId ? state.currentNotebookIdByUserId[userId] : undefined
  );

  const notebooks =
    userNotebooks && userNotebooks.length > 0 ? userNotebooks : userId ? getNotebooks(userId) : [];

  // 确保在 currentNotebookId 改变时能够获取到最新的 notebook
  const currentNotebook = notebooks.find((n) => n._id === currentNotebookId) ||
    notebooks[0] || { _id: 'default', name: '毛球日记', createdAt: '' };

  // 拉取用户的日记本数据
  useEffect(() => {
    if (userId) {
      fetchNotebooks(userId);
    }
  }, [userId, fetchNotebooks]);

  const {
    data: diaryList,
    isLoading,
    error,
    refetch,
  } = useDiaryList({
    page: 1,
    pageSize: 20,
    notebookId: currentNotebook._id,
    scenario: selectedScenario,
    keyword: debouncedSearchQuery || undefined,
    userId,
  });

  // 在首页挂载时获取最新的用户信息
  useEffect(() => {
    if (!user) {
      fetchUserInfo();
    }
  }, [fetchUserInfo, user]);

  // 悬浮按钮拖动
  const panY = useRef(new Animated.Value(0)).current;
  const lastPanY = useRef(0);
  const minTranslateY = -(height * 0.65); // 向上最多滑动区域
  const maxTranslateY = 0; // 向下最多滑动区域

  const { checkVipPermission } = useVipGuard();

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
    let timeGreeting = '';
    if (hour < 6) timeGreeting = '凌晨好';
    else if (hour < 12) timeGreeting = '上午好';
    else if (hour < 18) timeGreeting = '下午好';
    else timeGreeting = '晚上好';

    const name = user?.nickname || '毛球';
    return `${name}，${timeGreeting}`;
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
    if (!checkVipPermission('writeDiary')) {
      return;
    }
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
      date: diary.date || diary.createdAt || new Date().toISOString(),
      scenario: diary.scenario,
      mood: diary.mood,
      weather: diary.weather,
      location: diary.location,
      media: diary.media,
    };
  };

  // 从云端获取的时间轴数据
  const timelineItems: TimelineItem[] = diaryList?.list?.map(convertDiaryToTimelineItem) || [];

  // 获取所有唯一且降序排列的年份
  const availableYears = Array.from(
    new Set(timelineItems.map((item) => new Date(item.date).getFullYear().toString()))
  ).sort((a, b) => b.localeCompare(a));

  // 如果没有 activeYear 且有数据，默认选中最新的年份
  if (availableYears.length > 0 && activeYear === null) {
    setActiveYear(availableYears[0]);
  }

  const handleYearLayout = (year: string, y: number) => {
    setYearLayouts((prev) => ({ ...prev, [year]: y }));
  };

  const handleYearPress = (year: string) => {
    setActiveYear(year);
    const targetY = yearLayouts[year];
    if (targetY !== undefined && scrollViewRef.current) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      // 动画大约需要 300-500ms，之后释放锁定
      scrollTimeout.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Blobs */}
      {!isDark && <AnimatedBackgroundBlobs />}

      {/* Fixed Header & Search */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.titleRow}
              onPress={() => {
                setIsNotebookModalVisible(true);
              }}
            >
              <Text style={[styles.title, { color: isDark ? '#FFF' : '#333' }]}>
                {currentNotebook.name}
              </Text>
              <Ionicons name="chevron-down" size={20} color={isDark ? '#FFF' : '#333'} />
            </TouchableOpacity>
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.subtitleText}>生活明朗，万物可爱</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputWrapper,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFF',
                borderColor: isDark ? '#333' : '#E5E5EA',
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#FFF' : '#333' }]}
              placeholder="搜索你的回忆..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFF',
                borderColor: isDark ? '#333' : '#E5E5EA',
              },
              selectedScenario && styles.filterButtonActive,
            ]}
            onPress={() => {
              setIsFilterVisible(true);
            }}
          >
            {selectedScenario ? (
              <Text style={{ fontSize: 20 }}>{SCENARIO_TEMPLATES[selectedScenario].icon}</Text>
            ) : (
              <Ionicons name="funnel-outline" size={20} color={isDark ? '#FFF' : '#333'} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 场景筛选 Overlay */}
      <Modal
        visible={isFilterVisible}
        onClose={() => {
          setIsFilterVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#333' }]}>
                  筛选场景
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsFilterVisible(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterGrid}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedScenario && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedScenario(undefined);
                    setIsFilterVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !selectedScenario && styles.filterChipTextActive,
                    ]}
                  >
                    全部
                  </Text>
                </TouchableOpacity>

                {(Object.keys(SCENARIO_TEMPLATES) as ScenarioType[]).map((type) => {
                  const template = SCENARIO_TEMPLATES[type];
                  const isActive = selectedScenario === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        isActive && {
                          backgroundColor: template.color,
                          borderColor: template.color,
                        },
                      ]}
                      onPress={() => {
                        setSelectedScenario(isActive ? undefined : type);
                        setIsFilterVisible(false);
                      }}
                    >
                      <Text style={styles.filterChipEmoji}>{template.icon}</Text>
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {template.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* 日记本切换 Overlay */}
      <Modal
        visible={isNotebookModalVisible}
        onClose={() => {
          setIsNotebookModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#333' }]}>
                  我的日记本
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsNotebookModalVisible(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {notebooks.map((notebook, index) => (
                  <TouchableOpacity
                    key={notebook._id || `notebook-${index}`}
                    style={[
                      styles.notebookItem,
                      currentNotebook._id === notebook._id && styles.notebookItemActive,
                      {
                        backgroundColor: isDark ? '#2C2C2C' : '#FFF',
                        borderColor: isDark ? '#444' : '#F0F0F0',
                      },
                    ]}
                    onPress={() => {
                      if (userId) {
                        setCurrentNotebook(userId, notebook._id);
                        setIsNotebookModalVisible(false);
                      }
                    }}
                  >
                    {notebook.cover ? (
                      <Image source={{ uri: notebook.cover }} style={styles.notebookCover} />
                    ) : (
                      <View
                        style={[
                          styles.notebookCoverPlaceholder,
                          { backgroundColor: isDark ? '#333' : '#F5F5F5' },
                        ]}
                      >
                        <Ionicons
                          name="book"
                          size={28}
                          color={
                            currentNotebook._id === notebook._id
                              ? HEALING_COLORS.pink[500]
                              : isDark
                                ? '#AAA'
                                : '#999'
                          }
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.notebookItemText,
                        { color: isDark ? '#FFF' : '#333' },
                        currentNotebook._id === notebook._id && styles.notebookItemTextActive,
                      ]}
                    >
                      {notebook.name}
                    </Text>
                    {currentNotebook._id === notebook._id && (
                      <Ionicons name="checkmark" size={20} color={HEALING_COLORS.pink[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.addNotebookContainer}>
                <TextInput
                  ref={newNotebookInputRef}
                  style={[
                    styles.addNotebookInput,
                    {
                      color: isDark ? '#FFF' : '#333',
                      backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9',
                      borderColor: isDark ? '#444' : '#E5E5EA',
                    },
                  ]}
                  placeholder="新日记本名称..."
                  placeholderTextColor={isDark ? '#888' : '#999'}
                  defaultValue=""
                  onChangeText={(text) => {
                    newNotebookNameRef.current = text;
                  }}
                  maxLength={20}
                />
                <TouchableOpacity
                  style={styles.addNotebookBtn}
                  onPress={async () => {
                    if (!checkVipPermission('createNotebook', ()=>{
                      setIsNotebookModalVisible(false);
                    })) {
                      return;
                    }
                    const name = newNotebookNameRef.current.trim();
                    if (!name) {
                      toast.info('请输入日记本名称');
                      return;
                    }
                    if (userId) {
                      try {
                        const newNb = await addNotebook(userId, name);
                        setCurrentNotebook(userId, newNb._id);
                        newNotebookNameRef.current = '';
                        newNotebookInputRef.current?.clear();
                        setIsNotebookModalVisible(false);
                      } catch (e) {
                        console.error('新建日记本失败', e);
                        toast.error('新建日记本失败');
                      }
                    } else {
                      toast.error('请先登录');
                    }
                  }}
                >
                  <Text style={styles.addNotebookBtnText}>新建</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      <ScrollView
        ref={scrollViewRef}
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
        onScroll={(e) => {
          if (isProgrammaticScroll.current) return;

          const offsetY = e.nativeEvent.contentOffset.y;
          const layoutHeight = e.nativeEvent.layoutMeasurement.height;
          const contentHeight = e.nativeEvent.contentSize.height;

          let currentYear = availableYears[0];

          // 如果滚动到了底部，直接选中最后一个年份
          if (offsetY + layoutHeight >= contentHeight - 20) {
            currentYear = availableYears[availableYears.length - 1];
          } else {
            for (const year of availableYears) {
              if (yearLayouts[year] !== undefined && offsetY >= yearLayouts[year] - 50) {
                currentYear = year;
              }
            }
          }

          if (currentYear !== activeYear) {
            setActiveYear(currentYear);
          }
        }}
        scrollEventThrottle={16}
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
            <TimelineView
              items={timelineItems}
              onItemPress={handleTimelineItemPress}
              onYearLayouts={handleYearLayout}
            />
          </View>
        )}
      </ScrollView>

      {/* Year Selector / Timeline Scrubber on the Right */}
      {availableYears.length > 0 && (
        <View style={[styles.yearSelectorContainer, { backgroundColor: 'transparent' }]}>
          {availableYears.map((year) => (
            <TouchableOpacity
              key={year}
              style={styles.yearItem}
              onPress={() => {
                handleYearPress(year);
              }}
            >
              <Text
                style={[
                  styles.yearText,
                  { color: isDark ? '#AAA' : '#999' },
                  activeYear === year && styles.activeYearText,
                ]}
              >
                {year}
              </Text>
              {activeYear === year && <View style={styles.yearDot} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
          style={[
            styles.fab,
            isDark && {
              borderColor: '#121212',
              backgroundColor: HEALING_COLORS.pink[500],
              shadowColor: HEALING_COLORS.pink[500],
            },
          ]}
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
    marginBottom: 10,
    zIndex: 1,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    borderColor: '#E5E5EA',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: HEALING_COLORS.pink[400],
    borderColor: HEALING_COLORS.pink[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: HEALING_COLORS.pink[400],
    borderColor: HEALING_COLORS.pink[400],
  },
  filterChipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  yearSelectorContainer: {
    position: 'absolute',
    right: 8,
    top: '30%', // 上移一些避免与按钮重叠
    zIndex: 2,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  yearItem: {
    alignItems: 'center',
    marginVertical: 12, // 增加垂直间距
  },
  yearText: {
    fontSize: 12,
    color: '#CCC', // 默认淡灰色
    fontWeight: '500',
  },
  activeYearText: {
    fontSize: 14,
    color: HEALING_COLORS.pink[400], // 匹配粉色主题
    fontWeight: 'bold',
  },
  yearDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: HEALING_COLORS.pink[500],
    marginTop: 4,
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
  notebookCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  notebookCoverPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  notebookItemActive: {
    backgroundColor: '#FFF0F5',
    borderColor: HEALING_COLORS.pink[200],
  },
  notebookItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  notebookItemTextActive: {
    color: HEALING_COLORS.pink[500],
    fontWeight: '600',
  },
  addNotebookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 16,
  },
  addNotebookInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginRight: 12,
    fontSize: 14,
  },
  addNotebookBtn: {
    backgroundColor: HEALING_COLORS.pink[400],
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNotebookBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
