import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Screens
import { useAppTheme } from '@/hooks/useAppTheme';
import AIScreen from '@/screens/ai/AIScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import CategoryScreen from '@/screens/category/CategoryScreen';
import PhotoWallScreen from '@/screens/category/PhotoWallScreen';
import CircleDetailScreen from '@/screens/circle/CircleDetailScreen';
import CircleScreen from '@/screens/circle/CircleScreen';
import UserProfileScreen from '@/screens/circle/UserProfileScreen';
import DiaryDetailScreen from '@/screens/diary/DiaryDetailScreen';
import EditDiaryScreen from '@/screens/edit/EditDiaryScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import AboutScreen from '@/screens/mine/AboutScreen';
import AppLockSettingScreen from '@/screens/mine/AppLockSettingScreen';
import BadgesScreen from '@/screens/mine/BadgesScreen';
import BlockedUsersScreen from '@/screens/mine/BlockedUsersScreen';
import CalendarScreen from '@/screens/mine/CalendarScreen';
import EditProfileScreen from '@/screens/mine/EditProfileScreen';
import FavoritesScreen from '@/screens/mine/FavoritesScreen';
import FeedbackScreen from '@/screens/mine/FeedbackScreen';
import MineScreen from '@/screens/mine/MineScreen';
import MonitoringDashboardScreen from '@/screens/mine/MonitoringDashboardScreen';
import NotebooksScreen from '@/screens/mine/NotebooksScreen';
import SettingsScreen from '@/screens/mine/SettingsScreen';
import SubscriptionScreen from '@/screens/mine/SubscriptionScreen';
import AccountSecurityScreen from '@/screens/mine/AccountSecurityScreen';
import AdminCenterScreen from '@/screens/mine/AdminCenterScreen';
import SystemConfigScreen from '@/screens/mine/SystemConfigScreen';
import ThemeSettingScreen from '@/screens/mine/ThemeSettingScreen';
import WebScreen from '@/screens/mine/WebScreen';
import AdminModerationScreen from '../screens/mine/AdminModerationScreen';
import ReportDiaryPickerScreen from '../screens/circle/ReportDiaryPickerScreen';
import FollowersScreen from '@/screens/circle/FollowersScreen';
import NotificationCenterScreen from '@/screens/mine/NotificationCenterScreen';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  EditDiary: { scenario?: string; diaryId?: string };
  DiaryDetail: { _id: string };
  CircleDetail: { _id: string };
  UserProfile: {
    userId: string;
    selectedReportDiary?: {
      _id: string;
      title?: string;
      content?: string;
      mediaCount?: number;
      createdAt?: string;
      date?: string;
    };
  };
  ReportDiaryPicker: { userId: string; selectedDiaryId?: string | null };
  EditProfile: undefined;
  PhotoWall: { scenario?: string };
  About: undefined;
  Feedback: undefined;
  Badges: undefined;
  Calendar: undefined;
  Favorites: undefined;
  Notebooks: undefined;
  Settings: undefined;
  AccountSecurity: undefined;
  Subscription: undefined;
  AppLockSetting: undefined;
  ThemeSetting: undefined;
  Web: { url: string; title?: string };
  Followers: { userId: string };
  NotificationCenter: undefined;
  BlockedUsers: undefined;
  AdminCenter: undefined;
  MonitoringDashboard: undefined;
  SystemConfig: undefined;
  AdminModeration:
    | {
        feedbackId?: string;
        initialStatus?: 'pending' | 'processing' | 'resolved' | 'rejected' | 'all';
      }
    | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Circle: undefined;
  Category: undefined;
  AI: undefined;
  Mine: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const MainNavigator = () => {
  const { themeName, colors } = useAppTheme();
  const appConfig = useAppStore((state) => state.appConfig);
  const user = useAuthStore((state) => state.user);
  const circleUnreadCount = useNotificationStore((state) => state.circleUnreadCount);
  const setCenterUnreadCount = useNotificationStore((state) => state.setCenterUnreadCount);
  const setCircleUnreadCount = useNotificationStore((state) => state.setCircleUnreadCount);

  // 引入全局主题配色
  const { HEALING_COLORS, DARK_HEALING_COLORS } = require('@/config/handDrawnTheme');
  const currentHealingColors = themeName === 'dark' ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;

  React.useEffect(() => {
    if (!user?._id) {
      setCenterUnreadCount(0);
      setCircleUnreadCount(0);
      return;
    }

    Promise.all([
      getUnreadNotificationCount(user._id, { excludeTypes: ['like', 'comment'] }),
      getUnreadNotificationCount(user._id, { types: ['like', 'comment'] }),
    ])
      .then(([centerCount, tabCount]) => {
        setCenterUnreadCount(centerCount);
        setCircleUnreadCount(tabCount);
      })
      .catch(() => {
        setCenterUnreadCount(0);
        setCircleUnreadCount(0);
      });
  }, [setCenterUnreadCount, setCircleUnreadCount, user?._id]);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'paw' : 'paw-outline';
          } else if (route.name === 'Circle') {
            iconName = focused ? 'planet' : 'planet-outline';
          } else if (route.name === 'Category') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AI') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Mine') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: currentHealingColors.pink[500],
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBadge:
          route.name === 'Circle' && circleUnreadCount > 0
            ? circleUnreadCount > 99
              ? '99+'
              : circleUnreadCount
            : undefined,
        tabBarBadgeStyle:
          route.name === 'Circle'
            ? {
                backgroundColor: '#FF4D6D',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '700',
              }
            : undefined,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} options={{ title: '足迹' }} />
      {appConfig?.show_circle !== false && (
        <MainTab.Screen name="Circle" component={CircleScreen} options={{ title: '圈子' }} />
      )}
      <MainTab.Screen name="Category" component={CategoryScreen} options={{ title: '分类' }} />
      {appConfig?.show_ai_chat !== false && (
        <MainTab.Screen
          name="AI"
          component={AIScreen}
          options={{
            title: 'AI问答',
            tabBarStyle: { display: 'none' },
          }}
        />
      )}
      <MainTab.Screen name="Mine" component={MineScreen} options={{ title: '我的' }} />
    </MainTab.Navigator>
  );
};

