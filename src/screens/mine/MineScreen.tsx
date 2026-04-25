import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useDiaryStats } from '../../hooks/useDiaryQuery';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useJoinDays } from '../../hooks/useJoinDays';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';

type MineScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MineScreen: React.FC = () => {
  const navigation = useNavigation<MineScreenNavigationProp>();
  const { user, logout, fetchUserInfo } = useAuthStore();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft; // 使用柔和手绘风格
  const { isDark, colors } = useAppTheme();
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;

  // 获取用户所有日记统计数据
  const stats = useDiaryStats(user?._id);
  const getNotebooks = useNotebookStore((state) => state.getNotebooks);
  const fetchNotebooks = useNotebookStore((state) => state.fetchNotebooks);
  const notebookCount = user?._id ? getNotebooks(user._id).length : 0;

  // 使用 hook 计算加入天数
  const joinDays = useJoinDays(user);

  useEffect(() => {
    // 仅在没有用户信息时才主动获取，避免重复获取导致页面闪烁
    if (!user) {
      fetchUserInfo();
    } else {
      fetchNotebooks(user._id);
    }
  }, [fetchUserInfo, user, fetchNotebooks]);

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
      style={[styles.menuItem, !isLast && styles.menuItemBorder, { borderBottomColor: isDark ? '#333' : '#FFF0F3' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
        <Feather name={iconName} size={20} color={color} />
      </View>
      <Text style={[styles.menuItemText, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>{title}</Text>
      <Feather name="chevron-right" size={20} color={isDark ? '#6B7280' : currentHealingColors.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      {/* 顶部背景装饰 */}
      <View style={[styles.headerBackground, { height: 200 + insets.top, backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[100] }]} />

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
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity,
              shadowRadius: themeStyle.shadowRadius,
              shadowOffset: themeStyle.shadowOffset,
              elevation: 8,
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
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
            style={[styles.avatar, { borderColor: isDark ? '#1E1E1E' : '#FFFFFF', backgroundColor: isDark ? '#333' : HEALING_COLORS.pink[50] }]}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>{user?.nickname || '毛球日记'}</Text>
            <Text style={[styles.userPhone, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
              {user?.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '点击登录 / 注册 ✨'}
            </Text>
            {user && (
              <View style={[styles.joinDaysTag, { backgroundColor: isDark ? '#374151' : currentHealingColors.pink[50] }]}>
                <Text style={[styles.joinDaysText, { color: isDark ? '#D1D5DB' : currentHealingColors.pink[500] }]}>
                  来毛球日记的第 {joinDays} 天
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[50] }
            ]}
            onPress={() => {
              navigation.navigate('EditProfile');
            }}
          >
            <Feather name="edit-2" size={16} color={isDark ? currentHealingColors.pink[500] : currentHealingColors.pink[500]} />
          </TouchableOpacity>
        </View>

        {/* VIP 开通入口 */}
        <TouchableOpacity
          style={[
            styles.vipBanner,
            {
              backgroundColor: isDark ? '#2C1B24' : (user?.isVip?.value ? '#FEF3C7' : currentHealingColors.pink[50]),
              borderColor: isDark ? '#333' : (user?.isVip?.value ? '#FDE68A' : '#FFF0F3'),
            }
          ]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Subscription' as any)}
        >
          <View style={styles.vipBannerLeft}>
            <View style={[styles.vipIconWrap, { backgroundColor: isDark ? '#374151' : '#FFF' }]}>
              <Feather name="award" size={20} color={user?.isVip?.value ? '#F59E0B' : currentHealingColors.pink[500]} />
            </View>
            <View style={styles.vipBannerTextContainer}>
              <Text style={[styles.vipBannerTitle, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>
                {user?.isVip?.value ? '毛球日记 尊贵会员' : '毛球日记 高级会员'}
              </Text>
              <Text style={[styles.vipBannerSubtitle, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
                {user?.isVip?.value ? (
                  user.isVip.expiresAt ? `${new Date(user.isVip.expiresAt).toLocaleDateString('zh-CN')} 到期` : '已解锁所有专属特权'
                ) : '解锁云同步、无限图片与专属贴纸'}
              </Text>
            </View>
          </View>
          <View style={[styles.vipBannerButton, { backgroundColor: user?.isVip?.value ? '#F59E0B' : currentHealingColors.pink[500] }]}>
            <Text style={styles.vipBannerButtonText}>{user?.isVip?.value ? '会员中心' : '立即开通'}</Text>
          </View>
        </TouchableOpacity>

        {/* 统计数据区 */}
        <View style={[styles.statsContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#FFF0F3' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>{notebookCount}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>日记本</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>{stats.totalDiaries}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>日记</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>连续打卡(天)</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] }]} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Badges' as any);
            }}
          >
            <Text style={[styles.statNumber, { color: isDark ? '#FFF' : currentHealingColors.gray[800] }]}>{stats.badges}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>徽章</Text>
          </TouchableOpacity>
        </View>

        {/* 菜单区块 1 */}
        <View
          style={[
            styles.menuSection,
            {
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
            },
          ]}
        >
          {renderMenuItem('book-open', '我的日记本', isDark ? currentHealingColors.blue[600] : currentHealingColors.blue[500], false, () => {
            navigation.navigate('Notebooks' as any);
          })}
          {renderMenuItem('star', '收藏夹', isDark ? currentHealingColors.yellow[300] : currentHealingColors.yellow[500], false, () => {
            navigation.navigate('Favorites' as any);
          })}
          {renderMenuItem('calendar', '打卡日历', isDark ? currentHealingColors.green[300] : currentHealingColors.green[500], true, () => {
            navigation.navigate('Calendar' as any);
          })}
        </View>

        {/* 菜单区块 2 */}
        <View
          style={[
            styles.menuSection,
            {
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
            },
          ]}
        >
          {renderMenuItem('settings', '应用设置', isDark ? '#D1D5DB' : currentHealingColors.gray[500], false, () => {
            navigation.navigate('Settings');
          })}
          {renderMenuItem('info', '关于毛球', isDark ? currentHealingColors.pink[500] : currentHealingColors.pink[400], false, () => {
            navigation.navigate('About');
          })}
          {renderMenuItem('help-circle', '帮助与反馈', isDark ? currentHealingColors.blue[500] : currentHealingColors.blue[400], true, () => {
            navigation.navigate('Feedback');
          })}
        </View>

        {/* 退出登录按钮 */}
        {user && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                borderRadius: themeStyle.borderRadius,
                backgroundColor: isDark ? '#2C1B24' : '#FFF0F3',
              },
            ]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: currentHealingColors.pink[600] }]}>退出登录</Text>
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
  joinDaysTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  joinDaysText: {
    fontSize: 10,
    fontWeight: '600',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HEALING_COLORS.pink[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
  },
  vipBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vipBannerTextContainer: {
    flex: 1,
  },
  vipBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  vipBannerSubtitle: {
    fontSize: 11,
  },
  vipBannerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  vipBannerButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
