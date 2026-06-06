import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';

import { CommentList } from '@/components/handDrawn/CommentList';
import { NineGridMedia } from '@/components/handDrawn/NineGridMedia';
import { Modal as CommonModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { HEALING_COLORS, DARK_HEALING_COLORS } from '@/config/handDrawnTheme';
import { useDiaryDetail, useLikeDiary, useCommentDiary } from '@/hooks/useDiaryQuery';
import { useAppTheme } from '@/hooks/useAppTheme';
import feedbackService, { ReportReason } from '@/services/feedbackService';
import { useAuthStore } from '@/store/authStore';
import { FormatUtil } from '@/utils/format';

const { width } = Dimensions.get('window');
const REPORT_REASON_OPTIONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: '垃圾营销' },
  { value: 'abuse', label: '辱骂攻击' },
  { value: 'harassment', label: '骚扰他人' },
  { value: 'pornography', label: '色情低俗' },
  { value: 'violence', label: '暴力血腥' },
  { value: 'fraud', label: '诈骗欺诈' },
  { value: 'other', label: '其他原因' },
];

type CircleDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const CircleDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CircleDetailRouteProp>();
  const { _id } = route.params;
  const toast = useToast();

  const { isDark } = useAppTheme();
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;

  const { data: diary, isLoading, error, refetch } = useDiaryDetail(_id);
  const user = useAuthStore((state) => state.user);

  const likeMutation = useLikeDiary();
  const commentMutation = useCommentDiary();

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [replyToComment, setReplyToComment] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (diary) {
      setComments(diary.comments || []);
    }
  }, [diary]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleSendComment = () => {
    if (!commentText.trim() || !user) return;

    const newComment: any = {
      id: Date.now().toString(),
      user: user.nickname,
      userId: user._id,
      avatar: user.avatar,
      content: commentText.trim(),
      createTime: new Date().toISOString(),
    };

    if (replyToComment) {
      newComment.parentId = replyToComment.parentId || replyToComment.id;
      newComment.replyToUser = replyToComment.user;
    }

    // 乐观更新（与服务端 push 行为保持一致，追加到末尾）
    setComments((prevComments) => [...prevComments, newComment]);
    setCommentText('');
    setReplyToComment(null);

    // 调用接口
    commentMutation.mutate({ id: _id, comment: newComment });
  };

  const handleReplyPress = (comment: any) => {
    setReplyToComment(comment);
    inputRef.current?.focus();
  };

  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate({
      id: _id,
      userId: user._id,
      action: hasLiked ? 'unlike' : 'like',
    });
  };

  const hasLiked = user?._id ? (diary?.likedUserIds || []).includes(user._id) : false;
  const canReportDiary = !!(user?._id && diary?.userId && user._id !== diary.userId);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canReportDiary
        ? () => (
            <TouchableOpacity
              style={styles.headerMoreButton}
              onPress={() => setMoreActionsVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={isDark ? '#FFFFFF' : '#111827'} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [canReportDiary, isDark, navigation]);

  const handleAction = async (type: 'like' | 'share') => {
    if (type === 'like') {
      if (likeMutation.isGlobalMutating) return;
      handleLike();
    } else {
      const shareUrl = `maoqiudiary://circle/${_id}`;
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('分享链接已复制', `可以把链接发给朋友，他们点击后就能直接打开这条内容啦！`, [
        { text: '好的', style: 'default' },
      ]);
    }
  };

  const handleSubmitReport = async () => {
    if (!user?._id || !diary?.userId) {
      Alert.alert('提示', '请先登录后再举报');
      return;
    }

    if (!reportDescription.trim()) {
      Alert.alert('提示', '请补充举报说明');
      return;
    }

    try {
      setReportSubmitting(true);
      await feedbackService.submitUserReport({
        userId: user._id,
        targetUserId: diary.userId,
        targetDiaryId: diary._id,
        reportReason: selectedReportReason,
        content: reportDescription.trim(),
        targetSnapshot: {
          nickname: diary.authorInfo?.nickname,
          avatar: diary.authorInfo?.avatar,
        },
        targetDiarySnapshot: {
          _id: diary._id,
          title: diary.title,
          content: diary.content,
          mediaCount: diary.media?.length || 0,
        },
      });
      setReportModalVisible(false);
      setReportDescription('');
      setSelectedReportReason('spam');
      toast.success('举报已提交，我们会尽快处理');
    } catch (error: any) {
      console.error('Submit diary report failed:', error);
      Alert.alert('提交失败', error.message || '举报提交失败，请稍后再试');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOpenReportModal = () => {
    if (!canReportDiary) return;

    setMoreActionsVisible(false);
    setSelectedReportReason('spam');
    setReportDescription('');
    setTimeout(() => {
      setReportModalVisible(true);
    }, 180);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentHealingColors.pink[400]} />
      </View>
    );
  }

  if (error || !diary) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>内容加载失败</Text>
      </View>
    );
  }

  const formattedDate = FormatUtil.formatRelativeTime(diary.createdAt || diary.date);
  const moderationBadgeText =
    diary.moderationStatus === 'pending_recheck'
      ? '整改复审中'
      : diary.moderationStatus === 'violation'
        ? '笔记违规'
        : '';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={currentHealingColors.pink[400]}
            colors={[currentHealingColors.pink[400]]}
          />
        }
      >
        {/* 用户信息 */}
        <TouchableOpacity
          style={styles.authorSection}
          activeOpacity={0.8}
          onPress={() => {
            if (diary.userId) {
              navigation.navigate('UserProfile', { userId: diary.userId });
            }
          }}
        >
          <View style={styles.avatarPlaceholder}>
            {diary.authorInfo?.avatar ? (
              <Image
                source={{ uri: diary.authorInfo.avatar }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <Text style={styles.avatarEmoji}>🐱</Text>
            )}
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.nickname}>{diary.authorInfo?.nickname || '毛球用户'}</Text>
            <View style={[styles.timeLocationRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.time}>{formattedDate}</Text>
                {/* ip location */}
                {diary.ipLocation && (
                  <Text style={styles.ipLocation}>
                    {FormatUtil.formatIpLocation(diary.ipLocation)}
                  </Text>
                )}
              </View>

              {/* user location */}
              {!!diary.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 8 }}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text style={[styles.ipLocation, { marginLeft: 2 }]} numberOfLines={1}>
                    {diary.location}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* 内容 */}
        <View style={styles.contentSection}>
          {moderationBadgeText ? (
            <View
              style={[
                styles.moderationBadge,
                diary.moderationStatus === 'pending_recheck'
                  ? styles.recheckBadge
                  : styles.violationBadge,
              ]}
            >
              <Text
                style={[
                  styles.moderationBadgeText,
                  diary.moderationStatus === 'pending_recheck'
                    ? styles.recheckBadgeText
                    : styles.violationBadgeText,
                ]}
              >
                {moderationBadgeText}
              </Text>
            </View>
          ) : null}
          {!!diary.title && <Text style={styles.title}>{diary.title}</Text>}
          {!!diary.content && <Text style={styles.content}>{diary.content}</Text>}
        </View>

        {/* 图片/视频（全宽或自适应） */}
        {diary.media && diary.media.length > 0 && (
          <View style={styles.mediaSection}>
            <NineGridMedia
              media={diary.media}
              containerWidth={width - 32} // 左右各 16 的 padding
            />
          </View>
        )}

        {/* 评论区 */}
        <CommentList comments={comments} authorId={diary.userId} onReplyPress={handleReplyPress} />
      </ScrollView>

      {/* 底部互动与输入栏 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.bottomBar}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder={replyToComment ? `回复 @${replyToComment.user}` : '说点什么吧...'}
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            {commentText.length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendComment}>
                <Ionicons name="send" size={20} color={currentHealingColors.pink[500]} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionIcon} onPress={() => handleAction('like')}>
              <View style={styles.actionIconWithText}>
                <Ionicons
                  name={hasLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={hasLiked ? '#FF6B9D' : '#4B5563'} // 点赞固定使用真实的粉色
                />
                <Text
                  style={[styles.actionIconText, hasLiked && { color: '#FF6B9D' }]}
                >
                  {diary.likedUserIds?.length || 0}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} onPress={() => handleAction('share')}>
              <Ionicons name="share-social-outline" size={26} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CommonModal visible={moreActionsVisible} onClose={() => setMoreActionsVisible(false)}>
        <View style={styles.popupContainer}>
          <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={() => setMoreActionsVisible(false)} />
          <View
            style={[
              styles.popupCard,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderColor: isDark ? '#333' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.popupTitle, { color: isDark ? '#FFF' : '#111827' }]}>更多操作</Text>
            <TouchableOpacity
              style={styles.popupAction}
              onPress={handleOpenReportModal}
            >
              <Ionicons name="flag-outline" size={18} color="#F59E0B" />
              <Text style={[styles.popupActionText, { color: isDark ? '#FFF' : '#111827' }]}>
                举报笔记
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupCancel}
              onPress={() => setMoreActionsVisible(false)}
            >
              <Text style={[styles.popupCancelText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                取消
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CommonModal>

      <CommonModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)}>
        <View style={styles.popupContainer}>
          <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={() => setReportModalVisible(false)} />
          <View
            style={[
              styles.reportCard,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderColor: isDark ? '#333' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.popupTitle, { color: isDark ? '#FFF' : '#111827' }]}>举报笔记</Text>
            <Text style={[styles.reportHint, { color: isDark ? '#AAA' : '#6B7280' }]}>
              请选择举报原因，并补充说明，帮助管理员更快判断是否需要下架这篇笔记。
            </Text>
            <View style={styles.reasonList}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const active = selectedReportReason === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: active ? currentHealingColors.pink[500] : isDark ? '#2A2A2A' : '#F9FAFB',
                        borderColor: active ? currentHealingColors.pink[500] : isDark ? '#333' : '#E5E7EB',
                      },
                    ]}
                    onPress={() => setSelectedReportReason(option.value)}
                  >
                    <Text style={[styles.reasonChipText, { color: active ? '#FFF' : isDark ? '#DDD' : '#374151' }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[
                styles.reportInput,
                {
                  color: isDark ? '#FFF' : '#111827',
                  borderColor: isDark ? '#333' : '#E5E7EB',
                  backgroundColor: isDark ? '#141414' : '#F9FAFB',
                },
              ]}
              defaultValue={reportDescription}
              onChangeText={setReportDescription}
              placeholder="请补充违规内容描述，管理员会结合这段说明审核"
              placeholderTextColor={isDark ? '#777' : '#9CA3AF'}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={[styles.reportCounter, { color: isDark ? '#777' : '#9CA3AF' }]}>
              {reportDescription.length}/200
            </Text>
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.reportSecondaryBtn, { borderColor: isDark ? '#333' : '#E5E7EB' }]}
                onPress={() => setReportModalVisible(false)}
                disabled={reportSubmitting}
              >
                <Text style={[styles.reportSecondaryText, { color: isDark ? '#DDD' : '#374151' }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportPrimaryBtn}
                onPress={handleSubmitReport}
                disabled={reportSubmitting}
              >
                <Text style={styles.reportPrimaryText}>{reportSubmitting ? '提交中...' : '提交举报'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CommonModal>
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
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  authorInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ipLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  moderationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  moderationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  violationBadge: {
    backgroundColor: '#FEE2E2',
  },
  violationBadgeText: {
    color: '#B91C1C',
  },
  recheckBadge: {
    backgroundColor: '#FEF3C7',
  },
  recheckBadgeText: {
    color: '#B45309',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 30,
  },
  content: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  mediaSection: {
    paddingHorizontal: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingBottom: 32, // safe area bottom
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginHorizontal: 16,
    paddingHorizontal: 12,
  },
  commentInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  actionIcon: {
    marginLeft: 16,
  },
  actionIconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  headerMoreButton: {
    padding: 4,
  },
  popupContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  popupBackdrop: {
    flex: 1,
  },
  popupCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  reportCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  popupActionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  popupCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  popupCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  reportHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportInput: {
    marginTop: 16,
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  reportCounter: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  reportSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HEALING_COLORS.pink[500],
  },
  reportSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CircleDetailScreen;
