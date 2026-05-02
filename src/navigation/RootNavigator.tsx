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
import CalendarScreen from '@/screens/mine/CalendarScreen';
import EditProfileScreen from '@/screens/mine/EditProfileScreen';
import FavoritesScreen from '@/screens/mine/FavoritesScreen';
import FeedbackScreen from '@/screens/mine/FeedbackScreen';
import MineScreen from '@/screens/mine/MineScreen';
import NotebooksScreen from '@/screens/mine/NotebooksScreen';
import SettingsScreen from '@/screens/mine/SettingsScreen';
import SubscriptionScreen from '@/screens/mine/SubscriptionScreen';
import AccountSecurityScreen from '@/screens/mine/AccountSecurityScreen';
import WebScreen from '@/screens/mine/WebScreen';
import FollowersScreen from '@/screens/circle/FollowersScreen';
import NotificationCenterScreen from '@/screens/mine/NotificationCenterScreen';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  EditDiary: { scenario?: string; diaryId?: string };
  DiaryDetail: { _id: string };
  CircleDetail: { _id: string };
  UserProfile: { userId: string };
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
  Web: { url: string; title?: string };
  Followers: { userId: string };
  NotificationCenter: undefined;
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
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
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerShown: false,
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
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};
