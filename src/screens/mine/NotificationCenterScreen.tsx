import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { getNotifications, markNotificationRead, NotificationListResponse } from '../../services/notificationService';
import { respondInvitation } from '../../services/notebookService';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';
import { Notification } from '../../types';

export default function NotificationCenterScreen() {
  const navigation = useNavigation();
  const { isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<(Notification & { senderInfo?: { nickname?: string; avatar?: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fetchNotebooks = useNotebookStore(state => state.fetchNotebooks);

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await getNotifications(user._id, 1, 50);
      setNotifications(res.list);
      
      // Mark all as read when entering or refreshing
      const unreadIds = res.list.filter(n => !n.isRead).map(n => n._id);
      if (unreadIds.length > 0) {
        await markNotificationRead(user._id, undefined, true);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

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
      Alert.alert('提示', action === 'accept' ? '已成功加入日记本' : '已拒绝邀请');
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
      Alert.alert('操作失败', error.message || '请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: Notification & { senderInfo?: { nickname?: string; avatar?: string } } }) => {
    const isInvite = item.type === 'invite_shared_notebook';
    const isPending = item.actionStatus === 'pending';

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#FFF0F3' }]}>
        <View style={styles.cardHeader}>
          <Image 
            source={item.senderInfo?.avatar ? { uri: item.senderInfo.avatar } : require('../../../assets/logo_bg.png')} 
            style={styles.avatar} 
          />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#1F2937' }]}>{item.title}</Text>
            <Text style={[styles.time, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.content, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
          {item.content}
        </Text>

        {isInvite && (
          <View style={styles.actionContainer}>
            {isPending ? (
              actionLoading === item._id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} 
                    onPress={() => handleRespond(item, 'reject')}
                  >
                    <Text style={[styles.actionText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>拒绝</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]} 
                    onPress={() => handleRespond(item, 'accept')}
                  >
                    <Text style={[styles.actionText, { color: '#FFFFFF' }]}>同意</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              <Text style={[styles.statusText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {item.actionStatus === 'accepted' ? '已同意' : '已拒绝'}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderBottomColor: isDark ? '#333' : '#F3F4F6' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>消息通知</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell-off" size={48} color={isDark ? '#374151' : '#D1D5DB'} />
          <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>暂无通知</Text>
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
