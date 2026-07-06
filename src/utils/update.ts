import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../i18n';

export const APP_STORE_URL = 'https://apps.apple.com/cn/app/%E6%AF%9B%E7%90%83%E6%97%A5%E8%AE%B0/id6759290118';
const APP_STORE_LOOKUP_URL = 'https://itunes.apple.com/lookup?id=6759290118&country=cn';
const APP_VERSION = Constants.expoConfig?.version || Constants.nativeAppVersion || '';

// 仅用于测试：强制模拟当前版本为一个较低的版本
// const TEST_APP_VERSION = '1.0.0'; 
// const CURRENT_VERSION = TEST_APP_VERSION || APP_VERSION;
const CURRENT_VERSION = APP_VERSION;

const compareVersions = (currentVersion: string, targetVersion: string) => {
  const currentParts = String(currentVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const targetParts = String(targetVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const maxLength = Math.max(currentParts.length, targetParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const current = currentParts[index] || 0;
    const target = targetParts[index] || 0;

    if (current > target) {
      return 1;
    }

    if (current < target) {
      return -1;
    }
  }

  return 0;
};

export const checkAppUpdate = async (showNoUpdateAlert = false): Promise<{ hasUpdate: boolean; latestVersion?: string; currentVersion?: string } | null> => {
  if (Platform.OS !== 'ios') return null;

  try {
    const response = await fetch(APP_STORE_LOOKUP_URL);

    if (!response.ok) {
      if (showNoUpdateAlert) {
        Alert.alert(i18n.t('aboutScreen.updateErrors.checkTitle'), i18n.t('aboutScreen.updateErrors.appStoreUnavailable'));
      }
      return null;
    }

    const result = await response.json();
    const latestVersion = result?.results?.[0]?.version?.trim();

    if (!latestVersion) {
      if (showNoUpdateAlert) {
        Alert.alert(i18n.t('aboutScreen.updateErrors.checkTitle'), i18n.t('aboutScreen.updateErrors.noStoreInfo'));
      }
      return null;
    }

    if (compareVersions(CURRENT_VERSION, latestVersion) < 0) {
      return { hasUpdate: true, latestVersion, currentVersion: CURRENT_VERSION };
    }

    if (showNoUpdateAlert) {
      Alert.alert(i18n.t('aboutScreen.updateErrors.checkTitle'), i18n.t('aboutScreen.updateErrors.latestVersion', { current: CURRENT_VERSION }));
    }
    return { hasUpdate: false, latestVersion, currentVersion: CURRENT_VERSION };
  } catch (error: any) {
    if (showNoUpdateAlert) {
      Alert.alert(i18n.t('aboutScreen.updateErrors.checkFailed'), error?.message || i18n.t('aboutScreen.updateErrors.checkFailedFallback'));
    }
    return null;
  }
};
