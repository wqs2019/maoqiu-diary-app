import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { MediaPreviewer } from '@/components/handDrawn/MediaPreviewer';
import { NineGridMedia } from '@/components/handDrawn/NineGridMedia';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useDiaryDetail, useLikeDiary, useCommentDiary } from '@/hooks/useDiaryQuery';
import { useAuthStore } from '@/store/authStore';
import { FormatUtil } from '@/utils/format';

const { width } = Dimensions.get('window');

type CircleDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const CircleDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CircleDetailRouteProp>();
  const { _id } = route.params;

  const { data: diary, isLoading, error, refetch } = useDiaryDetail(_id);
  const user = useAuthStore((state) => state.user);

  const likeMutation = useLikeDiary();
  const commentMutation = useCommentDiary();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

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

  const handleSendComment = () => {
    if (!commentText.trim() || !user) return;

    const newComment = {
      _id: Date.now().toString(),
      user: user.nickname,
      userId: user._id,
      avatar: user.avatar,
      content: commentText.trim(),
      createTime: new Date().toISOString()
    };

    // 乐观更新
    setComments((prevComments) => [newComment, ...prevComments]);
    setCommentText('');

    // 调用接口
    commentMutation.mutate({ id: _id, comment: newComment });
  };

  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate({
      id: _id,
      userId: user._id,
      action: hasLiked ? 'unlike' : 'like',
    });
  };

  const isMyDiary = user?._id === diary?.userId;
  const hasLiked = user?._id ? (diary?.likedUserIds || []).includes(user._id) : false;

  const handleAction = (type: string) => {
    if (type === '点赞') {
      if (likeMutation.isGlobalMutating) return;
      handleLike();
    } else {
      Alert.alert('提示', `“${type}”功能开发中，敬请期待！`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 用户信息 */}
        <View style={styles.authorSection}>
          <View style={styles.avatarPlaceholder}>
            {diary.authorInfo?.avatar ? (
              <Image source={{ uri: diary.authorInfo.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <Text style={styles.avatarEmoji}>🐱</Text>
            )}
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.nickname}>{diary.authorInfo?.nickname || '毛球用户'}</Text>
            <Text style={styles.time}>{formattedDate}</Text>
          </View>
        </View>

        {/* 内容 */}
        <View style={styles.contentSection}>
          {!!diary.title && <Text style={styles.title}>{diary.title}</Text>}
          {!!diary.content && <Text style={styles.content}>{diary.content}</Text>}
        </View>

        {/* 图片/视频（全宽或自适应） */}
        {diary.media && diary.media.length > 0 && (
          <View style={styles.mediaSection}>
            <NineGridMedia
              media={diary.media}
              containerWidth={width - 32} // 左右各 16 的 padding
              onPreview={(_, index) => {
                setPreviewIndex(index);
                setPreviewVisible(true);
              }}
            />
          </View>
        )}

        {/* 评论区 */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>全部评论 ({comments.length})</Text>
          {comments.map((comment) => (
            <View key={comment._id} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                {comment.avatar ? (
                  <Image source={{ uri: comment.avatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <Text style={styles.commentAvatarEmoji}>😸</Text>
                )}
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{comment.user}</Text>
                  <Text style={styles.commentTime}>{comment.time ? FormatUtil.formatRelativeTime(comment.time) : ''}</Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            </View>
          ))}
          {comments.length === 0 && (
            <Text style={styles.emptyCommentText}>还没有评论哦，快来抢沙发~</Text>
          )}
        </View>
      </ScrollView>

      {/* 底部互动与输入栏 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.bottomBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="说点什么吧..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            {commentText.length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendComment}>
                <Ionicons name="send" size={20} color={HEALING_COLORS.pink[500]} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionIcon} onPress={() => handleAction('点赞')}>
              <View style={styles.actionIconWithText}>
                <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={28} color={hasLiked ? HEALING_COLORS.pink[500] : "#4B5563"} />
                <Text style={[styles.actionIconText, hasLiked && { color: HEALING_COLORS.pink[500] }]}>{diary.likedUserIds?.length || 0}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} onPress={() => handleAction('分享')}>
              <Ionicons name="share-social-outline" size={26} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <MediaPreviewer
        visible={previewVisible}
        media={diary.media || []}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
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
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 8,
    borderTopColor: '#F9FAFB',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarEmoji: {
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyCommentText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
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
});

export default CircleDetailScreen;
