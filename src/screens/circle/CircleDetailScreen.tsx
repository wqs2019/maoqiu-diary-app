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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const isMyDiary = user?._id === diary?.userId;
  const hasLiked = user?._id ? (diary?.likedUserIds || []).includes(user._id) : false;

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={HEALING_COLORS.pink[400]}
            colors={[HEALING_COLORS.pink[400]]}
          />
        }
      >
        {/* 用户信息 */}
        <View style={styles.authorSection}>
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
                <Ionicons name="send" size={20} color={HEALING_COLORS.pink[500]} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionIcon} onPress={() => handleAction('like')}>
              <View style={styles.actionIconWithText}>
                <Ionicons
                  name={hasLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={hasLiked ? HEALING_COLORS.pink[500] : '#4B5563'}
                />
                <Text
                  style={[styles.actionIconText, hasLiked && { color: HEALING_COLORS.pink[500] }]}
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

      <MediaPreviewer
        visible={previewVisible}
        media={diary.media || []}
        initialIndex={previewIndex}
        onClose={() => {
          setPreviewVisible(false);
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
