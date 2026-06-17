import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { getNotifications, markNotificationRead } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Notification } from '@/types';

const CIRCLE_INTERACTION_TYPES: Notification['type'][] = ['like', 'comment', 'follow'];

type InteractionNotification = Notification & {
  senderInfo?: {
    nickname?: string;
    avatar?: string;
  };
};

type InteractionSection = {
  title: string;
  data: InteractionNotification[];
};

const formatInteractionTime = (value: number | string, withDate = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  if (withDate) {
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const yyyy = date.getFullYear();
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const hh = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return isCurrentYear ? `${mm}月${dd}日 ${hh}:${minute}` : `${yyyy}年${mm}月${dd}日 ${hh}:${minute}`;
  }

  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mm}`;
};

const getSectionTitle = (value: number | string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '更早';
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const targetTime = date.getTime();

  if (targetTime >= todayStart) {
    return '今天';
  }

  if (targetTime >= yesterdayStart) {
    return '昨天';
  }

  return '更早';
};

const buildSections = (items: InteractionNotification[]): InteractionSection[] => {
  const groups = new Map<string, InteractionNotification[]>();

  items.forEach((item) => {
    const title = getSectionTitle(item.createdAt);
    const list = groups.get(title) || [];
    list.push(item);
    groups.set(title, list);
  });

  const order = ['今天', '昨天', '更早'];
  return order
    .map((title) => ({
      title,
      data: groups.get(title) || [],
    }))
    .filter((section) => section.data.length > 0);
};

const getInteractionTitle = (item: InteractionNotification) => {
  if (item.type === 'follow') {
    return item.senderInfo?.nickname ? `${item.senderInfo.nickname} 关注了你` : '有人关注了你';
  }
  if (item.type === 'like') {
    return item.senderInfo?.nickname ? `${item.senderInfo.nickname} 赞了你的日记` : '有人赞了你的日记';
  }
  return item.senderInfo?.nickname ? `${item.senderInfo.nickname} 评论了你` : '有人评论了你';
};

const getInteractionHint = (item: InteractionNotification) => {
  if (item.type === 'follow') {
    return '点击查看粉丝列表';
  }
  return '点击查看对应日记';
};

const getInteractionMeta = (type: InteractionNotification['type']) => {
  if (type === 'follow') {
    return {
      icon: 'person-add-outline' as const,
      label: '关注',
      tint: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.14)',
    };
  }

  if (type === 'like') {
    return {
      icon: 'heart-outline' as const,
      label: '点赞',
      tint: '#FF5A7A',
      bg: 'rgba(255, 90, 122, 0.14)',
    };
  }

  return {
    icon: 'chatbubble-ellipses-outline' as const,
    label: '评论',
    tint: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.16)',
  };
};

const CircleInteractionListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const setCircleUnreadCount = useNotificationStore((state) => state.setCircleUnreadCount);
  const { isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interactions, setInteractions] = useState<InteractionNotification[]>([]);

  const fetchInteractions = useCallback(
    async (isRefresh = false) => {
      if (!user?._id) {
        setInteractions([]);
        setCircleUnreadCount(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await getNotifications(user._id, 1, 50, { types: CIRCLE_INTERACTION_TYPES });
        setInteractions(response.list);

        const unreadIds = response.list.filter((item) => !item.isRead).map((item) => item._id);
        if (unreadIds.length > 0) {
          await markNotificationRead(user._id, unreadIds, false);
        }
        setCircleUnreadCount(0);
      } catch (error) {
        console.error('Failed to fetch circle interactions:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setCircleUnreadCount, user?._id]
  );

  useFocusEffect(
    useCallback(() => {
      fetchInteractions();
    }, [fetchInteractions])
  );

  const handleInteractionPress = useCallback(
    (item: InteractionNotification) => {
      if (item.type === 'follow') {
        navigation.navigate('Followers', { userId: user?._id || item.receiverId });
        return;
      }

      if (item.relatedId) {
        navigation.navigate('CircleDetail', { _id: item.relatedId });
      }
    },
    [navigation, user?._id]
  );

  const sections = useMemo(() => buildSections(interactions), [interactions]);

  const renderItem = ({ item }: { item: InteractionNotification }) => {
    const avatarSource = item.senderInfo?.avatar
      ? { uri: item.senderInfo.avatar }
      : require('../../../assets/logo_bg.png');
    const meta = getInteractionMeta(item.type);
    const isOlderInteraction = getSectionTitle(item.createdAt) === '更早';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: isDark ? '#333' : '#FFE1E8',
          },
        ]}
        onPress={() => handleInteractionPress(item)}
      >
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.contentContainer}>
          <View style={styles.row}>
            <View style={styles.titleRow}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={12} color={meta.tint} />
                <Text style={[styles.typeBadgeText, { color: meta.tint }]}>{meta.label}</Text>
              </View>
              <Text style={[styles.title, { color: isDark ? '#FFF' : '#111827' }]} numberOfLines={1}>
                {getInteractionTitle(item)}
              </Text>
            </View>
            <Text style={[styles.time, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {formatInteractionTime(item.createdAt, isOlderInteraction)}
            </Text>
          </View>
          <Text style={[styles.content, { color: isDark ? '#D1D5DB' : '#4B5563' }]} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={[styles.hint, { color: isDark ? '#F9A8D4' : HEALING_COLORS.pink[500] }]}>
            {getInteractionHint(item)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#AAA' : '#9CA3AF'} />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#121212' : '#FAFAFA',
        },
      ]}
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111827' }]}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={sections.length > 0 ? styles.listContent : styles.emptyListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchInteractions(true)}
              tintColor={HEALING_COLORS.pink[400]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="sparkles-outline" size={48} color={isDark ? '#555' : '#D1D5DB'} />
              <Text style={[styles.emptyText, { color: isDark ? '#AAA' : '#6B7280' }]}>还没有互动消息</Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  titleRow: {
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 14,
    fontSize: 15,
  },
});

export default CircleInteractionListScreen;
