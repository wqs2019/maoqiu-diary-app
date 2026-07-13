import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPreviewer } from '../../components/handDrawn/MediaPreviewer';
import { LoadableImage } from '../../components/handDrawn/PhotoWall';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES, getAllScenarios } from '../../config/scenarioTemplates';
import { getMoodConfig } from '../../config/statusConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';
import { ScenarioType, Diary, MediaResource } from '../../types';
import { getThumbnailUrl } from '../../utils/image';

const { width } = Dimensions.get('window');
const GRID_SPACING = 12;
// 减去 0.1 或使用 Math.floor 防止浮点数精度问题导致在某些大屏机型（如 iPhone 16 Pro Max）上换行
const GRID_ITEM_WIDTH = Math.floor((width - GRID_SPACING * 5) / 4);
const PHOTO_GRID_SPACING = 8;
const PHOTO_SIZE = Math.floor((width - GRID_SPACING * 2 - 24 - PHOTO_GRID_SPACING * 2) / 3);
const HEATMAP_WEEKS = 24;
const HEATMAP_DAYS = 7;
const HEATMAP_CELL_SIZE = 14;
const HEATMAP_CELL_GAP = 1;

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0'
  )}`;

const getHeatLevel = (count: number, maxCount: number) => {
  if (count <= 0 || maxCount <= 0) return 0;

  const ratio = count / maxCount;
  if (ratio >= 0.85) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
};

const CategoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | 'all'>('all');
  const { isDark } = useAppTheme();

  const user = useAuthStore((state) => state.user);
  const userId = user?._id;

  const { data, isLoading, refetch, isRefetching } = useDiaryList({
    page: 1,
    pageSize: 300, // 获取更多数据以支持统计和热力图
    scenario: selectedScenario === 'all' ? undefined : selectedScenario,
    userId,
  });

  const diaries = data?.pages?.flatMap((page) => page.list) || [];
  const totalCount = data?.pages?.[0]?.total || 0;
  const scenarios = getAllScenarios();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
      }),
    [i18n.language]
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'narrow',
      }),
    [i18n.language]
  );

  // 处理统计和媒体数据
  const { allMedia, moodStats, heatmapWeeks, heatmapSummary } = useMemo(() => {
    const mediaList: MediaResource[] = [];
    const moodCounts: Record<string, number> = {};
    const diaryCountsByDate: Record<string, number> = {};

    diaries.forEach((d: Diary) => {
      if (d.media) {
        mediaList.push(...d.media);
      }
      if (d.mood) {
        moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
      }

      const rawDate = d.date || d.createdAt;
      if (!rawDate) {
        return;
      }

      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return;
      }

      const dateKey = formatDateKey(parsedDate);
      diaryCountsByDate[dateKey] = (diaryCountsByDate[dateKey] || 0) + 1;
    });

    const sortedMoods = Object.entries(moodCounts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const heatmapStartDate = new Date(today);
    heatmapStartDate.setDate(today.getDate() - today.getDay() - (HEATMAP_WEEKS - 1) * HEATMAP_DAYS);
    heatmapStartDate.setHours(0, 0, 0, 0);

    const heatmapDays = Array.from({ length: HEATMAP_WEEKS * HEATMAP_DAYS }, (_, index) => {
      const date = new Date(heatmapStartDate);
      date.setDate(heatmapStartDate.getDate() + index);
      const dateKey = formatDateKey(date);

      return {
        date,
        dateKey,
        count: diaryCountsByDate[dateKey] || 0,
      };
    });

    const maxHeatCount = heatmapDays.reduce((max, item) => Math.max(max, item.count), 0);

    const weeks = Array.from({ length: HEATMAP_WEEKS }, (_, weekIndex) => {
      const days = heatmapDays
        .slice(weekIndex * HEATMAP_DAYS, (weekIndex + 1) * HEATMAP_DAYS)
        .map((item) => ({
          ...item,
          level: getHeatLevel(item.count, maxHeatCount),
        }));

      return {
        monthLabel: monthFormatter.format(days[0].date),
        days,
      };
    });

    const monthLabels = weeks.map((week, weekIndex) => {
      const prevMonth = weekIndex > 0 ? weeks[weekIndex - 1].days[0].date.getMonth() : null;
      const currentMonth = week.days[0].date.getMonth();

      return prevMonth === currentMonth && weekIndex !== 0 ? '' : week.monthLabel;
    });

    const sparseMonthLabels = monthLabels.map((label, index) => {
      if (!label) return '';

      const previousVisibleIndex = monthLabels
        .slice(0, index)
        .reduce((lastIndex, currentLabel, currentIndex) => (currentLabel ? currentIndex : lastIndex), -99);

      return index - previousVisibleIndex < 3 ? '' : label;
    });

    const activeDays = heatmapDays.filter((item) => item.count > 0).length;
    const totalHeatmapCount = heatmapDays.reduce((sum, item) => sum + item.count, 0);
    const weekdayLabels = Array.from({ length: HEATMAP_DAYS }, (_, index) => {
      const sampleDate = new Date(2024, 0, 7 + index);
      return weekdayFormatter.format(sampleDate);
    });

    return {
      allMedia: mediaList,
      moodStats: sortedMoods,
      heatmapWeeks: weeks,
      heatmapSummary: {
        monthLabels: sparseMonthLabels,
        weekdayLabels,
        activeDays,
        totalHeatmapCount,
      },
    };
  }, [diaries, monthFormatter, weekdayFormatter]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111827' }]}>{t('categoryScreen.title')}</Text>
      <Text style={[styles.headerSubtitle, { color: isDark ? '#AAA' : '#6B7280' }]}>
        {t('categoryScreen.subtitle')}
      </Text>

      {/* 分类网格 */}
      <View style={styles.gridContainer}>
        <TouchableOpacity
          style={[
            styles.gridItem,
            { backgroundColor: isDark ? '#1E1E1E' : '#FFF' },
            selectedScenario === 'all' && [
              styles.gridItemSelected,
              {
                borderColor: isDark ? '#4A2533' : HEALING_COLORS.pink[400],
                backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[50],
              },
            ],
          ]}
          onPress={() => {
            setSelectedScenario('all');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
            <Ionicons name="apps" size={22} color={isDark ? '#AAA' : '#6B7280'} />
          </View>
          <Text
            style={[
              styles.gridItemText,
              { color: isDark ? '#AAA' : '#4B5563' },
              selectedScenario === 'all' && [
                styles.gridItemTextSelected,
                { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600] },
              ],
            ]}
            numberOfLines={1}
          >
            {t('homeScreen.all')}
          </Text>
        </TouchableOpacity>

        {scenarios.map((type) => {
          const scenario = SCENARIO_TEMPLATES[type];
          const isSelected = selectedScenario === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.gridItem,
                { backgroundColor: isDark ? '#1E1E1E' : '#FFF' },
                isSelected && [
                  styles.gridItemSelected,
                  {
                    borderColor: isDark ? '#4A2533' : HEALING_COLORS.pink[400],
                    backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[50],
                  },
                ],
              ]}
              onPress={() => {
                setSelectedScenario(type);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: scenario.color + (isDark ? '40' : '20') },
                ]}
              >
                <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
              </View>
              <Text
                style={[
                  styles.gridItemText,
                  { color: isDark ? '#AAA' : '#4B5563' },
                  isSelected && [
                    styles.gridItemTextSelected,
                    { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600] },
                  ],
                ]}
                numberOfLines={1}
              >
                {t(`scenario.${type}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { marginBottom: 12, color: isDark ? '#FFF' : '#111827' }]}>
        {t('categoryScreen.statsTitle')}
      </Text>
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFF',
              borderColor: isDark ? '#333' : '#F3F4F6',
            },
          ]}
        >
          <Ionicons name="document-text" size={22} color={HEALING_COLORS.pink[400]} />
          <Text style={[styles.statsValue, { color: isDark ? '#FFF' : '#111827' }]}>
            {totalCount}
          </Text>
          <Text style={[styles.statsLabel, { color: isDark ? '#AAA' : '#6B7280' }]}>{t('categoryScreen.diariesCount')}</Text>
        </View>
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFF',
              borderColor: isDark ? '#333' : '#F3F4F6',
            },
          ]}
        >
          <Ionicons name="images" size={22} color={HEALING_COLORS.pink[400]} />
          <Text style={[styles.statsValue, { color: isDark ? '#FFF' : '#111827' }]}>
            {allMedia.length}
          </Text>
          <View style={styles.statsLabelRow}>
            <Text style={[styles.statsLabel, { color: isDark ? '#AAA' : '#6B7280' }]}>
              {t('categoryScreen.mediaCount')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMoods = () => {
    if (moodStats.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text
          style={[styles.sectionTitle, { marginBottom: 12, color: isDark ? '#FFF' : '#111827' }]}
        >
          {t('categoryScreen.moodTitle')}
        </Text>
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFF',
              borderColor: isDark ? '#333' : '#F3F4F6',
            },
          ]}
        >
          {moodStats.map(({ mood, count }, index) => {
            const config = getMoodConfig(mood);
            const percent = Math.round((count / diaries.length) * 100);
            return (
              <View
                key={mood}
                style={[
                  styles.moodRow,
                  index !== 0 && [
                    styles.moodRowMargin,
                    { borderTopColor: isDark ? '#333' : '#F3F4F6' },
                  ],
                ]}
              >
                <Text style={styles.moodEmoji}>{config.emoji}</Text>
                <View style={styles.moodInfo}>
                  <View style={styles.moodTextRow}>
                    <Text style={[styles.moodLabel, { color: isDark ? '#FFF' : '#374151' }]}>
                      {config.label}
                    </Text>
                    <Text style={[styles.moodCount, { color: isDark ? '#AAA' : '#6B7280' }]}>
                      {t('categoryScreen.moodCount', { count, percent })}
                    </Text>
                  </View>
                  <View
                    style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${percent}%`, backgroundColor: config.primary },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPhotoWall = () => {
    if (allMedia.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111827' }]}>
            {t('categoryScreen.photoWallTitle')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PhotoWall', { scenario: selectedScenario })}
            style={styles.viewAllButton}
          >
            <Text style={[styles.viewAllText, { color: isDark ? '#AAA' : '#6B7280' }]}>
              {t('categoryScreen.viewAll')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={isDark ? '#AAA' : '#6B7280'} />
          </TouchableOpacity>
        </View>
        <View style={[styles.photoGrid, { backgroundColor: isDark ? '#1E1E1E' : '#FFF' }]}>
          {allMedia.slice(0, 9).map((media, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => {
                setPreviewIndex(index);
                setPreviewVisible(true);
              }}
              style={styles.photoItem}
            >
              <LoadableImage
                source={{ uri: getThumbnailUrl(media.thumbnail || media.uri, 300, 300) }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              {media.type === 'video' && (
                <View style={styles.mediaOverlay}>
                  <Ionicons name="play" size={20} color="#FFF" />
                </View>
              )}
              {media.type === 'livePhoto' && (
                <View style={styles.liveBadge}>
                  <Ionicons name="aperture" size={10} color="#FFF" />
                  <Text style={styles.liveBadgeText}>{t('categoryScreen.livePhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {allMedia.length > 9 && (
          <Text style={[styles.morePhotosText, { color: isDark ? '#AAA' : '#9CA3AF' }]}>
            {t('categoryScreen.morePhotosHint')}
          </Text>
        )}
      </View>
    );
  };

  const renderHeatmap = () => {
    if (heatmapWeeks.length === 0) return null;

    const heatmapColors = isDark
      ? ['#2A2A2A', '#4A2533', '#7A2E4B', '#B13E70', '#F472B6']
      : ['#F3F4F6', '#FBCFE8', '#F9A8D4', '#F472B6', '#DB2777'];
    const heatmapContentWidth =
      HEATMAP_WEEKS * HEATMAP_CELL_SIZE + (HEATMAP_WEEKS - 1) * HEATMAP_CELL_GAP;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111827' }]}>
              {t('categoryScreen.heatmapTitle')}
            </Text>
            <Text style={[styles.heatmapSubtitle, { color: isDark ? '#AAA' : '#6B7280' }]}>
              {t('categoryScreen.heatmapSummary', {
                days: heatmapSummary.activeDays,
                count: heatmapSummary.totalHeatmapCount,
              })}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heatmapCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFF',
              borderColor: isDark ? '#333' : '#F3F4F6',
            },
          ]}
        >
          <View style={styles.heatmapBodyRow}>
            <View style={styles.heatmapAxisColumn}>
              <View style={styles.heatmapWeekLabelSpacer} />
              <View style={styles.heatmapWeekLabels}>
                {heatmapSummary.weekdayLabels.map((label, index) => (
                  <Text
                    key={`weekday-${index}`}
                    style={[
                      styles.heatmapWeekdayText,
                      { color: isDark ? '#777' : '#9CA3AF' },
                      index % 2 === 0 && styles.heatmapWeekdayHidden,
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScrollContent}>
              <View>
                <View style={[styles.heatmapMonthLabels, { width: heatmapContentWidth }]}>
                  {heatmapSummary.monthLabels.map((label, index) =>
                    label ? (
                      <Text
                        key={`month-${index}`}
                        style={[
                          styles.heatmapMonthText,
                          {
                            color: isDark ? '#777' : '#9CA3AF',
                            left: index * (HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP),
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    ) : null
                  )}
                </View>

                <View style={styles.heatmapColumns}>
                  {heatmapWeeks.map((week, weekIndex) => (
                    <View key={`week-${weekIndex}`} style={styles.heatmapColumn}>
                      {week.days.map((day) => (
                        <View
                          key={day.dateKey}
                          style={[
                            styles.heatmapCell,
                            {
                              backgroundColor: heatmapColors[day.level],
                              borderColor: isDark ? '#2A2A2A' : '#FFFFFF',
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={styles.heatmapLegendRow}>
            <Text style={[styles.heatmapLegendText, { color: isDark ? '#777' : '#9CA3AF' }]}>
              {t('categoryScreen.heatmapLess')}
            </Text>
            <View style={styles.heatmapLegendScale}>
              {heatmapColors.map((color, index) => (
                <View
                  key={`legend-${index}`}
                  style={[
                    styles.heatmapCell,
                    styles.heatmapLegendCell,
                    {
                      backgroundColor: color,
                      borderColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.heatmapLegendText, { color: isDark ? '#777' : '#9CA3AF' }]}>
              {t('categoryScreen.heatmapMore')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#F9FAFB' },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
      >
        {renderHeader()}

        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
          </View>
        ) : diaries.length > 0 ? (
          <>
            {renderStats()}
            {renderMoods()}
            {renderHeatmap()}
            {renderPhotoWall()}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('categoryScreen.empty')}</Text>
          </View>
        )}
      </ScrollView>

      {allMedia.length > 0 && (
        <MediaPreviewer
          visible={previewVisible}
          media={allMedia.slice(0, 9)}
          initialIndex={previewIndex}
          onClose={() => {
            setPreviewVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: GRID_SPACING,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: GRID_SPACING,
    marginBottom: 16,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridItemSelected: {
    borderColor: HEALING_COLORS.pink[400],
    backgroundColor: HEALING_COLORS.pink[50],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  scenarioIcon: {
    fontSize: 18,
  },
  gridItemText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  gridItemTextSelected: {
    color: HEALING_COLORS.pink[600],
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: GRID_SPACING,
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  heatmapSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
    marginBottom: 2,
  },
  statsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodRowMargin: {
    marginTop: 16,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  moodInfo: {
    flex: 1,
  },
  moodTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  moodCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  heatmapCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heatmapBodyRow: {
    flexDirection: 'row',
  },
  heatmapAxisColumn: {
    width: 20,
    marginRight: 6,
  },
  heatmapWeekLabelSpacer: {
    height: 20,
  },
  heatmapMonthLabels: {
    position: 'relative',
    height: 20,
    marginBottom: 8,
  },
  heatmapMonthText: {
    position: 'absolute',
    fontSize: 11,
    letterSpacing: -0.2,
    color: '#9CA3AF',
  },
  heatmapScrollContent: {
    paddingRight: 4,
  },
  heatmapWeekLabels: {
    marginTop: 0,
  },
  heatmapWeekdayText: {
    height: HEATMAP_CELL_SIZE,
    marginBottom: HEATMAP_CELL_GAP,
    fontSize: 9,
    color: '#9CA3AF',
  },
  heatmapWeekdayHidden: {
    opacity: 0,
  },
  heatmapColumns: {
    flexDirection: 'row',
    columnGap: HEATMAP_CELL_GAP,
  },
  heatmapColumn: {
    rowGap: HEATMAP_CELL_GAP,
  },
  heatmapCell: {
    width: HEATMAP_CELL_SIZE,
    height: HEATMAP_CELL_SIZE,
    borderRadius: 3,
    borderWidth: 1,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  heatmapLegendText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  heatmapLegendScale: {
    flexDirection: 'row',
    marginHorizontal: 6,
    columnGap: 4,
  },
  heatmapLegendCell: {
    width: 10,
    height: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_SPACING,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  morePhotosText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default CategoryScreen;
