import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPreviewer } from '@/components/handDrawn/MediaPreviewer';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import feedbackService, { FeedbackData, FeedbackType } from '@/services/feedbackService';
import { useAuthStore } from '@/store/authStore';

type FeedbackFilter = FeedbackType | 'all';

const FILTER_OPTIONS: Array<{ key: FeedbackFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'bug', label: 'Bug' },
  { key: 'feature', label: '建议' },
  { key: 'other', label: '其他' },
];

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug 反馈',
  feature: '功能建议',
  other: '其他反馈',
  report_user: '用户举报',
};

const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: '#EF4444',
  feature: '#8B5CF6',
  other: '#F59E0B',
  report_user: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  rejected: '已驳回',
};

const getFeedbackKey = (item: FeedbackData) => item._id || `${item.userId}-${item.createdAt}-${item.type}`;

const dedupeFeedbacks = (items: FeedbackData[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getFeedbackKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const formatTime = (value?: string | number) => {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
};

const AdminUserFeedbackScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [filter, setFilter] = useState<FeedbackFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  const [previewMediaIndex, setPreviewMediaIndex] = useState<number | null>(null);

  const surfaceColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#FCE7F3';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';

  const loadFeedbacks = useCallback(
    async (nextPage = 1, replace = false) => {
      if (!user?._id || !user.isAdmin) {
        setFeedbacks([]);
        setHasMore(false);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      try {
        if (replace) {
          if (nextPage === 1) {
            setLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        const result = await feedbackService.getAdminUserFeedbackList({
          adminUserId: user._id,
          page: nextPage,
          pageSize: PAGE_SIZE,
          type: filter,
        });

        setFeedbacks((current) => {
          const nextList = replace
            ? dedupeFeedbacks(result.list || [])
            : dedupeFeedbacks([...(current || []), ...(result.list || [])]);

          setHasMore(nextList.length < (result.total || 0));
          return nextList;
        });
        setPage(nextPage);
      } catch (error) {
        console.error('Failed to load admin user feedbacks', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, user?._id, user?.isAdmin]
  );

  useFocusEffect(
    useCallback(() => {
      loadFeedbacks(1, true);
    }, [loadFeedbacks])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeedbacks(1, true);
  }, [loadFeedbacks]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) {
      return;
    }

    loadFeedbacks(page + 1, false);
  }, [hasMore, loadFeedbacks, loading, loadingMore, page]);

  const emptyDescription = useMemo(() => {
    if (filter === 'bug') {
      return '当前还没有用户提交 Bug 反馈。';
    }

    if (filter === 'feature') {
      return '当前还没有用户提交功能建议。';
    }

    if (filter === 'other') {
      return '当前还没有其他类型反馈。';
    }

    return '当前还没有用户反馈。';
  }, [filter]);

  const renderFeedbackItem = ({ item }: { item: FeedbackData }) => {
    const reporterName =
      item.reporterSnapshot?.nickname || item.reporterSnapshot?.phone || item.contact || item.userId || '匿名用户';
    const type = item.type || 'other';
    const typeColor = TYPE_COLORS[type] || TYPE_COLORS.other;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={[styles.feedbackCard, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => {
          setSelectedFeedback(item);
        }}
      >
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackHeaderLeft}>
            <Text style={[styles.reporterName, { color: textColor }]} numberOfLines={1}>
              {reporterName}
            </Text>
            <View style={[styles.typeTag, { backgroundColor: `${typeColor}1A` }]}>
              <Text style={[styles.typeTagText, { color: typeColor }]}>{TYPE_LABELS[type]}</Text>
            </View>
          </View>
          <Text style={[styles.feedbackTime, { color: subTextColor }]}>{formatTime(item.createdAt)}</Text>
        </View>

        <Text style={[styles.feedbackContent, { color: textColor }]} numberOfLines={3}>
          {item.content || '用户未填写内容'}
        </Text>

        <View style={styles.metaRow}>
          {item.contact ? (
            <Text style={[styles.metaText, { color: subTextColor }]} numberOfLines={1}>
              联系方式：{item.contact}
            </Text>
          ) : (
            <Text style={[styles.metaText, { color: subTextColor }]}>未留联系方式</Text>
          )}
          {item.media?.length ? (
            <Text style={[styles.metaText, { color: subTextColor }]}>附件 {item.media.length}</Text>
          ) : null}
          {item.status ? (
            <Text style={[styles.metaText, { color: subTextColor }]}>
              状态：{STATUS_LABELS[item.status] || item.status}
            </Text>
          ) : null}
        </View>

        <View style={styles.detailHintRow}>
          <Text style={[styles.detailHintText, { color: HEALING_COLORS.pink[500] }]}>点击查看详情</Text>
          <Feather name="chevron-right" size={16} color={HEALING_COLORS.pink[500]} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>用户反馈</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.centerState}>
          <Feather name="lock" size={44} color={subTextColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>当前账号无管理员权限</Text>
          <Text style={[styles.emptyDesc, { color: subTextColor }]}>
            只有 `admin_list` 中的账号才可以查看用户反馈列表。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>用户反馈</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <FlatList
        data={feedbacks}
        keyExtractor={getFeedbackKey}
        renderItem={renderFeedbackItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.2}
        onEndReached={handleLoadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>反馈池</Text>
              <Text style={[styles.sectionDesc, { color: subTextColor }]}>
                查看用户提交的 Bug、功能建议和其他问题反馈，便于统一排查和收敛需求。
              </Text>
            </View>

            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((option) => {
                const selected = option.key === filter;
                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.85}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? HEALING_COLORS.pink[500] : surfaceColor,
                        borderColor: selected ? HEALING_COLORS.pink[500] : borderColor,
                      },
                    ]}
                    onPress={() => {
                      if (option.key === filter) {
                        return;
                      }
                      setFilter(option.key);
                      setFeedbacks([]);
                      setHasMore(true);
                    }}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? '#FFFFFF' : textColor }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
              <Text style={[styles.loadingText, { color: subTextColor }]}>正在加载反馈列表...</Text>
            </View>
          ) : (
            <View style={styles.centerState}>
              <Feather name="inbox" size={42} color={subTextColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>暂无反馈</Text>
              <Text style={[styles.emptyDesc, { color: subTextColor }]}>{emptyDescription}</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
            </View>
          ) : null
        }
      />

      <Modal
        visible={!!selectedFeedback && previewMediaIndex === null}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setSelectedFeedback(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.detailCard,
              {
                backgroundColor: surfaceColor,
                borderColor,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: textColor }]}>反馈详情</Text>
              <TouchableOpacity
                style={styles.detailCloseButton}
                onPress={() => {
                  setSelectedFeedback(null);
                }}
              >
                <Feather name="x" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            {selectedFeedback ? (
              <ScrollView
                style={styles.detailScroll}
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>提交用户</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {selectedFeedback.reporterSnapshot?.nickname ||
                      selectedFeedback.reporterSnapshot?.phone ||
                      selectedFeedback.contact ||
                      selectedFeedback.userId ||
                      '匿名用户'}
                  </Text>
                </View>

                <View style={styles.detailMetaGrid}>
                  <View style={[styles.detailMetaItem, { backgroundColor: isDark ? '#171717' : '#FFF7ED' }]}>
                    <Text style={[styles.detailMetaLabel, { color: subTextColor }]}>类型</Text>
                    <Text
                      style={[
                        styles.detailMetaValue,
                        { color: TYPE_COLORS[selectedFeedback.type || 'other'] || TYPE_COLORS.other },
                      ]}
                    >
                      {TYPE_LABELS[selectedFeedback.type || 'other']}
                    </Text>
                  </View>
                  <View style={[styles.detailMetaItem, { backgroundColor: isDark ? '#171717' : '#FFF7ED' }]}>
                    <Text style={[styles.detailMetaLabel, { color: subTextColor }]}>状态</Text>
                    <Text style={[styles.detailMetaValue, { color: textColor }]}>
                      {STATUS_LABELS[selectedFeedback.status || 'pending'] || selectedFeedback.status || '待处理'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>提交时间</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{formatTime(selectedFeedback.createdAt)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>联系方式</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {selectedFeedback.contact || '用户未留下联系方式'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>反馈内容</Text>
                  <Text style={[styles.detailParagraph, { color: textColor }]}>
                    {selectedFeedback.content || '用户未填写内容'}
                  </Text>
                </View>

                {selectedFeedback.media?.length ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: subTextColor }]}>
                      附件信息（{selectedFeedback.media.length}）
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedFeedback.media.map((media, index) => {
                        const previewUri = media.thumbnail || media.uri;
                        const isVideo = media.type === 'video';

                        return (
                          <TouchableOpacity
                            key={`${previewUri}-${index}`}
                            activeOpacity={isVideo ? 1 : 0.88}
                            style={[
                              styles.mediaPreviewCard,
                              {
                                backgroundColor: isDark ? '#171717' : '#FFF7ED',
                                borderColor,
                              },
                            ]}
                            onPress={() => {
                              if (previewUri) {
                                setPreviewMediaIndex(index);
                              }
                            }}
                          >
                            {previewUri ? (
                              <Image source={{ uri: previewUri }} style={styles.mediaPreviewImage} resizeMode="cover" />
                            ) : (
                              <View style={[styles.mediaPreviewFallback, { backgroundColor: isDark ? '#222' : '#F3F4F6' }]}>
                                <Feather name={isVideo ? 'video' : 'image'} size={20} color={subTextColor} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {selectedFeedback._id ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: subTextColor }]}>反馈 ID</Text>
                    <Text style={[styles.detailIdText, { color: textColor }]}>{selectedFeedback._id}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <MediaPreviewer
        visible={previewMediaIndex !== null}
        media={selectedFeedback?.media || []}
        initialIndex={previewMediaIndex ?? 0}
        onClose={() => {
          setPreviewMediaIndex(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  headerContent: {
    marginBottom: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  feedbackHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  reporterName: {
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackTime: {
    fontSize: 12,
    marginTop: 2,
  },
  typeTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackContent: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  metaText: {
    fontSize: 12,
    marginRight: 12,
    marginBottom: 4,
  },
  detailHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  detailHintText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    height: '82%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(156,163,175,0.25)',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  detailCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  detailSection: {
    marginBottom: 18,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  detailParagraph: {
    fontSize: 15,
    lineHeight: 24,
  },
  detailMetaGrid: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  detailMetaItem: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
  },
  detailMetaLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  detailMetaValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  mediaPreviewCard: {
    width: 156,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  mediaPreviewImage: {
    width: '100%',
    height: 108,
    backgroundColor: '#F3F4F6',
  },
  mediaPreviewFallback: {
    width: '100%',
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIdText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default AdminUserFeedbackScreen;
