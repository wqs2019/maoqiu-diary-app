import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  HAND_DRAWN_STYLES,
  HEALING_COLORS,
  DARK_HEALING_COLORS,
} from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryStats } from '../../hooks/useDiaryQuery';
import { useJoinDays } from '../../hooks/useJoinDays';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useNotebookStore } from '../../store/notebookStore';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

type MineScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const MineScreen: React.FC = () => {
  const navigation = useNavigation<MineScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, logout, fetchUserInfo } = useAuthStore();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft; // 使用柔和手绘风格
  const { isDark } = useAppTheme();
  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;

  // 获取用户所有日记统计数据
  const stats = useDiaryStats(user?._id);
  const getNotebooks = useNotebookStore((state) => state.getNotebooks);
  const fetchNotebooks = useNotebookStore((state) => state.fetchNotebooks);
  const notebookCount = user?._id ? getNotebooks(user._id).length : 0;
  const isFocused = useIsFocused();
  const centerUnreadCount = useNotificationStore((state) => state.centerUnreadCount);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);

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

  useEffect(() => {
    if (user?._id && isFocused) {
      refreshUnreadCount(user._id);
    }
  }, [user?._id, isFocused, refreshUnreadCount]);

  const handleLogout = async () => {
    Alert.alert(t('mineScreen.logoutTitle'), t('mineScreen.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('mineScreen.logoutConfirm'),
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const renderMenuItem = (
    iconName: keyof typeof Feather.glyphMap,
    title: string,
    color: string,
    isLast = false,
    onPress?: () => void,
    badgeCount?: number
  ) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder,
        { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[50] },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
        <Feather name={iconName} size={20} color={color} />
      </View>
      <Text
        style={[
          styles.menuItemText,
          { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
        ]}
      >
        {title}
      </Text>
      <View style={styles.menuTrailing}>
        {!!badgeCount && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        )}
        <Feather
          name="chevron-right"
          size={20}
          color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      {/* 顶部背景装饰 */}
      {user?.profileBackground ? (
        <View style={[styles.headerBackgroundContainer, { height: 260 + insets.top }]}>
          <Image
            source={{ uri: user.profileBackground }}
            style={styles.headerBackgroundImage}
          />
          {/* 半透明黑色遮罩，确保前景信息更清晰 */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} pointerEvents="none" />
          
          <View style={styles.headerBackgroundGradient} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={isDark ? '#121212' : '#FAFAFA'} stopOpacity="0" />
                  <Stop offset="1" stopColor={isDark ? '#121212' : '#FAFAFA'} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grad)" />
            </Svg>
          </View>
        </View>
      ) : (
        <View style={[styles.headerBackgroundContainer, { height: 260 + insets.top }]}>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[400] },
            ]}
          />
          
          <View style={styles.headerBackgroundGradient} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="grad-default" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={isDark ? '#121212' : '#FAFAFA'} stopOpacity="0" />
                  <Stop offset="1" stopColor={isDark ? '#121212' : '#FAFAFA'} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#grad-default)" />
            </Svg>
          </View>
        </View>
      )}

      {/* 顶部操作区 */}
      <View style={[styles.topActions, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={[styles.circleButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)', marginRight: 12 }]}
          onPress={() => {
            if (user?._id) {
              navigation.navigate('UserProfile' as any, { userId: user._id });
            }
          }}
        >
          <Feather name="globe" size={20} color={isDark ? '#E5E7EB' : HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bellButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)' }]}
          onPress={() => navigation.navigate('NotificationCenter' as any)}
        >
          <Feather name="bell" size={20} color={isDark ? '#E5E7EB' : HEALING_COLORS.gray[800]} />
          {centerUnreadCount > 0 && (
            <View style={styles.redDot}>
              <Text style={styles.redDotText}>{centerUnreadCount > 99 ? '99+' : centerUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 用户信息区（移除卡片样式） */}
        <View style={styles.userInfoContainer}>
          <TouchableOpacity
            style={styles.userInfoMainTapArea}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <Image
              source={
                user?.avatar
                  ? { uri: user.avatar }
                  : require('../../../assets/logo_bg.png')
              }
              fadeDuration={0}
              style={[
                styles.avatar,
                {
                  borderColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  backgroundColor: isDark ? '#333' : currentHealingColors.pink[50],
                },
              ]}
            />
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text
                  style={[styles.userName, { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}
                >
                  {user?.nickname || t('mineScreen.defaultNickname')}
                </Text>
              </View>
              <Text
                style={[
                  styles.userPhone,
                  { color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
                ]}
              >
                {user?.phone
                  ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                  : user?.appleId
                  ? 'Apple 账号登录'
                  : t('mineScreen.guestPhone')}
              </Text>
              {user && (
                <View
                  style={[
                    styles.joinDaysTag,
                    { backgroundColor: 'rgba(0,0,0,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.joinDaysText,
                      { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
                    ]}
                  >
                    {t('mineScreen.joinDays', { days: joinDays })}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          {user?.isVip?.value && (
            <TouchableOpacity
              style={styles.vipBadgeTapArea}
              onPress={() => {
                navigation.navigate('Subscription' as any);
              }}
              activeOpacity={0.8}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            >
              <View
                style={[styles.vipBadge, { backgroundColor: isDark ? 'rgba(55,65,81,0.8)' : 'rgba(255,255,255,0.2)' }]}
              >
                <Feather name="award" size={14} color="#FFD700" style={styles.vipBadgeIcon} />
                <Text style={[styles.vipBadgeText, { color: '#FFD700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]} >{t('mineScreen.vipBadge')}</Text>
                <Feather name="chevron-right" size={14} color="#FFD700" style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* VIP 开通入口 */}
        {!user?.isVip?.value && (
          <TouchableOpacity
            style={[
              styles.vipBanner,
              {
                backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[50],
                borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('Subscription' as any);
            }}
          >
            <View style={styles.vipBannerLeft}>
              <View style={[styles.vipIconWrap, { backgroundColor: isDark ? '#374151' : '#FFF' }]}>
                <Feather
                  name="award"
                  size={20}
                  color={currentHealingColors.pink[500]}
                />
              </View>
              <View style={styles.vipBannerTextContainer}>
                <Text
                  style={[
                    styles.vipBannerTitle,
                    { color: isDark ? '#FFF' : currentHealingColors.gray[800] },
                  ]}
                >
                  {t('mineScreen.vipTitle')}
                </Text>
                <Text
                  style={[
                    styles.vipBannerSubtitle,
                    { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                  ]}
                >
                  {t('mineScreen.vipSubtitle')}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.vipBannerButton,
                { backgroundColor: currentHealingColors.pink[500] },
              ]}
            >
              <Text style={styles.vipBannerButtonText}>{t('mineScreen.vipAction')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 统计数据区 */}
        <View
          style={[
            styles.statsContainer,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                { color: isDark ? '#FFF' : currentHealingColors.gray[800] },
              ]}
            >
              {notebookCount}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
              ]}
            >
              {t('mineScreen.stats.notebooks')}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] },
            ]}
          />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                { color: isDark ? '#FFF' : currentHealingColors.gray[800] },
              ]}
            >
              {stats.totalDiaries}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
              ]}
            >
              {t('mineScreen.stats.diaries')}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] },
            ]}
          />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                { color: isDark ? '#FFF' : currentHealingColors.gray[800] },
              ]}
            >
              {stats.maxStreak}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
              ]}
            >
              {t('mineScreen.stats.streak')}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: isDark ? '#333' : HEALING_COLORS.gray[100] },
            ]}
          />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Badges' as any);
            }}
          >
            <Text
              style={[
                styles.statNumber,
                { color: isDark ? '#FFF' : currentHealingColors.gray[800] },
              ]}
            >
              {stats.badges}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
              ]}
            >
              {t('mineScreen.stats.badges')}
            </Text>
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
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
            },
          ]}
        >
          {renderMenuItem(
            'book-open',
            t('mineScreen.menus.notebooks'),
            currentHealingColors.pink[500],
            false,
            () => {
              navigation.navigate('Notebooks' as any);
            }
          )}
          {renderMenuItem(
            'star',
            t('mineScreen.menus.favorites'),
            currentHealingColors.pink[500],
            false,
            () => {
              navigation.navigate('Favorites' as any);
            }
          )}
          {renderMenuItem(
            'calendar',
            t('mineScreen.menus.calendar'),
            currentHealingColors.pink[500],
            true,
            () => {
              navigation.navigate('Calendar' as any);
            }
          )}
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
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
            },
          ]}
        >
          {renderMenuItem(
            'settings',
            t('mineScreen.menus.settings'),
            currentHealingColors.pink[500],
            false,
            () => {
              navigation.navigate('Settings');
            }
          )}
          {renderMenuItem(
            'info',
            t('mineScreen.menus.about'),
            currentHealingColors.pink[500],
            false,
            () => {
              navigation.navigate('About');
            }
          )}
          {renderMenuItem(
            'help-circle',
            t('mineScreen.menus.feedback'),
            currentHealingColors.pink[600],
            true,
            () => {
              navigation.navigate('Feedback');
            }
          )}
        </View>

        {/* 管理员入口 */}
        {user?.isAdmin && (
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
                borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              },
            ]}
          >
            {renderMenuItem(
              'shield',
              t('mineScreen.menus.adminCenter'),
              currentHealingColors.pink[600],
              true,
              () => {
                navigation.navigate('AdminCenter');
              }
            )}
          </View>
        )}

        {/* 退出登录按钮 */}
        {user && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                borderRadius: themeStyle.borderRadius,
                backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[50],
                borderColor: isDark ? '#4A2533' : currentHealingColors.pink[200],
              },
            ]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: currentHealingColors.pink[600] }]}>
              {t('mine.logout')}
            </Text>
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
  // 顶部纯色背景样式已移除，因为统一使用了带有渐变的容器
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
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 10,
    position: 'relative',
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  redDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    marginTop: -40,
    zIndex: 2,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 10,
    position: 'relative',
    zIndex: 3,
  },
  userInfoMainTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
    zIndex: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    zIndex: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: HEALING_COLORS.gray[800],
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    zIndex: 3,
  },
  vipBadgeTapArea: {
    marginLeft: 8,
    zIndex: 4,
  },
  vipBadgeIcon: {
    marginRight: 2,
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  userPhone: {
    fontSize: 13,
    color: HEALING_COLORS.gray[500],
    fontWeight: '500',
    marginBottom: 6,
  },
  joinDaysTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  joinDaysText: {
    fontSize: 10,
    fontWeight: '600',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
  menuTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 40,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    color: HEALING_COLORS.pink[600],
    fontWeight: '700',
  },
});

export default MineScreen;
