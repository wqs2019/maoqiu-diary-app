import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
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
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { NineGridMedia } from '@/components/handDrawn/NineGridMedia';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDiaryList, useLikeDiary } from '@/hooks/useDiaryQuery';
import { useAuthStore } from '@/store/authStore';
import { Diary } from '@/types';
import { FormatUtil } from '@/utils/format';
import userService from '@/services/userService';

const formatCount = (count: number | undefined): string => {
  if (!count) return '0';
  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
  }
  return count.toString();
};

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = width;

const UserProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const targetUserId = route.params?.userId;

  const currentUser = useAuthStore((state) => state.user);
  const { isDark } = useAppTheme();

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: diaryData, isLoading: diaryLoading, refetch } = useDiaryList({
    page: 1,
    pageSize: 100,
    userId: targetUserId,
    isPublic: true,
  });

  const diaries = diaryData?.list || [];
  const likeMutation = useLikeDiary();

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      setErrorMsg(null);
      const data = await userService.getProfile(targetUserId, currentUser?._id);
      setProfile(data);
    } catch (error: any) {
      console.error('Failed to fetch profile', error);
      setErrorMsg(error.message || '获取主页信息失败');
    } finally {
      setProfileLoading(false);
    }
  }, [targetUserId, currentUser?._id]);

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
    }
  }, [targetUserId, fetchProfile]);

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await Promise.all([refetch(), fetchProfile()]);
    setIsManualRefreshing(false);
  }, [refetch, fetchProfile]);

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (followLoading) return;

    const action = profile?.isFollowing ? 'unfollow' : 'follow';
    try {
      setFollowLoading(true);
      await userService.follow(currentUser._id, targetUserId, action);
      setProfile((prev: any) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1,
      }));
    } catch (error) {
      Alert.alert('提示', '操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDiaryPress = (item: Diary) => {
    navigation.navigate('CircleDetail', { _id: item._id });
  };

  const handleLike = (item: Diary) => {
    if (likeMutation.isGlobalMutating) return;
    if (!currentUser) {
      Alert.alert('提示', '请先登录！');
      return;
    }
    const hasLiked = (item.likedUserIds || []).includes(currentUser._id);
    likeMutation.mutate({
      id: item._id,
      userId: currentUser._id,
      action: hasLiked ? 'unlike' : 'like',
    });
  };



  const renderHeader = () => {
    if (profileLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      );
    }
    if (!profile) return null;

    const isSelf = currentUser?._id === targetUserId;
    const hasBackground = !!profile.profileBackground;

    const profileHeaderBg = hasBackground ? 'transparent' : (isDark ? '#1E1E1E' : '#fff');
    const textColor = hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827');
    const labelColor = hasBackground ? 'rgba(255,255,255,0.8)' : (isDark ? '#AAA' : '#6B7280');
    const textShadowStyle = hasBackground ? { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } : {};

    return (
      <View style={{ backgroundColor: 'transparent' }}>
        <View style={[styles.profileHeader, { backgroundColor: profileHeaderBg, paddingTop: insets.top, marginBottom: 0 }]}>
          {/* 返回按钮放在 Header 内部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827')} style={hasBackground ? { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } : {}} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileTop}>
          <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <Image source={require('../../../assets/logo_bg.png')} style={styles.avatar} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.nickname, { color: textColor }, textShadowStyle]}>
              {profile.nickname || '某只毛球'}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }, textShadowStyle]}>
                  {formatCount(profile.publicDiariesCount)}
                </Text>
                <Text style={[styles.statLabel, { color: labelColor }, textShadowStyle]}>公开日记</Text>
              </View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => isSelf && navigation.navigate('Followers', { userId: targetUserId })}
                disabled={!isSelf}
              >
                <Text style={[styles.statValue, { color: textColor }, textShadowStyle]}>
                  {formatCount(profile.followersCount)}
                </Text>
                <Text style={[styles.statLabel, { color: labelColor }, textShadowStyle]}>粉丝</Text>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }, textShadowStyle]}>
                  {formatCount(profile.totalLikes)}
                </Text>
                <Text style={[styles.statLabel, { color: labelColor }, textShadowStyle]}>获赞</Text>
              </View>
            </View>
          </View>
        </View>

        {!isSelf && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              profile.isFollowing
                ? { backgroundColor: hasBackground ? 'rgba(255,255,255,0.2)' : (isDark ? '#333' : '#F3F4F6') }
                : { backgroundColor: HEALING_COLORS.pink[500] },
            ]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={profile.isFollowing ? (hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827')) : '#fff'} />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  profile.isFollowing
                    ? { color: hasBackground ? '#FFF' : (isDark ? '#FFF' : '#6B7280') }
                    : { color: '#fff' },
                ]}
              >
                {profile.isFollowing ? '已关注' : '关注'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        </View>
        <View style={{ height: 8, backgroundColor }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: Diary }) => {
    const hasMedia = item.media && item.media.length > 0;
    const hasLiked = currentUser?._id ? (item.likedUserIds || []).includes(currentUser._id) : false;

    return (
      <View style={{ backgroundColor, paddingBottom: 8 }}>
        <View style={[styles.diaryWrapper, { backgroundColor: isDark ? '#1E1E1E' : '#fff', marginBottom: 0 }]}>
          <View style={styles.feedCard}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              handleDiaryPress(item);
            }}
          >
            <View style={styles.feedHeader}>
              <View style={[styles.headerInfo, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[styles.time, { color: isDark ? '#AAA' : '#6B7280' }]}>
                  {FormatUtil.formatRelativeTime(item.createdAt || item.date)}
                </Text>
                {/* ip location */}
                {item.ipLocation && (
                  <Text style={[styles.ipLocation, { color: isDark ? '#AAA' : '#6B7280' }]}>
                    {FormatUtil.formatIpLocation(item.ipLocation)}
                  </Text>
                )}
              </View>
            </View>

            {!!item.title && (
              <Text style={[styles.title, { color: isDark ? '#FFF' : '#111827' }]}>
                {item.title}
              </Text>
            )}

            {!!item.content && (
              <Text
                style={[styles.content, { color: isDark ? '#CCC' : '#4B5563' }]}
                numberOfLines={4}
              >
                {item.content}
              </Text>
            )}

            {hasMedia && (
              <View style={{ marginBottom: 12 }}>
                <NineGridMedia
                  media={item.media!}
                  containerWidth={CONTENT_WIDTH - 32}
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.actionBar, { borderTopColor: isDark ? '#333' : '#F3F4F6' }]}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                handleLike(item);
              }}
            >
              <Ionicons
                name={hasLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={hasLiked ? HEALING_COLORS.pink[500] : isDark ? '#AAA' : '#666'}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: isDark ? '#AAA' : '#6B7280' },
                  hasLiked && { color: HEALING_COLORS.pink[500] },
                ]}
              >
                {item.likedUserIds?.length || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                handleDiaryPress(item);
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={isDark ? '#AAA' : '#666'} />
              <Text style={[styles.actionText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                {item.comments?.length || 0}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </View>
    );
  };

  console.log('profile', profile);

  const backgroundColor = isDark ? '#121212' : '#F9FAFB';
  const hasBackground = !!(!profileLoading && profile?.profileBackground);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
      ]}
    >
      {/* 顶部背景装饰 */}
      {hasBackground && (
        <View style={[styles.headerBackgroundContainer, { height: 260 + insets.top }]}>
          <Image
            source={{ uri: profile.profileBackground }}
            style={styles.headerBackgroundImage}
          />
          {/* 半透明黑色遮罩，确保前景信息更清晰 */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} pointerEvents="none" />
          
          <View style={styles.headerBackgroundGradient} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
                  <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grad)" />
            </Svg>
          </View>
        </View>
      )}

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color={isDark ? '#555' : '#D1D5DB'} />
          <Text style={[styles.errorText, { color: isDark ? '#AAA' : '#6B7280' }]}>{errorMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={diaries}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isManualRefreshing}
              onRefresh={onRefresh}
              tintColor={HEALING_COLORS.pink[400]}
            />
          }
          ListEmptyComponent={
            !diaryLoading && !profileLoading ? (
              <View style={[styles.emptyContainer, { backgroundColor }]}>
                <Ionicons name="globe-outline" size={48} color={isDark ? '#555' : '#D1D5DB'} />
                <Text style={[styles.emptyText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                  该用户还没有发布公开日记
                </Text>
              </View>
            ) : null
          }
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
  headerBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 0,
  },
  headerBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerBackgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    zIndex: 10,
    marginLeft: -16, // 抵消 profileHeader 的 padding
  },
  backBtn: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  profileHeader: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginRight: 20,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    marginRight: 24,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  followBtn: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  diaryWrapper: {
    marginBottom: 8,
    marginHorizontal: 0,
    backgroundColor: '#fff',
  },
  feedCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  ipLocation: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default UserProfileScreen;
