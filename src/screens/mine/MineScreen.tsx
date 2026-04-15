import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useDiaryStats } from '../../hooks/useDiaryQuery';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';

type MineScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MineScreen: React.FC = () => {
  const navigation = useNavigation<MineScreenNavigationProp>();
  const { user, logout, fetchUserInfo } = useAuthStore();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft; // 使用柔和手绘风格

  // 获取用户所有日记统计数据
  const stats = useDiaryStats(user?._id);

  useEffect(() => {
    // 仅在没有用户信息时才主动获取，避免重复获取导致页面闪烁
    if (!user) {
      fetchUserInfo();
    }
  }, [fetchUserInfo, user]);

  const handleLogout = async () => {
    await logout();
  };

  const renderMenuItem = (
    iconName: keyof typeof Feather.glyphMap,
    title: string,
    color: string,
    isLast = false,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
        <Feather name={iconName} size={20} color={color} />
      </View>
      <Text style={styles.menuItemText}>{title}</Text>
      <Feather name="chevron-right" size={20} color={HEALING_COLORS.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 顶部背景装饰 */}
      <View style={[styles.headerBackground, { height: 200 + insets.top }]} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 用户信息卡片 */}
        <View
          style={[
            styles.userCard,
            { marginTop: insets.top + 20 },
            {
              borderRadius: themeStyle.borderRadius,
              shadowColor: themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity,
              shadowRadius: themeStyle.shadowRadius,
              shadowOffset: themeStyle.shadowOffset,
              elevation: 8,
            },
          ]}
        >
          <Image
            source={
              user?.avatar
                ? { uri: user.avatar }
                : { uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Maoqiu' }
            }
            fadeDuration={0}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.nickname || '毛球日记'}</Text>
            <Text style={styles.userPhone}>{user?.phone || '点击登录 / 注册 ✨'}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Feather name="edit-2" size={16} color={HEALING_COLORS.pink[500]} />
          </TouchableOpacity>
        </View>

        {/* 统计数据区 */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalDiaries}</Text>
            <Text style={styles.statLabel}>日记</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>连续打卡</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Badges' as any)}
          >
            <Text style={styles.statNumber}>{stats.badges}</Text>
            <Text style={styles.statLabel}>收集徽章</Text>
          </TouchableOpacity>
        </View>

        {/* 菜单区块 1 */}
        <View
          style={[
            styles.menuSection,
            {
              borderRadius: themeStyle.borderRadius,
              shadowColor: themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderMenuItem('book-open', '我的日记本', HEALING_COLORS.blue[500])}
          {renderMenuItem('star', '收藏夹', HEALING_COLORS.yellow[500])}
          {renderMenuItem('calendar', '打卡日历', HEALING_COLORS.green[500], true, () =>
            navigation.navigate('Calendar' as any)
          )}
        </View>

        {/* 菜单区块 2 */}
        <View
          style={[
            styles.menuSection,
            {
              borderRadius: themeStyle.borderRadius,
              shadowColor: themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderMenuItem('settings', '应用设置', HEALING_COLORS.gray[600])}
          {renderMenuItem('info', '关于毛球', HEALING_COLORS.pink[400], false, () =>
            navigation.navigate('About' as any)
          )}
          {renderMenuItem('help-circle', '帮助与反馈', HEALING_COLORS.blue[400], true, () =>
            navigation.navigate('Feedback' as any)
          )}
        </View>

        {/* 退出登录按钮 */}
        {user && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                borderRadius: themeStyle.borderRadius,
              },
            ]}
            onPress={handleLogout}
          >
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
    backgroundColor: '#FAFAFA',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: HEALING_COLORS.pink[100],
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: HEALING_COLORS.pink[50],
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: HEALING_COLORS.gray[800],
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 13,
    color: HEALING_COLORS.gray[500],
    fontWeight: '500',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HEALING_COLORS.pink[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: HEALING_COLORS.gray[800],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: HEALING_COLORS.gray[500],
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: HEALING_COLORS.gray[100],
    marginVertical: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: HEALING_COLORS.gray[100],
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: HEALING_COLORS.gray[800],
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FFF0F3',
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: HEALING_COLORS.pink[200],
  },
  logoutButtonText: {
    fontSize: 16,
    color: HEALING_COLORS.pink[600],
    fontWeight: '700',
  },
});

export default MineScreen;
