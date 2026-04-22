import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadableImage } from '../../components/handDrawn/PhotoWall';
import { MediaPreviewer } from '../../components/handDrawn/MediaPreviewer';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES, getAllScenarios } from '../../config/scenarioTemplates';
import { getMoodConfig } from '../../config/statusConfig';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';
import { ScenarioType, MediaResource } from '../../types';

import { useAppTheme } from '../../hooks/useAppTheme';

const { width } = Dimensions.get('window');
const GRID_SPACING = 16;
// 减去 0.1 或使用 Math.floor 防止浮点数精度问题导致在某些大屏机型（如 iPhone 16 Pro Max）上换行
const GRID_ITEM_WIDTH = Math.floor((width - GRID_SPACING * 4) / 3);
const PHOTO_GRID_SPACING = 8;
const PHOTO_SIZE = Math.floor((width - GRID_SPACING * 2 - 24 - PHOTO_GRID_SPACING * 2) / 3);

const CategoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | 'all'>('all');
  const { isDark, colors } = useAppTheme();

  const user = useAuthStore((state) => state.user);
  const userId = user?._id;

  const { data, isLoading, refetch, isRefetching } = useDiaryList({
    page: 1,
    pageSize: 100, // 获取较多数据以支持统计
    scenario: selectedScenario === 'all' ? undefined : selectedScenario,
    userId,
  });

  const diaries = data?.list || [];
  const totalCount = data?.total || 0;
  const scenarios = getAllScenarios();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 处理统计和媒体数据
  const { allMedia, moodStats } = useMemo(() => {
    const mediaList: MediaResource[] = [];
    const moodCounts: Record<string, number> = {};

    diaries.forEach((d) => {
      if (d.media) {
        mediaList.push(...d.media);
      }
      if (d.mood) {
        moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
      }
    });

    const sortedMoods = Object.entries(moodCounts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);

    return { allMedia: mediaList, moodStats: sortedMoods };
  }, [diaries]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111827' }]}>生活洞察</Text>
      <Text style={[styles.headerSubtitle, { color: isDark ? '#AAA' : '#6B7280' }]}>按场景回顾你的美好生活</Text>

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
            <Ionicons name="apps" size={28} color={isDark ? '#AAA' : '#6B7280'} />
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
          >
            全部
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
              <View style={[styles.iconContainer, { backgroundColor: scenario.color + (isDark ? '40' : '20') }]}>
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
              >
                {scenario.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { marginBottom: 12, color: isDark ? '#FFF' : '#111827' }]}>数据概览</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statsCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#F3F4F6' }]}>
          <Ionicons name="document-text" size={28} color={HEALING_COLORS.pink[400]} />
          <Text style={[styles.statsValue, { color: isDark ? '#FFF' : '#111827' }]}>{totalCount}</Text>
          <Text style={[styles.statsLabel, { color: isDark ? '#AAA' : '#6B7280' }]}>篇日记</Text>
        </View>
        <View style={[styles.statsCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#F3F4F6' }]}>
          <Ionicons name="images" size={28} color={HEALING_COLORS.pink[400]} />
          <Text style={[styles.statsValue, { color: isDark ? '#FFF' : '#111827' }]}>{allMedia.length}</Text>
          <View style={styles.statsLabelRow}>
            <Text style={[styles.statsLabel, { color: isDark ? '#AAA' : '#6B7280' }]}>图片/视频总数</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMoods = () => {
    if (moodStats.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { marginBottom: 12, color: isDark ? '#FFF' : '#111827' }]}>心情晴雨表</Text>
        <View style={[styles.cardContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#F3F4F6' }]}>
          {moodStats.map(({ mood, count }, index) => {
            const config = getMoodConfig(mood);
            const percent = Math.round((count / diaries.length) * 100);
            return (
              <View key={mood} style={[styles.moodRow, index !== 0 && [styles.moodRowMargin, { borderTopColor: isDark ? '#333' : '#F3F4F6' }]]}>
                <Text style={styles.moodEmoji}>{config.emoji}</Text>
                <View style={styles.moodInfo}>
                  <View style={styles.moodTextRow}>
                    <Text style={[styles.moodLabel, { color: isDark ? '#FFF' : '#374151' }]}>{config.label}</Text>
                    <Text style={[styles.moodCount, { color: isDark ? '#AAA' : '#6B7280' }]}>
                      {count}次 ({percent}%)
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
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
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111827' }]}>时光相册</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PhotoWall', { scenario: selectedScenario })}
            style={styles.viewAllButton}
          >
            <Text style={[styles.viewAllText, { color: isDark ? '#AAA' : '#6B7280' }]}>查看全部</Text>
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
                source={{ uri: media.thumbnail || media.uri }}
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
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {allMedia.length > 9 && (
          <Text style={[styles.morePhotosText, { color: isDark ? '#AAA' : '#9CA3AF' }]}>只展示最近 9 个瞬间，更多请在日记中查看~</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
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
            {renderPhotoWall()}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>这个分类下还没有记录哦</Text>
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
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioIcon: {
    fontSize: 24,
  },
  gridItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: 13,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
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
