import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { getNotifications, markNotificationRead } from '../../services/notificationService';
import { respondInvitation } from '../../services/notebookService';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Notification } from '../../types';

import { HEALING_COLORS } from '../../config/handDrawnTheme';

const SYSTEM_AVATAR_NOTIFICATION_SOURCES = new Set([
  'report_review_result',
  'diary_moderation_result',
]);
const CIRCLE_INTERACTION_TYPES: Notification['type'][] = ['like', 'comment', 'follow'];

export default function NotificationCenterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useAppTheme();
  const { t, i18n } = useTranslation();
  // 因为消息通知页面还没有引入 currentHealingColors，所以我们使用全局的 HEALING_COLORS.pink[400]
  // 或者是深色模式特有的颜色
  const loadingColor = isDark ? '#FFB6C1' : HEALING_COLORS.pink[400];
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<(Notification & { senderInfo?: { nickname?: string; avatar?: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fetchNotebooks = useNotebookStore(state => state.fetchNotebooks);
  const setCenterUnreadCount = useNotificationStore((state) => state.setCenterUnreadCount);

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await getNotifications(user._id, 1, 50, { excludeTypes: CIRCLE_INTERACTION_TYPES });
      setNotifications(res.list);
      const unreadIds = res.list.filter(n => !n.isRead).map(n => n._id);
      setCenterUnreadCount(unreadIds.length);
      
      // Mark all as read when entering or refreshing
      if (unreadIds.length > 0) {
        await markNotificationRead(user._id, unreadIds, false);
        setCenterUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setCenterUnreadCount, user?._id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleRespond = async (item: Notification, action: 'accept' | 'reject') => {
    if (!user?._id || !item.relatedId) return;
    
    setActionLoading(item._id);
    try {
      await respondInvitation(item.relatedId, action, user._id);
      Alert.alert(t('common.tip'), action === 'accept' ? t('notificationCenterScreen.alerts.joined') : t('notificationCenterScreen.alerts.declined'));
      // Update local state
      setNotifications(prev => prev.map(n => 
        n._id === item._id 
          ? { ...n, actionStatus: action === 'accept' ? 'accepted' : 'rejected' } 
          : n
      ));
      
      // 如果是同意邀请，刷新日记本列表
      if (action === 'accept') {
        await fetchNotebooks(user._id);
      }
    } catch (error: any) {
      Alert.alert(t('notificationCenterScreen.alerts.actionFailed'), error.message || t('notificationCenterScreen.alerts.retry'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotificationPress = useCallback(
    (item: Notification) => {
      const feedbackId = item.extraData?.feedbackId;
      if (user?.isAdmin && feedbackId) {
        navigation.navigate('AdminModeration', {
          feedbackId,
          initialStatus: 'all',
        });
      }
    },
    [navigation, user?.isAdmin]
  );

  const renderItem = ({ item }: { item: Notification & { senderInfo?: { nickname?: string; avatar?: string } } }) => {
    const isInvite = item.type === 'invite_shared_notebook';
    const isPending = item.actionStatus === 'pending';
    const canOpenReview = Boolean(user?.isAdmin && item.extraData?.feedbackId);
    const shouldUseSystemAvatar =
      item.type === 'system' && SYSTEM_AVATAR_NOTIFICATION_SOURCES.has(item.extraData?.source);
    const avatarSource =
      !shouldUseSystemAvatar && item.senderInfo?.avatar
        ? { uri: item.senderInfo.avatar }
        : require('../../../assets/logo_bg.png');

    return (
      <TouchableOpacity
        activeOpacity={canOpenReview ? 0.85 : 1}
        disabled={!canOpenReview}
        onPress={() => handleNotificationPress(item)}
        style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#FFF0F3' }]}
      >
        <View style={styles.cardHeader}>
          <Image
            source={avatarSource}
            style={styles.avatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#1F2937' }]}>{item.title}</Text>
            <Text style={[styles.time, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {new Date(item.createdAt).toLocaleString(i18n.language)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.content, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
          {item.content}
        </Text>

        {canOpenReview && (
          <Text style={[styles.jumpHint, { color: isDark ? '#F9A8D4' : HEALING_COLORS.pink[500] }]}>
            {t('notificationCenterScreen.reviewHint')}
          </Text>
        )}

        {isInvite && (
          <View style={styles.actionContainer}>
            {isPending ? (
              actionLoading === item._id ? (
                <ActivityIndicator size="small" color={loadingColor} />
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} 
                    onPress={() => handleRespond(item, 'reject')}
                  >
                    <Text style={[styles.actionText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>{t('notificationCenterScreen.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]} 
                    onPress={() => handleRespond(item, 'accept')}
                  >
                    <Text style={[styles.actionText, { color: '#FFFFFF' }]}>{t('notificationCenterScreen.accept')}</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              <Text style={[styles.statusText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {item.actionStatus === 'accepted' ? t('notificationCenterScreen.accepted') : t('notificationCenterScreen.rejected')}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderBottomColor: isDark ? '#333' : '#F3F4F6' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>{t('notificationCenterScreen.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={loadingColor} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell-off" size={48} color={isDark ? '#374151' : '#D1D5DB'} />
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{t('notificationCenterScreen.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

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
  placeholder: {
    width: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  jumpHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
  },
  acceptButton: {
    backgroundColor: '#10B981', // Green for accept
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
  }
});
