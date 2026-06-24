import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../../components/common/Toast';
import { CommentList, type Comment } from '../../components/handDrawn/CommentList';
import { NineGridMedia } from '../../components/handDrawn/NineGridMedia';
import { ShareCardModal } from '../../components/handDrawn/ShareCardModal';
import { CommentActionSheet } from '../../components/common/CommentActionSheet';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { useDiaryDetail, useDeleteDiary, useToggleFavorite } from '../../hooks/useDiaryQuery';
import { useCommentComposer } from '../../hooks/useCommentComposer';
import { useVipGuard } from '../../hooks/useVipGuard';
import { deleteDiaryComment } from '../../services/diaryService';
import { getReplyTargetAfterDelete, removeCommentFromList } from '../../utils/comment';
import FormatUtil from '../../utils/format';

import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

type DiaryDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const DiaryDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<DiaryDetailRouteProp>();
  const { _id } = route.params;
  const toast = useToast();
  const { t } = useTranslation();

  const { data: diary, isLoading, error, refetch } = useDiaryDetail(_id);
  const deleteMutation = useDeleteDiary();
  const toggleFavorite = useToggleFavorite();
  const { checkVipPermission } = useVipGuard();
  const user = useAuthStore((state) => state.user);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentActionsVisible, setCommentActionsVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [commentDeleting, setCommentDeleting] = useState(false);
  const {
    commentText,
    setCommentText,
    comments,
    setComments,
    replyToComment,
    setReplyToComment,
    commentInputVisible,
    inputRef,
    handleReplyPress,
    handleSendComment,
    handleCloseCommentInput,
  } = useCommentComposer({
    diaryId: _id,
    initialComments: diary?.comments || [],
    user,
    initialInputVisible: false,
    hideInputOnKeyboardHide: true,
    collapseAfterSend: true,
  });

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
        toast.success(t('diaryDetailScreen.addedToFavorites'));
      } else {
        toast.info(t('diaryDetailScreen.removedFromFavorites'));
      }
    } catch (e) {
      toast.error(t('diaryDetailScreen.actionFailed'));
    }
  };

  const handleShare = () => {
    if (!diary) return;
    setShareModalVisible(true);
  };

  const closeCommentActions = () => {
    if (commentDeleting) {
      return;
    }

    setCommentActionsVisible(false);
    setSelectedComment(null);
  };

  const handleCommentLongPress = (comment: Comment) => {
    setSelectedComment(comment);
    setCommentActionsVisible(true);
  };

  const handleCopyComment = async () => {
    if (!selectedComment?.content) {
      return;
    }

    await Clipboard.setStringAsync(selectedComment.content);
    closeCommentActions();
    toast.success(t('diaryDetailScreen.copyCommentSuccess'));
  };

  const handleDeleteComment = async () => {
    if (!user?._id || !selectedComment?.id) {
      return;
    }

    try {
      setCommentDeleting(true);
      await deleteDiaryComment(_id, selectedComment.id, user._id);
      setComments((prevComments) => removeCommentFromList(prevComments, selectedComment));
      setReplyToComment((prevComment) => getReplyTargetAfterDelete(prevComment, selectedComment));
      closeCommentActions();
      toast.success(t('diaryDetailScreen.commentDeleted'));
      refetch();
    } catch (error: any) {
      Alert.alert(t('diaryDetailScreen.deleteFailedTitle'), error?.message || t('diaryDetailScreen.deleteCommentFailed'));
    } finally {
      setCommentDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!checkVipPermission('writeDiary')) {
      return;
    }
    Alert.alert(t('diaryDetailScreen.confirmDeleteTitle'), t('diaryDetailScreen.confirmDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(_id, {
            onSuccess: () => {
              toast.success(t('diaryDetailScreen.deleteSuccess'));
              navigation.goBack();
            },
            onError: () => {
              toast.error(t('diaryDetailScreen.deleteFailed'));
            },
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('diaryDetailScreen.loading')}</Text>
      </View>
    );
  }

  if (error || !diary) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t('diaryDetailScreen.loadFailed')}</Text>
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
        <Text style={styles.errorText}>{t('diaryDetailScreen.invalidData')}</Text>
      </View>
    );
  }

  const ipLocation = diary.ipLocation;
  const formattedIpLocation = FormatUtil.formatIpLocation(ipLocation);
  const moderationBadgeText =
    diary.moderationStatus === 'pending_recheck'
      ? t('diaryDetailScreen.moderation.pendingRecheck')
      : diary.moderationStatus === 'violation'
        ? t('diaryDetailScreen.moderation.violation')
        : '';
  const canDeleteSelectedComment = !!(
    user?._id &&
    selectedComment?.userId &&
    selectedComment.userId === user._id
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              <Text style={[styles.scenarioName, { color: scenario.color }]}>{t(`scenario.${diary.scenario}`)}</Text>
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
          <Text style={styles.title} selectable>
            {diary.title || t('diaryDetailScreen.untitled')}
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
                watermarkOwnerName={diary.authorInfo?.nickname}
              />
            </View>
          )}
          {/* ip location */}
          {formattedIpLocation && (
            <View style={styles.metaTextGroup}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaSecondaryText}>{formattedIpLocation}</Text>
            </View>
          )}
        </View>

        <View style={styles.thickDivider} />

        {/* Comments */}
        <View style={styles.commentsSection}>
          <CommentList
            comments={comments}
            emptyText={t('diaryDetailScreen.emptyComments')}
            authorId={diary.userId}
            onReplyPress={handleReplyPress}
            onCommentLongPress={handleCommentLongPress}
          />
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {commentInputVisible ? (
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.commentInput}
                placeholder={
                  replyToComment
                    ? t('diaryDetailScreen.replyPlaceholder', { user: replyToComment.user })
                    : t('diaryDetailScreen.commentPlaceholder')
                }
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                returnKeyType="send"
                onSubmitEditing={handleSendComment}
              />
              {commentText.length > 0 ? (
                <TouchableOpacity style={styles.sendButton} onPress={handleSendComment}>
                  <Ionicons name="send" size={20} color={HEALING_COLORS.pink[500]} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.sendButton} onPress={handleCloseCommentInput}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          ) : null}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.bottomBarAction} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color="#4B5563" />
              <Text style={styles.bottomBarActionText}>{t('common.share')}</Text>
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
                  <Text style={styles.bottomBarActionText}>{t('diaryDetailScreen.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomBarAction} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  <Text style={[styles.bottomBarActionText, { color: '#EF4444' }]}>{t('diaryDetailScreen.delete')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Share Modal */}
      <ShareCardModal
        visible={shareModalVisible}
        diary={diary}
        onClose={() => {
          setShareModalVisible(false);
        }}
      />
      <CommentActionSheet
        visible={commentActionsVisible}
        onClose={closeCommentActions}
        onCopy={handleCopyComment}
        onDelete={handleDeleteComment}
        canDelete={canDeleteSelectedComment}
        deleting={commentDeleting}
        accentColor={HEALING_COLORS.pink[500]}
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
    paddingBottom: 160,
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 92,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  sendButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  actionButtons: {
    flexDirection: 'row',
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
