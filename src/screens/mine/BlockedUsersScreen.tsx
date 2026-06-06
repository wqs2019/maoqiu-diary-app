import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import userService, { BlockedUserListItem } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

const BlockedUsersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBlockedUsers = useCallback(
    async (isRefresh = false) => {
      if (!user?._id) {
        setBlockedUsers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const currentPage = isRefresh ? 1 : page;
        if (isRefresh) {
          setRefreshing(true);
        } else if (currentPage === 1) {
          setLoading(true);
        }

        const res = await userService.getBlockedUsers(user._id, currentPage, 20);
        const newList = res.list || [];

        if (isRefresh) {
          setBlockedUsers(newList);
        } else {
          setBlockedUsers((prev) => [...prev, ...newList]);
        }

        setHasMore(newList.length === 20);
        setPage(currentPage + 1);
      } catch (error) {
        console.error('Fetch blocked users error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, user?._id]
  );

  useFocusEffect(
    useCallback(() => {
      fetchBlockedUsers(true);
    }, [fetchBlockedUsers])
  );

  const handleRefresh = () => {
    if (!refreshing) {
      fetchBlockedUsers(true);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchBlockedUsers();
    }
  };

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) {
      return '已拉黑';
    }

    const date = new Date(timestamp);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isThisYear) {
      return `${date.getMonth() + 1}月${date.getDate()}日拉黑`;
    }

    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日拉黑`;
  };

  const renderItem = ({ item }: { item: BlockedUserListItem }) => {
    return (
      <TouchableOpacity
        style={[styles.userItem, { borderBottomColor: isDark ? '#333' : '#F3F4F6' }]}
        onPress={() => navigation.push('UserProfile', { userId: item._id })}
      >
        <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <Image source={require('../../../assets/logo_bg.png')} style={styles.avatar} />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.nickname, { color: isDark ? '#FFF' : '#111827' }]}>
            {item.nickname || '某只毛球'}
          </Text>
          <Text style={[styles.blockedTime, { color: isDark ? '#AAA' : '#9CA3AF' }]}>
            {formatTime(item.blockedAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#F9FAFB' },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F3F4F6' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={isDark ? '#FFF' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111827' }]}>
          黑名单用户
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && blockedUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ban-outline" size={48} color={isDark ? '#555' : '#D1D5DB'} />
              <Text style={[styles.emptyText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                你还没有拉黑任何用户
              </Text>
              <Text style={[styles.emptyHint, { color: isDark ? '#777' : '#9CA3AF' }]}>
                拉黑后会显示在这里，点进主页右上角可解除拉黑
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && blockedUsers.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={HEALING_COLORS.pink[400]} />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  backBtn: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 16,
    fontWeight: '500',
  },
  blockedTime: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default BlockedUsersScreen;
