import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 全局通知行为配置
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const DAILY_REMINDER_IDENTIFIER = 'daily-diary-reminder';

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.log('Failed to get Expo push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleDailyReminder() {
  // 仅检查权限，不强制要求 push token（因为是本地通知）
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return false;
  }

  // 取消旧的，防止重复
  await cancelDailyReminder();

  // 每天晚上 22:00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✨ 记录今天的故事',
      body: '今天过得怎么样？来毛球日记写下今天的点滴吧~',
      sound: true,
    },
    trigger: {
      type: 'calendar',
      hour: 22,
      minute: 0,
      repeats: true,
    } as any, // 兼容不同版本的 expo-notifications
    identifier: DAILY_REMINDER_IDENTIFIER,
  });

  console.log('Scheduled daily reminder at 22:00');
  return true;
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_IDENTIFIER);
  console.log('Canceled daily reminder');
}

// export async function testNotification() {
//   const hasPermission = await registerForPushNotificationsAsync();
//   if (!hasPermission) return false;

//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: '✨ 记录今天的故事 (测试)',
//       body: '这是一条测试通知，提醒你来写日记啦~',
//       sound: true,
//     },
//     trigger: {
//       type: 'timeInterval',
//       seconds: 3, // 3秒后触发
//       repeats: false,
//     } as any,
//   });

//   console.log('Scheduled test notification in 3 seconds');
//   return true;
// }
