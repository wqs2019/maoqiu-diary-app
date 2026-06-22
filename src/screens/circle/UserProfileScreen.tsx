import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Linking from 'expo-linking';
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
  Share,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { useToast } from '@/components/common/Toast';
import { NineGridMedia } from '@/components/handDrawn/NineGridMedia';
import { Modal as CommonModal } from '@/components/common/Modal';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDiaryList, useLikeDiary } from '@/hooks/useDiaryQuery';
import { useQueryClient } from '@/hooks/useQuery';
import feedbackService, { ReportReason } from '@/services/feedbackService';
import { getNotifications, getUnreadNotificationCount } from '@/services/notificationService';
import userService from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { Diary } from '@/types';
import { FormatUtil } from '@/utils/format';

const formatCount = (count: number | undefined): string => {
  if (!count) return '0';
  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
  }
  return count.toString();
};

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = width;
const REPORT_REASON_OPTIONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: '垃圾营销' },
  { value: 'abuse', label: '辱骂攻击' },
  { value: 'harassment', label: '骚扰他人' },
  { value: 'pornography', label: '色情低俗' },
  { value: 'violence', label: '暴力血腥' },
  { value: 'fraud', label: '诈骗欺诈' },
  { value: 'other', label: '其他原因' },
];

const getReportDiaryTitle = (diary: Diary): string => {
  const title = diary.title?.trim();
  if (title) return title;

  const content = diary.content?.trim();
  if (content) return content.slice(0, 24);

  return '未命名公开笔记';
};

type SelectedReportDiary = {
  _id: string;
  title?: string;
  content?: string;
  mediaCount?: number;
  createdAt?: string;
  date?: string;
};

const UserProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const targetUserId = route.params?.userId;

  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isDark } = useAppTheme();

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason>('spam');
  const [selectedReportDiary, setSelectedReportDiary] = useState<SelectedReportDiary | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Tab 状态：'public' | 'commented' | 'liked'
  const [activeTab, setActiveTab] = useState<'public' | 'commented' | 'liked'>('public');

  const { data: diaryData, isLoading: diaryLoading, refetch } = useDiaryList({
    page: 1,
    pageSize: 100,
    userId: activeTab === 'public' ? targetUserId : undefined,
    likedByUserId: activeTab === 'liked' ? targetUserId : undefined,
    commentedByUserId: activeTab === 'commented' ? targetUserId : undefined,
    isPublic: activeTab === 'public' ? true : undefined, // 仅在查看“我的公开”时强制过滤公开日记，评论/点赞的日记可能包含自己参与的他人的非公开日记（视业务需求）
    viewerId: currentUser?._id,
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

  useEffect(() => {
    const pickedDiary = route.params?.selectedReportDiary as SelectedReportDiary | undefined;
    if (!pickedDiary) return;

    setSelectedReportDiary(pickedDiary);
    setReportModalVisible(true);
    navigation.setParams({ selectedReportDiary: undefined });
  }, [navigation, route.params?.selectedReportDiary]);

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
      // #region debug-point D:follow-action-start
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'D',location:'UserProfileScreen.handleFollow:start',msg:'[DEBUG] follow action start',data:{currentUserId:currentUser._id,targetUserId,action,isFollowing:profile?.isFollowing},ts:Date.now()})}).catch(()=>{});
      // #endregion
      await userService.follow(currentUser._id, targetUserId, action);
      // #region debug-point A:follow-after-success
      Promise.all([
        getUnreadNotificationCount(targetUserId, { types: ['follow'] }),
        getNotifications(targetUserId, 1, 3, { types: ['follow'] }),
      ]).then(([followUnreadCount, followListRes])=>fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'A',location:'UserProfileScreen.handleFollow:afterSuccess',msg:'[DEBUG] follow query after success',data:{currentUserId:currentUser._id,targetUserId,action,followUnreadCount,followList:followListRes.list.map(item=>({_id:item._id,type:item.type,receiverId:item.receiverId,senderId:item.senderId,isRead:item.isRead,content:item.content,relatedId:item.relatedId}))},ts:Date.now()})})).catch(()=>{});
      // #endregion
      setProfile((prev: any) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1,
      }));
    } catch (error) {
      // #region debug-point D:follow-action-error
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'D',location:'UserProfileScreen.handleFollow:error',msg:'[DEBUG] follow action error',data:{currentUserId:currentUser._id,targetUserId,action,error:error instanceof Error ? error.message : String(error)},ts:Date.now()})}).catch(()=>{});
      // #endregion
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

  const handleShareProfile = useCallback(async () => {
    if (!profile || !targetUserId) return;

    try {
      const profileUrl = Linking.createURL(`user/${targetUserId}`);
      const avatarText = profile.avatar ? `头像：${profile.avatar}\n` : '';
      const shareMessage = `来看看 ${profile.nickname || '这位用户'} 在毛球日记的个人主页吧\n${avatarText}主页链接：${profileUrl}`;

      await Share.share({
        title: `${profile.nickname || '这位用户'}的毛球主页`,
        message: shareMessage,
        url: profileUrl,
      });
    } catch (error) {
      console.error('Share profile error:', error);
      Alert.alert('提示', '分享失败，请稍后再试');
    }
  }, [profile, targetUserId]);

  const handleOpenMoreActions = useCallback(() => {
    setMoreActionsVisible(true);
  }, []);

  const handleShareFromPopup = useCallback(() => {
    setMoreActionsVisible(false);
    setTimeout(() => {
      handleShareProfile();
    }, 180);
  }, [handleShareProfile]);

  const handleOpenReportModal = useCallback(() => {
    if (!currentUser?._id) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (!profile || currentUser._id === targetUserId) {
      return;
    }

    setMoreActionsVisible(false);
    setSelectedReportReason('spam');
    setSelectedReportDiary(null);
    setReportDescription('');
    setTimeout(() => {
      setReportModalVisible(true);
    }, 180);
  }, [currentUser?._id, profile, targetUserId]);

  const handleSubmitReport = useCallback(async () => {
    if (!currentUser?._id || !profile || !targetUserId) {
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
        userId: currentUser._id,
        targetUserId,
        targetDiaryId: selectedReportDiary?._id,
        reportReason: selectedReportReason,
        content: reportDescription.trim(),
        targetSnapshot: {
          nickname: profile.nickname,
          avatar: profile.avatar,
        },
        targetDiarySnapshot: selectedReportDiary
          ? {
              _id: selectedReportDiary._id,
              title: selectedReportDiary.title,
              content: selectedReportDiary.content,
              mediaCount: selectedReportDiary.mediaCount || 0,
            }
          : undefined,
      });
      setReportModalVisible(false);
      setSelectedReportDiary(null);
      setReportDescription('');
      toast.success('举报已提交，我们会尽快处理');
    } catch (error: any) {
      console.error('Submit user report failed:', error);
      Alert.alert('提交失败', error.message || '举报提交失败，请稍后再试');
    } finally {
      setReportSubmitting(false);
    }
  }, [
    currentUser?._id,
    profile,
    reportDescription,
    selectedReportDiary,
    selectedReportReason,
    targetUserId,
    toast,
  ]);

  const handleOpenReportDiaryPicker = useCallback(() => {
    if (!targetUserId) return;

    setReportModalVisible(false);
    setTimeout(() => {
      navigation.navigate('ReportDiaryPicker', {
        userId: targetUserId,
        selectedDiaryId: selectedReportDiary?._id ?? null,
      });
    }, 180);
  }, [navigation, selectedReportDiary?._id, targetUserId]);

  const handleToggleBlock = useCallback(() => {
    if (!currentUser?._id || !profile || !targetUserId) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (blockSubmitting) {
      return;
    }

    const isBlocked = !!profile.isBlockedByCurrentUser;
    const actionText = isBlocked ? '取消拉黑' : '拉黑用户';
    const message = isBlocked
      ? '取消拉黑后，对方的公开内容会恢复展示。'
      : '拉黑后，你将不再看到对方的主页内容和圈子内容。';

    Alert.alert(actionText, message, [
      { text: '取消', style: 'cancel' },
      {
        text: actionText,
        style: isBlocked ? 'default' : 'destructive',
        onPress: async () => {
          try {
            setBlockSubmitting(true);
            setMoreActionsVisible(false);

            if (isBlocked) {
              await userService.unblockUser(currentUser._id, targetUserId);
              setProfile((prev: any) =>
                prev
                  ? {
                      ...prev,
                      isBlockedByCurrentUser: false,
                    }
                  : prev
              );
              toast.success('已取消拉黑');
            } else {
              await userService.blockUser(currentUser._id, targetUserId);
              setProfile((prev: any) =>
                prev
                  ? {
                      ...prev,
                      isBlockedByCurrentUser: true,
                      isFollowing: false,
                      publicDiariesCount: 0,
                      followersCount: prev.followersCount || 0,
                      totalLikes: 0,
                    }
                  : prev
              );
              toast.success('已拉黑该用户');
            }

            await Promise.all([
              fetchProfile(),
              refetch(),
              queryClient.invalidateQueries({ queryKey: ['diaryList'] }),
              queryClient.invalidateQueries({ queryKey: ['diaryDetail'] }),
            ]);
          } catch (error: any) {
            console.error('Toggle block failed:', error);
            Alert.alert('操作失败', error.message || '请稍后再试');
          } finally {
            setBlockSubmitting(false);
          }
        },
      },
    ]);
  }, [
    blockSubmitting,
    currentUser?._id,
    fetchProfile,
    profile,
    queryClient,
    refetch,
    targetUserId,
    toast,
  ]);

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          params: { screen: 'Home' },
        },
      ],
    });
  }, [navigation]);



  const renderHeader = () => {
    if (!profile) return null;

    const isSelf = currentUser?._id === targetUserId;
    const hasBackground = !!profile.profileBackground;
    const isBlocked = !!profile.isBlockedByCurrentUser;
    const isRestricted = !!profile.blockedByTargetUser;

    const profileHeaderBg = hasBackground ? 'transparent' : (isDark ? '#1E1E1E' : '#fff');
    const textColor = hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827');
    const labelColor = hasBackground ? 'rgba(255,255,255,0.8)' : (isDark ? '#AAA' : '#6B7280');
    const textShadowStyle = hasBackground ? { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } : {};

    return (
      <View style={{ backgroundColor: 'transparent' }}>
        <View style={[styles.profileHeader, { backgroundColor: profileHeaderBg, paddingTop: insets.top, marginBottom: 0 }]}>
          {/* 返回按钮放在 Header 内部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color={hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827')} style={hasBackground ? { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } : {}} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn} onPress={handleOpenMoreActions}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={hasBackground ? '#FFF' : (isDark ? '#FFF' : '#111827')}
              style={hasBackground ? { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } : {}}
            />
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
            <View style={styles.nicknameRow}>
              <Text style={[styles.nickname, { color: textColor }, textShadowStyle]}>
                {profile.nickname || '某只毛球'}
              </Text>
              {!isSelf && !isBlocked && !isRestricted && (
                <TouchableOpacity
                  style={[
                    styles.followIconBtn,
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
                    <>
                      <Ionicons
                        name={profile.isFollowing ? "checkmark" : "add"}
                        size={14}
                        color={profile.isFollowing ? (hasBackground ? '#FFF' : (isDark ? '#FFF' : '#6B7280')) : '#fff'}
                      />
                      <Text style={[
                        styles.followIconText,
                        { color: profile.isFollowing ? (hasBackground ? '#FFF' : (isDark ? '#FFF' : '#6B7280')) : '#fff' }
                      ]}>
                        {profile.isFollowing ? '已关注' : '关注'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
          {!isSelf && isBlocked && (
            <View style={[styles.relationNotice, { backgroundColor: hasBackground ? 'rgba(255,255,255,0.14)' : isDark ? '#2A1F24' : '#FFF4F6' }]}>
              <Ionicons name="ban-outline" size={16} color={hasBackground ? '#FFF' : HEALING_COLORS.pink[500]} />
              <Text style={[styles.relationNoticeText, { color: textColor }, textShadowStyle]}>
                已拉黑该用户，对方公开内容已对你隐藏
              </Text>
            </View>
          )}
          {!isSelf && !isBlocked && isRestricted && (
            <View style={[styles.relationNotice, { backgroundColor: hasBackground ? 'rgba(255,255,255,0.14)' : isDark ? '#1F2937' : '#F3F4F6' }]}>
              <Ionicons name="lock-closed-outline" size={16} color={hasBackground ? '#FFF' : '#6B7280'} />
              <Text style={[styles.relationNoticeText, { color: textColor }, textShadowStyle]}>
                对方已限制访问，暂时无法查看更多公开内容
              </Text>
            </View>
          )}
        </View>

        {/* Tab 栏（仅自己可见） */}
        {isSelf && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('public')}
            >
              <Text style={[styles.tabText, { color: isDark ? '#E5E7EB' : '#374151' }, activeTab === 'public' && { color: isDark ? '#FFF' : '#111827', fontWeight: 'bold' }]}>
                我的公开
              </Text>
              {activeTab === 'public' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('commented')}
            >
              <Text style={[styles.tabText, { color: isDark ? '#E5E7EB' : '#374151' }, activeTab === 'commented' && { color: isDark ? '#FFF' : '#111827', fontWeight: 'bold' }]}>
                评论
              </Text>
              {activeTab === 'commented' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('liked')}
            >
              <Text style={[styles.tabText, { color: isDark ? '#E5E7EB' : '#374151' }, activeTab === 'liked' && { color: isDark ? '#FFF' : '#111827', fontWeight: 'bold' }]}>
                赞过
              </Text>
              {activeTab === 'liked' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 2, backgroundColor }} />
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

  const backgroundColor = isDark ? '#121212' : '#F9FAFB';
  const headerBackgroundFadeOpacity = isDark ? 0.92 : 0.6;
  const hasBackground = !!(!profileLoading && profile?.profileBackground);
  const isSelf = currentUser?._id === targetUserId;
  const shouldHideContent = !isSelf && !!(profile?.isBlockedByCurrentUser || profile?.blockedByTargetUser);
  const displayedDiaries = shouldHideContent ? [] : diaries;
  const emptyMessage = shouldHideContent
    ? profile?.isBlockedByCurrentUser
      ? '你已拉黑该用户，对方公开内容已隐藏'
      : '由于访问受限，暂时无法查看该用户的公开内容'
    : isSelf
      ? activeTab === 'public'
        ? '你还没有发布公开日记'
        : activeTab === 'commented'
          ? '你还没有评论过日记'
          : '你还没有赞过日记'
      : '该用户还没有发布公开日记';
  const moreActionTitle = isSelf ? '分享我的主页' : '分享这位用户的主页';
  const blockActionTitle = profile?.isBlockedByCurrentUser ? '取消拉黑该用户' : '拉黑该用户';

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
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} pointerEvents="none" />
          
          <View style={styles.headerBackgroundGradient} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
                  <Stop offset="1" stopColor={backgroundColor} stopOpacity={headerBackgroundFadeOpacity} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grad)" />
            </Svg>
          </View>
        </View>
      )}
      

      {profileLoading ? (
        <View style={[styles.screenLoadingContainer, { backgroundColor }]}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color={isDark ? '#555' : '#D1D5DB'} />
          <Text style={[styles.errorText, { color: isDark ? '#AAA' : '#6B7280' }]}>{errorMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={displayedDiaries}
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
                  {emptyMessage}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <CommonModal visible={moreActionsVisible} onClose={() => setMoreActionsVisible(false)}>
        <View style={styles.popupContainer}>
          <TouchableOpacity
            style={styles.popupBackdrop}
            activeOpacity={1}
            onPress={() => setMoreActionsVisible(false)}
          />
          <View
            style={[
              styles.popupCard,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderColor: isDark ? '#333' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.popupTitle, { color: isDark ? '#FFF' : '#111827' }]}>
              更多操作
            </Text>
            <TouchableOpacity
              style={[
                styles.popupAction,
                { borderBottomColor: isDark ? '#333' : '#F3F4F6' },
              ]}
              onPress={handleShareFromPopup}
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={HEALING_COLORS.pink[500]}
              />
              <Text style={[styles.popupActionText, { color: isDark ? '#FFF' : '#111827' }]}>
                {moreActionTitle}
              </Text>
            </TouchableOpacity>
            {!isSelf && (
              <TouchableOpacity
                style={[
                  styles.popupAction,
                  { borderBottomColor: isDark ? '#333' : '#F3F4F6' },
                ]}
                onPress={handleOpenReportModal}
              >
                <Ionicons
                  name="flag-outline"
                  size={18}
                  color="#F59E0B"
                />
                <Text style={[styles.popupActionText, { color: isDark ? '#FFF' : '#111827' }]}>
                  举报用户
                </Text>
              </TouchableOpacity>
            )}
            {!isSelf && (
              <TouchableOpacity
                style={[
                  styles.popupAction,
                  { borderBottomColor: isDark ? '#333' : '#F3F4F6' },
                ]}
                onPress={handleToggleBlock}
                disabled={blockSubmitting}
              >
                <Ionicons
                  name={profile?.isBlockedByCurrentUser ? 'checkmark-circle-outline' : 'ban-outline'}
                  size={18}
                  color={profile?.isBlockedByCurrentUser ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.popupActionText, { color: isDark ? '#FFF' : '#111827' }]}>
                  {blockSubmitting ? '处理中...' : blockActionTitle}
                </Text>
              </TouchableOpacity>
            )}
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
          <TouchableOpacity
            style={styles.popupBackdrop}
            activeOpacity={1}
            onPress={() => setReportModalVisible(false)}
          />
          <View
            style={[
              styles.reportCard,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderColor: isDark ? '#333' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.popupTitle, { color: isDark ? '#FFF' : '#111827' }]}>
              举报用户
            </Text>
            <Text style={[styles.reportHint, { color: isDark ? '#AAA' : '#6B7280' }]}>
              请选择举报原因，并补充说明，帮助我们更快处理。
            </Text>
            <View style={styles.reasonList}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const selected = selectedReportReason === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? '#3B2630'
                            : '#FFF1F4'
                          : isDark
                            ? '#2A2A2A'
                            : '#F9FAFB',
                        borderColor: selected
                          ? HEALING_COLORS.pink[500]
                          : isDark
                            ? '#3F3F46'
                            : '#E5E7EB',
                      },
                    ]}
                    onPress={() => setSelectedReportReason(option.value)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        {
                          color: selected
                            ? HEALING_COLORS.pink[500]
                            : isDark
                              ? '#E5E7EB'
                              : '#374151',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.reportDiarySection}>
              <Text style={[styles.reportSectionTitle, { color: isDark ? '#FFF' : '#111827' }]}>
                关联公开笔记（可选）
              </Text>
              <Text style={[styles.reportSectionHint, { color: isDark ? '#AAA' : '#6B7280' }]}>
                如果本次举报和该用户发布的某篇圈子公开笔记有关，可以一并关联，便于核查。
              </Text>
              <TouchableOpacity
                style={[
                  styles.reportDiaryPickerButton,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
                    borderColor: selectedReportDiary
                      ? HEALING_COLORS.pink[500]
                      : isDark
                        ? '#3F3F46'
                        : '#E5E7EB',
                  },
                ]}
                onPress={handleOpenReportDiaryPicker}
              >
                <View style={styles.reportDiaryPickerContent}>
                  <Text style={[styles.reportDiaryPickerLabel, { color: isDark ? '#AAA' : '#6B7280' }]}>
                    当前关联
                  </Text>
                  <Text
                    style={[
                      styles.reportDiaryPickerValue,
                      { color: selectedReportDiary ? (isDark ? '#FFF' : '#111827') : (isDark ? '#AAA' : '#6B7280') },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedReportDiary ? getReportDiaryTitle(selectedReportDiary as Diary) : '未选择'}
                  </Text>
                  {selectedReportDiary?.content ? (
                    <Text
                      style={[styles.reportDiaryContent, { color: isDark ? '#AAA' : '#6B7280' }]}
                      numberOfLines={2}
                    >
                      {selectedReportDiary.content}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.reportDiaryPickerActions}>
                  {selectedReportDiary ? (
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedReportDiary(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.reportDiaryClearText}>清除关联</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#9CA3AF'} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.reportDiaryEmpty, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                {selectedReportDiary
                  ? FormatUtil.formatRelativeTime(selectedReportDiary.createdAt || selectedReportDiary.date || '')
                  : '未关联公开笔记，可进入选择页挑选'}
              </Text>
            </View>
            <TextInput
              style={[
                styles.reportInput,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F9FAFB',
                  borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                  color: isDark ? '#FFF' : '#111827',
                },
              ]}
              placeholder="请补充举报说明，便于我们核查"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              textAlignVertical="top"
              defaultValue={reportDescription}
              onChangeText={setReportDescription}
              maxLength={200}
            />
            <Text style={[styles.reportCount, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
              {reportDescription.length}/200
            </Text>
            <View style={styles.reportActionRow}>
              <TouchableOpacity
                style={[styles.reportSecondaryButton, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={[styles.reportSecondaryText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportPrimaryButton,
                  {
                    backgroundColor: HEALING_COLORS.pink[500],
                    opacity: reportSubmitting ? 0.7 : 1,
                  },
                ]}
                onPress={handleSubmitReport}
                disabled={reportSubmitting}
              >
                <Text style={styles.reportPrimaryText}>
                  {reportSubmitting ? '提交中...' : '提交举报'}
                </Text>
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
  moreBtn: {
    padding: 6,
    marginRight: -4,
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
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  reportHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginHorizontal: -4,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportInput: {
    minHeight: 108,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  reportCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  reportDiarySection: {
    marginTop: 12,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportSectionHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  reportDiaryPickerButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportDiaryPickerContent: {
    flex: 1,
    marginRight: 12,
  },
  reportDiaryPickerActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 2,
  },
  reportDiaryPickerLabel: {
    fontSize: 12,
  },
  reportDiaryPickerValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  reportDiaryContent: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  reportDiaryClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: HEALING_COLORS.pink[500],
  },
  reportDiaryEmpty: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  reportActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  reportSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  reportSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  reportPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  popupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nickname: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  followIconBtn: {
    flexDirection: 'row',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  followIconText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
  },
  relationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  relationNoticeText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 60,
    height: 4,
    borderRadius: 999,
    backgroundColor: HEALING_COLORS.pink[500],
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
  screenLoadingContainer: {
    flex: 1,
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