export const RootNavigator = () => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isFirstLaunch = useAppStore((state) => state.isFirstLaunch);
  const { colors } = useAppTheme();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstLaunch ? (
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : isLoggedIn ? (
        <>
          <RootStack.Screen name="Main" component={MainNavigator} />
          <RootStack.Screen
            name="EditDiary"
            component={EditDiaryScreen}
            options={{
              title: '写日记',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="DiaryDetail"
            component={DiaryDetailScreen}
            options={{
              title: '日记详情',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="CircleDetail"
            component={CircleDetailScreen}
            options={{
              title: '圈子详情',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="ReportDiaryPicker"
            component={ReportDiaryPickerScreen}
            options={{
              title: '选择关联笔记',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="MonitoringDashboard"
            component={MonitoringDashboardScreen}
            options={{
              title: '监控大盘',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="SystemConfig"
            component={SystemConfigScreen}
            options={{
              title: '系统配置',
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.text,
              headerBackTitle: '返回',
            }}
          />
          <RootStack.Screen
            name="PhotoWall"
            component={PhotoWallScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="About"
            component={AboutScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Favorites"
            component={FavoritesScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Notebooks"
            component={NotebooksScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="AccountSecurity"
            component={AccountSecurityScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Web"
            component={WebScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="AppLockSetting"
            component={AppLockSettingScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="ThemeSetting"
            component={ThemeSettingScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="Followers"
            component={FollowersScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="NotificationCenter"
            component={NotificationCenterScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="AdminCenter"
            component={AdminCenterScreen}
            options={{
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="AdminModeration"
            component={AdminModerationScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};
