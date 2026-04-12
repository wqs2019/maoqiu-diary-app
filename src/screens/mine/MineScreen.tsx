import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';

const MineScreen: React.FC = () => {
  const { user, logout, fetchUserInfo } = useAuthStore();
  const { theme } = useAppStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: SPACING.xlarge + insets.top }]}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: user?.avatar || 'https://via.placeholder.com/80' }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.nickname || '未登录'}</Text>
              <Text style={styles.userPhone}>{user?.phone || '点击登录'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>我的记录</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>收藏</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>设置</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>关于我们</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>帮助与反馈</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xlarge,
    paddingBottom: SPACING.large,
    paddingHorizontal: SPACING.large,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userDetails: {
    marginLeft: SPACING.medium,
  },
  userName: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.surface,
    marginBottom: SPACING.small,
  },
  userPhone: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.surface + 'CC',
  },
  menuSection: {
    marginTop: SPACING.medium,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: SPACING.large,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
  },
  menuItemArrow: {
    fontSize: FONT_SIZES.xlarge,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    marginTop: SPACING.large,
    marginHorizontal: SPACING.large,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.error,
    fontWeight: '500',
  },
});

export default MineScreen;
