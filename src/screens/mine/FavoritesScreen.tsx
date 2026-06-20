import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBackgroundBlobs } from '../../components/common/AnimatedBackgroundBlobs';
import { TimelineView } from '../../components/handDrawn/TimelineView';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';
import { TimelineItem, Diary } from '../../types';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const userId = user?._id;
  const { isDark } = useAppTheme();
  const surfaceColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const pageBackgroundColor = isDark ? '#121212' : '#FFF8FB';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(236,72,153,0.12)';
  const secondaryTextColor = isDark ? '#A1A1AA' : '#6B7280';
  const primaryTextColor = isDark ? '#F5F5F5' : '#1F2937';

  const {
    data: diaryList,
    isLoading,
    error,
    refetch,
  } = useDiaryList({
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
      authorInfo: diary.authorInfo,
    };
  };

  const timelineItems: TimelineItem[] = diaryList?.list?.map(convertDiaryToTimelineItem) || [];
  const favoriteCount = timelineItems.length;
  const coveredMonths = new Set(
    timelineItems.map((item) => {
      const date = new Date(item.date);
      return `${date.getFullYear()}-${date.getMonth() + 1}`;
    })
  ).size;
  const latestFavorite = timelineItems[0];

  const formatSummaryDate = (dateString?: string) => {
    if (!dateString) {
      return '暂无记录';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '最近更新';
    }

    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderStateCard = ({
    icon,
    iconColor,
    title,
    description,
    actionText,
    onAction,
    loading,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
    loading?: boolean;
  }) => (
    <View
      style={[
        styles.stateCard,
        {
          backgroundColor: surfaceColor,
          borderColor,
          shadowColor: isDark ? '#000' : HEALING_COLORS.pink[300],
        },
      ]}
    >
      <View
        style={[
          styles.stateIconWrap,
          { backgroundColor: isDark ? 'rgba(236,72,153,0.16)' : HEALING_COLORS.pink[50] },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={28} color={iconColor} />
        )}
      </View>
      <Text style={[styles.stateTitle, { color: primaryTextColor }]}>{title}</Text>
      <Text style={[styles.stateDescription, { color: secondaryTextColor }]}>{description}</Text>
      {!!actionText && !!onAction && (
        <TouchableOpacity
          style={[
            styles.stateAction,
            {
              backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : HEALING_COLORS.pink[100],
              borderColor: isDark ? 'rgba(236,72,153,0.28)' : HEALING_COLORS.pink[200],
            },
          ]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.stateActionText, { color: HEALING_COLORS.pink[600] }]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: pageBackgroundColor }]}>
      {!isDark && <AnimatedBackgroundBlobs />}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)',
                  borderColor,
                },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="返回上一页"
            >
              <Ionicons name="arrow-back" size={20} color={primaryTextColor} />
            </TouchableOpacity>

            <View
              style={[
                styles.countPill,
                {
                  backgroundColor: isDark ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.86)',
                  borderColor,
                },
              ]}
            >
              <Ionicons name="heart" size={14} color={HEALING_COLORS.pink[500]} />
              <Text style={[styles.countPillText, { color: primaryTextColor }]}>
                {favoriteCount} 篇收藏
              </Text>
            </View>
          </View>

          <View style={styles.headerTextBlock}>
            <Text style={[styles.eyebrow, { color: HEALING_COLORS.pink[500] }]}>Favorites</Text>
            <Text style={[styles.title, { color: primaryTextColor }]}>收藏夹</Text>
            <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
              把想反复回看的日记整理在一起，随时重温那些让你心动的片刻。
            </Text>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: surfaceColor,
                borderColor,
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[300],
              },
            ]}
          >
            <View style={styles.heroCardHeader}>
              <View
                style={[
                  styles.heroIconWrap,
                  { backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : HEALING_COLORS.pink[50] },
                ]}
              >
                <Ionicons name="sparkles" size={18} color={HEALING_COLORS.pink[500]} />
              </View>
              <Text style={[styles.heroCardTitle, { color: primaryTextColor }]}>你的珍藏回忆</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>{favoriteCount}</Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>已收藏日记</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>{coveredMonths}</Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>覆盖月份</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>
                  {formatSummaryDate(latestFavorite?.date)}
                </Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>最近收藏</Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            {renderStateCard({
              icon: 'heart-outline',
              iconColor: HEALING_COLORS.pink[500],
              title: '正在整理你的收藏',
              description: '我们正在加载那些被你标记为特别的日记，请稍候。',
              loading: true,
            })}
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            {renderStateCard({
              icon: 'cloud-offline-outline',
              iconColor: HEALING_COLORS.pink[500],
              title: '收藏加载失败',
              description: '网络可能有点不稳定，重新试一次通常就能恢复。',
              actionText: '重新加载',
              onAction: () => {
                void refetch();
              },
            })}
          </View>
        ) : timelineItems.length === 0 ? (
          <View style={styles.stateContainer}>
            {renderStateCard({
              icon: 'bookmark-outline',
              iconColor: HEALING_COLORS.pink[500],
              title: '这里还没有收藏',
              description: '去日记详情页点亮右上角星标，把值得反复回看的内容留在这里。',
              actionText: '返回看看',
              onAction: () => navigation.goBack(),
            })}
          </View>
        ) : (
          <View
            style={[
              styles.listShell,
              {
                backgroundColor: surfaceColor,
                borderColor,
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[200],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>最近收藏</Text>
                <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>
                  按时间归档展示，方便你快速回看过去的片段。
                </Text>
              </View>
              <View
                style={[
                  styles.sectionBadge,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : HEALING_COLORS.pink[50] },
                ]}
              >
                <Ionicons name="albums-outline" size={14} color={HEALING_COLORS.pink[500]} />
                <Text style={[styles.sectionBadgeText, { color: HEALING_COLORS.pink[600] }]}>
                  时间轴
                </Text>
              </View>
            </View>

            <TimelineView items={timelineItems} onItemPress={handleTimelineItemPress} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  countPillText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTextBlock: {
    marginTop: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
  },
  heroCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  heroCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: -4,
  },
  statItem: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 84,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  stateCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  stateDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateAction: {
    marginTop: 20,
    minWidth: 116,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  stateActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  listShell: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 8,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 230,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FavoritesScreen;
