import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPreviewer } from '@/components/handDrawn/MediaPreviewer';
import { HandDrawnCard } from '@/components/handDrawn/HandDrawnCard';
import { NineGridMedia } from '@/components/handDrawn/NineGridMedia';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useDiaryList, useLikeDiary } from '@/hooks/useDiaryQuery';
import { useAuthStore } from '@/store/authStore';
import { Diary } from '@/types';
import { FormatUtil } from '@/utils/format';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = width - 32; // padding 16 * 2

const CircleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, refetch, isRefetching } = useDiaryList({
    page: 1,
    pageSize: 100, // Fetch enough for now
    isPublic: true, // Fetch public diaries
  });

  const likeMutation = useLikeDiary();

  const diaries = data?.list || [];

  const handleDiaryPress = (item: Diary) => {
    navigation.navigate('CircleDetail', { _id: item._id });
  };

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handlePreview = (media: any[], index: number) => {
    setPreviewMedia(media);
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const handleLike = (item: Diary) => {
    if (!user) {
      Alert.alert('提示', '请先登录！');
      return;
    }
    likeMutation.mutate({ id: item._id, userId: user._id });
  };

  const renderItem = ({ item }: { item: Diary }) => {
    const hasMedia = item.media && item.media.length > 0;
    const hasLiked = user?._id ? (item.likedUserIds || []).includes(user._id) : false;

    return (
      <View style={styles.diaryWrapper}>
        <HandDrawnCard style="soft" variant="default" padding="medium">
          <View style={styles.feedCard}>
            <TouchableOpacity activeOpacity={1} onPress={() => handleDiaryPress(item)}>
              {/* 顶部：头像、昵称、时间 */}
              <View style={styles.feedHeader}>
                <View style={styles.avatarPlaceholder}>
                  {item.authorInfo?.avatar ? (
                    <Image source={{ uri: item.authorInfo.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <Text style={styles.avatarEmoji}>🧶</Text>
                  )}
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.nickname}>{item.authorInfo?.nickname || '某只毛球'}</Text>
                  <Text style={styles.time}>{FormatUtil.formatRelativeTime(item.createdAt || item.date)}</Text>
                </View>
              </View>

              {/* 标题 */}
              {!!item.title && (
                <Text style={styles.title}>{item.title}</Text>
              )}

              {/* 内容 */}
              {!!item.content && (
                <Text style={styles.content} numberOfLines={4}>
                  {item.content}
                </Text>
              )}

              {/* 图片网格 */}
              {hasMedia && (
                <View style={{ marginBottom: 12 }}>
                  <NineGridMedia
                    media={item.media!}
                    containerWidth={CONTENT_WIDTH - 24} // 减去内边距
                    onPreview={(media, index) => handlePreview(media, index)}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* 底部操作栏：点赞和评论数量 */}
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
                <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={22} color={hasLiked ? HEALING_COLORS.pink[500] : "#666"} />
                <Text style={[styles.actionText, hasLiked && { color: HEALING_COLORS.pink[500] }]}>{item.likesCount || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDiaryPress(item)}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </HandDrawnCard>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>圈子</Text>
        <Text style={styles.headerSubtitle}>探索大家分享的美好瞬间</Text>
      </View>

      {isLoading && !isRefetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      ) : diaries.length > 0 ? (
        <FlatList
          data={diaries}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={HEALING_COLORS.pink[400]}
            />
          }
        />
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="globe-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            圈子里还没有人分享日记呢，快去成为第一个吧！
          </Text>
        </View>
      )}

      <MediaPreviewer
        visible={previewVisible}
        media={previewMedia}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  diaryWrapper: {
    marginBottom: 16,
  },
  feedCard: {
    backgroundColor: '#fff',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default CircleScreen;
