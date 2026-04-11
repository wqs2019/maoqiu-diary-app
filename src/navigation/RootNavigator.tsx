import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { COLORS } from '@/config/constant';

// Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import CategoryScreen from '@/screens/category/CategoryScreen';
import AIScreen from '@/screens/ai/AIScreen';
import MineScreen from '@/screens/mine/MineScreen';
import EditDiaryScreen from '@/screens/edit/EditDiaryScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EditDiary: { scenario?: string; diaryId?: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
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
  const { theme } = useAppStore();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Category') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AI') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'Mine') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? COLORS.background : COLORS.surface,
          borderTopColor: theme === 'dark' ? COLORS.border : COLORS.border,
          elevation: 0,
          shadowOpacity: 0,
        },
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <MainTab.Screen name="Category" component={CategoryScreen} options={{ title: '分类' }} />
      <MainTab.Screen name="AI" component={AIScreen} options={{ title: 'AI' }} />
      <MainTab.Screen name="Mine" component={MineScreen} options={{ title: '我的' }} />
    </MainTab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isLoggedIn } = useAuthStore();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <RootStack.Screen name="Main" component={MainNavigator} />
          <RootStack.Screen
            name="EditDiary"
            component={EditDiaryScreen}
            options={{
              presentation: 'modal',
              title: '写日记',
            }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};
