import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { RootStackParamList } from '@/navigation/RootNavigator';
import feedbackService, { FeedbackData, FeedbackStatus } from '@/services/feedbackService';
import { useAuthStore } from '@/store/authStore';

type ReviewFilter = FeedbackStatus | 'all';

const FILTER_OPTIONS: Array<{ key: ReviewFilter; label: string }> = [
  { key: 'pending', label: '待处理' },
  { key: 'resolved', label: '已处理' },
  { key: 'rejected', label: '已驳回' },
  { key: 'all', label: '全部' },
];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '待处理',
  resolved: '已处理',
  rejected: '已驳回',
};

const REASON_LABELS: Record<string, string> = {
  spam: '垃圾营销',
  abuse: '辱骂攻击',
  harassment: '骚扰威胁',
  pornography: '色情低俗',
  violence: '暴力违法',
  fraud: '诈骗欺诈',
  other: '其他原因',
};

const REVIEW_ACTIONS: Array<{ status: FeedbackStatus; label: string; color: string }> = [
  { status: 'resolved', label: '已处理', color: '#10B981' },
  { status: 'rejected', label: '驳回', color: '#EF4444' },
];
const PAGE_SIZE = 20;
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

const buildReviewSummary = (item: FeedbackData) => {
  if (item.source === 'block_auto') {
    return '系统已自动留痕，建议结合历史举报和公开内容复核。';
  }

  if (item.source === 'diary_recheck') {
    return '用户已修改违规笔记，等待管理员复审后决定解除或维持违规状态。';
  }

  if (item.targetDiaryId) {
    return '用户主动举报某篇公开笔记，若核实属实将下架该笔记并保留作者查看权限。';
  }

  return '用户主动提交举报，建议尽快完成初步审核。';
};

const getReviewTypeLabel = (item: FeedbackData) => {
  if (item.source === 'block_auto') {
    return '拉黑自动留痕';
  }

  if (item.source === 'diary_recheck') {
    return '笔记整改复审';
  }

  if (item.targetDiaryId) {
    return '笔记举报';
  }

  return '用户举报';
};

const getActionLabel = (item: FeedbackData, status: 'resolved' | 'rejected') => {
  if (item.source === 'diary_recheck') {
    return status === 'resolved' ? '解除违规' : '保持违规';
  }

  if (item.targetDiaryId) {
    return status === 'resolved' ? '判定违规' : '驳回举报';
  }

  return status === 'resolved' ? '已处理' : '驳回';
};

const isTerminalDiaryReport = (item: FeedbackData) => {
  const status = item.status === 'processing' ? 'pending' : item.status || 'pending';
  return !!item.targetDiaryId && (status === 'resolved' || status === 'rejected');
};

const getReasonSheetCopy = (item: FeedbackData, status: 'resolved' | 'rejected') => {
  if (item.source === 'diary_recheck') {
    return {
      title: status === 'resolved' ? '填写解除原因' : '填写维持原因',
      desc: '这段内容会展示给笔记作者，请说明为什么解除违规，或为什么仍需继续整改。',
      placeholder:
        status === 'resolved'
          ? '请填写解除违规的原因，用户会在站内信中看到这段说明'
          : '请填写维持违规的原因，用户会在站内信中看到这段说明',
    };
  }

  if (item.targetDiaryId) {
    return {
      title: status === 'resolved' ? '填写违规原因' : '填写驳回原因',
      desc: '这段内容会展示给举报发起人；若判定违规，笔记作者也会同步收到违规处理说明。',
      placeholder:
        status === 'resolved'
          ? '请填写判定违规的原因，举报人和作者都会收到这段说明'
          : '请填写驳回原因，举报人会在站内信中看到这段说明',
    };
  }

  return {
    title: status === 'resolved' ? '填写处理原因' : '填写驳回原因',
    desc: '这段内容会展示给举报发起人，请填写清晰、可理解的回复说明。',
    placeholder:
      status === 'resolved'
        ? '请填写处理原因，用户会在站内信中看到这段说明'
        : '请填写驳回原因，用户会在站内信中看到这段说明',
  };
};

const AdminModerationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'AdminModeration'>>();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const targetFeedbackId = route.params?.feedbackId;
  const initialStatus = route.params?.initialStatus;

  const [reviews, setReviews] = useState<FeedbackData[]>([]);
  const [focusedReview, setFocusedReview] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReviewFilter>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewReasonModalVisible, setReviewReasonModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ item: FeedbackData; status: 'resolved' | 'rejected' } | null>(
    null
  );
  const [reviewReason, setReviewReason] = useState('');

  const surfaceColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#FCE7F3';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const inputBgColor = isDark ? '#1A1A1A' : '#FFF7ED';

  const closeReviewReasonModal = useCallback(() => {
    setReviewReasonModalVisible(false);
    setPendingAction(null);
    setReviewReason('');
  }, []);

  const loadFocusedReview = useCallback(async () => {
    if (!user?._id || !user.isAdmin || !targetFeedbackId) {
      setFocusedReview(null);
      return null;
    }

    try {
      const result = await feedbackService.getAdminReviewDetail({
        adminUserId: user._id,
        feedbackId: targetFeedbackId,
      });
      setFocusedReview(result);
      return result;
    } catch (error) {
      console.error('Failed to load focused review', error);
      setFocusedReview(null);
      return null;
    }
  }, [targetFeedbackId, user?._id, user?.isAdmin]);

  const loadFirstPage = useCallback(
    async (nextFilter: ReviewFilter = statusFilter) => {
      if (!user?._id || !user.isAdmin) {
        setReviews([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setRefreshing(true);
        const result = await feedbackService.getAdminReviewList({
          adminUserId: user._id,
          page: 1,
          pageSize: PAGE_SIZE,
          status: nextFilter,
        });

        const nextList = result.list || [];
        setReviews(nextList);
        setPage(2);
        setHasMore(nextList.length === PAGE_SIZE);
        if (targetFeedbackId) {
          await loadFocusedReview();
        } else {
          setFocusedReview(null);
        }
      } catch (error: any) {
        Alert.alert('加载失败', error?.message || '获取审核列表失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadFocusedReview, statusFilter, targetFeedbackId, user?._id, user?.isAdmin]
  );

  useFocusEffect(
    useCallback(() => {
      const nextFilter = targetFeedbackId ? initialStatus || 'all' : statusFilter;
      if (nextFilter !== statusFilter) {
        setStatusFilter(nextFilter);
      }
      setLoading(true);
      setPage(1);
      setHasMore(true);
      loadFirstPage(nextFilter);
    }, [initialStatus, loadFirstPage, statusFilter, targetFeedbackId])
  );

  const loadMoreReviews = useCallback(async () => {
    if (!user?._id || !user.isAdmin || loadingMore || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const result = await feedbackService.getAdminReviewList({
        adminUserId: user._id,
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
      });
      const nextList = result.list || [];
      setReviews((prev) => [...prev, ...nextList]);
      setPage((prev) => prev + 1);
      setHasMore(nextList.length === PAGE_SIZE);
    } catch (error: any) {
      Alert.alert('加载失败', error?.message || '获取审核列表失败');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, statusFilter, user?._id, user?.isAdmin]);

  const handleChangeFilter = (nextFilter: ReviewFilter) => {
    if (nextFilter === statusFilter) {
      return;
    }

    setStatusFilter(nextFilter);
    setPage(1);
    setHasMore(true);
    setFocusedReview(null);
    loadFirstPage(nextFilter);
  };

  const handleOpenTargetDiary = useCallback(
    (item: FeedbackData) => {
      if (!item.targetDiaryId) {
        return;
      }

      navigation.navigate('CircleDetail', { _id: item.targetDiaryId });
    },
    [navigation]
  );

  const applyReviewStatus = useCallback(
    async (item: FeedbackData, nextStatus: FeedbackStatus, note: string) => {
      if (!user?._id || !item._id) {
        return;
      }

      const normalizedNote = note.trim();
      setUpdatingId(item._id);
      try {
        await feedbackService.updateAdminReviewStatus({
          adminUserId: user._id,
          feedbackId: item._id,
          status: nextStatus,
          reviewNote: normalizedNote,
        });

        setReviews((prev) =>
          prev.map((review) =>
            review._id === item._id
              ? {
                  ...review,
                  status: nextStatus,
                  reviewNote: normalizedNote,
                  reviewedBy: user._id,
                  reviewedAt: new Date().toISOString(),
                }
              : review
          )
        );
        setFocusedReview((prev) =>
          prev && prev._id === item._id
            ? {
                ...prev,
                status: nextStatus,
                reviewNote: normalizedNote,
                reviewedBy: user._id,
                reviewedAt: new Date().toISOString(),
              }
            : prev
        );
      } catch (error: any) {
        Alert.alert('更新失败', error?.message || '审核状态更新失败');
      } finally {
        setUpdatingId(null);
      }
    },
    [user?._id]
  );

  const handleUpdateStatus = async (item: FeedbackData, nextStatus: FeedbackStatus) => {
    if (!user?._id || !item._id || updatingId) {
      return;
    }

    if (isTerminalDiaryReport(item)) {
      return;
    }

    if (nextStatus === 'resolved' || nextStatus === 'rejected') {
      setPendingAction({ item, status: nextStatus });
      setReviewReason(item.reviewNote || '');
      setReviewReasonModalVisible(true);
      return;
    }

    const label = STATUS_LABELS[nextStatus];
    Alert.alert('更新审核状态', `确认将这条记录标记为“${label}”吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: async () => {
          applyReviewStatus(item, nextStatus, buildReviewSummary(item));
        },
      },
    ]);
  };

  const confirmReviewReason = async () => {
    if (!pendingAction) {
      return;
    }

    const trimmedReason = reviewReason.trim();
    if (!trimmedReason) {
      Alert.alert('请填写原因', '已处理或已驳回时必须填写处理原因，用户会在站内信中看到。');
      return;
    }

    await applyReviewStatus(pendingAction.item, pendingAction.status, trimmedReason);
    closeReviewReasonModal();
  };

  const emptyText = useMemo(() => {
    if (statusFilter === 'all') {
      return '暂无审核记录';
    }

    return `暂无${FILTER_OPTIONS.find((item) => item.key === statusFilter)?.label || '审核'}记录`;
  }, [statusFilter]);

  const displayReviews = useMemo(() => {
    if (!focusedReview?._id) {
      return reviews;
    }

    return [focusedReview, ...reviews.filter((item) => item._id !== focusedReview._id)];
  }, [focusedReview, reviews]);

  const renderFilter = ({ key, label }: { key: ReviewFilter; label: string }) => {
    const active = key === statusFilter;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.filterChip,
          {
            backgroundColor: active
              ? HEALING_COLORS.pink[500]
              : isDark
                ? '#2A2A2A'
                : '#F9FAFB',
            borderColor: active ? HEALING_COLORS.pink[500] : borderColor,
          },
        ]}
        onPress={() => handleChangeFilter(key)}
      >
        <Text style={[styles.filterText, { color: active ? '#FFFFFF' : subTextColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: FeedbackData }) => {
    const isAutoRecord = item.source === 'block_auto';
    const reporter =
      item.blockerSnapshot?.nickname ||
      item.reporterSnapshot?.nickname ||
      item.reporterSnapshot?.phone ||
      item.userId;
    const target =
      item.targetSnapshot?.nickname || item.targetSnapshot?.phone || item.targetUserId || '未知用户';
    const status = item.status === 'processing' ? 'pending' : item.status || 'pending';
    const isHighlighted = item._id === targetFeedbackId;
    const diaryTitle = item.targetDiarySnapshot?.title?.trim();
    const diaryExcerpt = item.targetDiarySnapshot?.content?.trim();

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: surfaceColor,
            borderColor: isHighlighted ? HEALING_COLORS.pink[500] : borderColor,
            borderWidth: isHighlighted ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              {getReviewTypeLabel(item)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    status === 'resolved'
                      ? '#DCFCE7'
                      : status === 'rejected'
                        ? '#FEE2E2'
                        : '#FCE7F3',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      status === 'resolved'
                        ? '#15803D'
                        : status === 'rejected'
                          ? '#B91C1C'
                          : HEALING_COLORS.pink[600],
                  },
                ]}
              >
                {STATUS_LABELS[status]}
              </Text>
            </View>
          </View>
          <Text style={[styles.timeText, { color: subTextColor }]}>{formatTime(item.createdAt)}</Text>
        </View>

        {isHighlighted ? (
          <View style={styles.highlightBadge}>
            <Text style={styles.highlightBadgeText}>来自通知定位</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Feather name="user" size={14} color={subTextColor} />
          <Text style={[styles.metaText, { color: subTextColor }]}>发起人：{reporter || '未知'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="shield" size={14} color={subTextColor} />
          <Text style={[styles.metaText, { color: subTextColor }]}>目标用户：{target}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="flag-outline" size={14} color={subTextColor} />
          <Text style={[styles.metaText, { color: subTextColor }]}>
            原因：{REASON_LABELS[item.reportReason || 'other'] || '其他原因'}
          </Text>
        </View>

        <Text style={[styles.contentText, { color: textColor }]}>
          {item.content || (isAutoRecord ? '用户触发拉黑，系统自动生成审核记录。' : '未填写说明')}
        </Text>

        {item.targetDiaryId ? (
          <View style={[styles.noteBox, { backgroundColor: isDark ? '#262626' : '#F5F3FF' }]}>
            <Text style={[styles.noteLabel, { color: subTextColor }]}>关联笔记</Text>
            <Text style={[styles.noteText, { color: textColor }]}>{diaryTitle || '无标题笔记'}</Text>
            {diaryExcerpt ? (
              <Text style={[styles.noteText, { color: subTextColor, marginTop: 6 }]} numberOfLines={3}>
                {diaryExcerpt}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.linkButton,
                {
                  backgroundColor: isDark ? '#312E81' : '#EEF2FF',
                },
              ]}
              onPress={() => handleOpenTargetDiary(item)}
            >
              <Ionicons name="open-outline" size={15} color={isDark ? '#C7D2FE' : '#4F46E5'} />
              <Text style={[styles.linkButtonText, { color: isDark ? '#C7D2FE' : '#4F46E5' }]}>
                查看被举报笔记
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {item.reviewNote ? (
          <View style={[styles.noteBox, { backgroundColor: isDark ? '#262626' : '#FFF7ED' }]}>
            <Text style={[styles.noteLabel, { color: subTextColor }]}>审核备注</Text>
            <Text style={[styles.noteText, { color: textColor }]}>{item.reviewNote}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {REVIEW_ACTIONS.map((action) => {
            const disabled =
              updatingId === item._id ||
              isTerminalDiaryReport(item) ||
              (!item.targetDiaryId && status === action.status);
            return (
              <TouchableOpacity
                key={action.status}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: disabled ? (isDark ? '#2A2A2A' : '#F3F4F6') : action.color,
                  },
                ]}
                disabled={disabled}
                onPress={() => handleUpdateStatus(item, action.status)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: disabled ? subTextColor : '#FFFFFF' },
                  ]}
                >
                  {updatingId === item._id && status !== action.status
                    ? '提交中'
                    : getActionLabel(item, action.status as 'resolved' | 'rejected')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>内容审核</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={44} color={subTextColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>当前账号无管理员权限</Text>
          <Text style={[styles.emptyDesc, { color: subTextColor }]}>
            只有 `admin_list` 中的账号才可以查看举报与治理审核列表。
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
        <Text style={[styles.headerTitle, { color: textColor }]}>内容审核</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.filterRow}>{FILTER_OPTIONS.map(renderFilter)}</View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[500]} />
        </View>
      ) : (
        <FlatList
          data={displayReviews}
          keyExtractor={(item) => item._id || `${item.userId}-${item.targetUserId}-${item.createdAt}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setPage(1);
            setHasMore(true);
            loadFirstPage();
          }}
          onEndReached={() => {
            loadMoreReviews();
          }}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Feather name="inbox" size={44} color={subTextColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>{emptyText}</Text>
              <Text style={[styles.emptyDesc, { color: subTextColor }]}>
                用户举报和拉黑自动留痕会出现在这里。
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={reviewReasonModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReviewReasonModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeReviewReasonModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: surfaceColor,
                  borderColor,
                  paddingBottom: Math.max(insets.bottom, 12) + 12,
                },
              ]}
            >
              <View
                style={[
                  styles.modalBottomFiller,
                  { backgroundColor: surfaceColor },
                ]}
              />
              <View style={[styles.modalHandle, { backgroundColor: isDark ? '#3A3A3A' : '#E5E7EB' }]} />
              {pendingAction ? (() => {
                const copy = getReasonSheetCopy(pendingAction.item, pendingAction.status);
                return (
                  <>
                    <Text style={[styles.modalTitle, { color: textColor }]}>{copy.title}</Text>
                    <Text style={[styles.modalDesc, { color: subTextColor }]}>{copy.desc}</Text>
                  </>
                );
              })() : null}
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: textColor,
                    borderColor,
                    backgroundColor: inputBgColor,
                  },
                ]}
                value={reviewReason}
                onChangeText={setReviewReason}
                placeholder={pendingAction ? getReasonSheetCopy(pendingAction.item, pendingAction.status).placeholder : '请填写处理原因'}
                placeholderTextColor={subTextColor}
                multiline
                maxLength={200}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={[styles.modalCounter, { color: subTextColor }]}>{reviewReason.length}/200</Text>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton, { borderColor }]}
                  onPress={closeReviewReasonModal}
                >
                  <Text style={[styles.modalCancelText, { color: subTextColor }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={confirmReviewReason}
                  disabled={Boolean(updatingId)}
                >
                  <Text style={styles.modalConfirmText}>{updatingId ? '提交中' : '确认提交'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DB2777',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    marginLeft: 8,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  noteBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  noteLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  linkButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
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
  footerLoading: {
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    maxHeight: '82%',
  },
  modalBottomFiller: {
    position: 'absolute',
    bottom: -500,
    left: 0,
    right: 0,
    height: 500,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalDesc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  modalInput: {
    marginTop: 14,
    minHeight: 124,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  modalCounter: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalConfirmButton: {
    backgroundColor: HEALING_COLORS.pink[500],
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AdminModerationScreen;
