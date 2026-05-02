import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../../components/common/Toast';
import { CommentList } from '../../components/handDrawn/CommentList';
import { NineGridMedia } from '../../components/handDrawn/NineGridMedia';
import { ShareCardModal } from '../../components/handDrawn/ShareCardModal';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { useDiaryDetail, useDeleteDiary, useToggleFavorite } from '../../hooks/useDiaryQuery';
import { useVipGuard } from '../../hooks/useVipGuard';
import { FormatUtil } from '../../utils/format';

import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

type DiaryDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const DiaryDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<DiaryDetailRouteProp>();
  const { _id } = route.params;
  const toast = useToast();

  const { data: diary, isLoading, error, refetch } = useDiaryDetail(_id);
  const deleteMutation = useDeleteDiary();
  const toggleFavorite = useToggleFavorite();
  const { checkVipPermission } = useVipGuard();
  const user = useAuthStore((state) => state.user);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleToggleFavorite = async () => {
    if (!diary) return;

    // Optimistic UI updates feel better, but we'll show toast based on action
    const isNowFavorite = !diary.isFavorite;

    try {
      await toggleFavorite(_id, !!diary.isFavorite);

      if (isNowFavorite) {
        toast.success('已加入收藏');
      } else {
        toast.info('已取消收藏');
      }
    } catch (e) {
      toast.error('操作失败，请重试');
    }
  };

  const handleShare = () => {
    if (!diary) return;
    setShareModalVisible(true);
  };

  const handleDelete = () => {
    if (!checkVipPermission('writeDiary')) {
      return;
    }
    Alert.alert('确认删除', '删除后无法恢复，是否继续？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(_id, {
            onSuccess: () => {
              toast.success('删除成功');
              navigation.goBack();
            },
            onError: () => {
              toast.error('删除失败，请稍后重试');
            },
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error || !diary) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>日记加载失败</Text>
      </View>
    );
  }

  const scenario = SCENARIO_TEMPLATES[diary.scenario];
  const mood = getMoodConfig(diary.mood);
  const weather = getWeatherConfig(diary.weather);
  const formattedDate = FormatUtil.formatDateTime(diary.date || diary.createdAt);

  if (!scenario || !mood || !weather) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>数据格式错误</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[HEALING_COLORS.pink[400]]}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
      >
        <View style={[styles.mainContent, { paddingTop: 16 }]}>
          {/* Top Row: Scenario & Actions */}
          <View style={styles.topRow}>
            <View style={[styles.scenarioBadge, { backgroundColor: scenario.color + '15' }]}>
              <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
              <Text style={[styles.scenarioName, { color: scenario.color }]}>{scenario.name}</Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.favoriteBtn}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name={diary.isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={diary.isFavorite ? '#F59E0B' : '#D1D5DB'}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title} selectable>
            {diary.title || '无标题'}
          </Text>

          {/* Meta Info (Mood, Weather, Date, Location) */}
          <View style={styles.metaContainer}>
            <View style={styles.metaBadgeGroup}>
              <View style={[styles.metaBadge, { backgroundColor: mood.primary + '15' }]}>
                <Text style={styles.metaEmoji}>{mood.emoji}</Text>
                <Text style={[styles.metaText, { color: mood.primary }]}>{mood.label}</Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: weather.primary + '15' }]}>
                <Text style={styles.metaEmoji}>{weather.emoji}</Text>
                <Text style={[styles.metaText, { color: weather.primary }]}>{weather.label}</Text>
              </View>
            </View>

            <View style={styles.metaTextGroup}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaSecondaryText}>{formattedDate}</Text>
            </View>

            {diary.location && (
              <View style={styles.metaTextGroup}>
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <Text style={styles.metaSecondaryText}>{diary.location}</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Text Content */}
          <Text style={styles.content} selectable>
            {diary.content}
          </Text>

          {/* Media Attachments */}
          {diary.media && diary.media.length > 0 && (
            <View style={styles.mediaContainer}>
              <NineGridMedia
                media={diary.media}
                containerWidth={width - 40}
              />
            </View>
          )}
        </View>

        <View style={styles.thickDivider} />

        {/* Comments */}
        <View style={styles.commentsSection}>
          <CommentList
            comments={diary.comments || []}
            emptyText="还没有评论哦，快去圈子里和大家互动吧~"
            authorId={diary.userId}
          />
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.bottomBarAction} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color="#4B5563" />
          <Text style={styles.bottomBarActionText}>分享</Text>
        </TouchableOpacity>
        {diary.userId === user?._id && (
          <>
            <TouchableOpacity
              style={styles.bottomBarAction}
              onPress={() => {
                if (checkVipPermission('writeDiary')) {
                  navigation.navigate('EditDiary', { diaryId: _id });
                }
              }}
            >
              <Ionicons name="create-outline" size={24} color="#4B5563" />
              <Text style={styles.bottomBarActionText}>编辑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomBarAction} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.bottomBarActionText, { color: '#EF4444' }]}>删除</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Share Modal */}
      <ShareCardModal
        visible={shareModalVisible}
        diary={diary}
        onClose={() => {
          setShareModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mainContent: {
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scenarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scenarioIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  scenarioName: {
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteBtn: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 38,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  metaBadgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaSecondaryText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 24,
  },
  content: {
    fontSize: 17,
    lineHeight: 32,
    color: '#374151',
    letterSpacing: 0.5,
    textAlignVertical: 'top',
  },
  mediaContainer: {
    marginTop: 24,
  },
  thickDivider: {
    height: 8,
    backgroundColor: '#F9FAFB',
    marginVertical: 32,
  },
  commentsSection: {
    paddingHorizontal: 4, // CommentList component already has padding
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomBarAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomBarActionText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default DiaryDetailScreen;
