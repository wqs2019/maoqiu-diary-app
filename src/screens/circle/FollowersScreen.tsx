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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import userService from '@/services/userService';

const FollowersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params;
  const { isDark } = useAppTheme();

  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFollowers = useCallback(async (isRefresh = false) => {
    try {
      const currentPage = isRefresh ? 1 : page;
      if (isRefresh) setRefreshing(true);
      else if (currentPage === 1) setLoading(true);

      const res = await userService.getFollowers(userId, currentPage, 20);
      const newList = res.list || [];

      if (isRefresh) {
        setFollowers(newList);
      } else {
        setFollowers((prev) => [...prev, ...newList]);
      }

      setHasMore(newList.length === 20);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Fetch followers error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, page]);

  useEffect(() => {
    fetchFollowers(true);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    if (!refreshing) {
      fetchFollowers(true);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchFollowers();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isThisYear) {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderItem = ({ item }: { item: any }) => {
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
          {item.followedAt && (
            <Text style={[styles.followTime, { color: isDark ? '#AAA' : '#9CA3AF' }]}>
              {formatTime(item.followedAt)} 关注了你
            </Text>
          )}
        </View>
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
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111827' }]}>粉丝列表</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && followers.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={isDark ? '#555' : '#D1D5DB'} />
              <Text style={[styles.emptyText, { color: isDark ? '#AAA' : '#6B7280' }]}>
                还没有粉丝哦
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && followers.length > 0 ? (
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
  followTime: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default FollowersScreen;