import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from 'react-native';

import { HEALING_COLORS } from '../config/handDrawnTheme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/appStore';

export const AppLockOverlay: React.FC = () => {
  const { isDark } = useAppTheme();
  const biometricEnabled = useAppStore((state) => state.biometricEnabled);
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const setUnlocked = useAppStore((state) => state.setUnlocked);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setIsBiometricSupported(true);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '解锁毛球日记',
        fallbackLabel: '',
        cancelLabel: '取消',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setUnlocked(true);
      }
    } catch (e) {
      console.log('Biometric error:', e);
    }
  }, [setUnlocked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        if (biometricEnabled) {
          setUnlocked(false);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [biometricEnabled, setUnlocked]);

  // 每次需要显示锁屏时，重置状态
  useEffect(() => {
    if (!isUnlocked) {
      if (isBiometricSupported && biometricEnabled) {
        // Automatically trigger Face ID/Touch ID when the lock screen is shown
        handleBiometricAuth();
      }
    }
  }, [isUnlocked, isBiometricSupported, biometricEnabled, handleBiometricAuth]);

  if (!biometricEnabled || isUnlocked) {
    return null;
  }

  const bgColor = isDark ? '#121212' : '#FAFAFA';
  const textColor = isDark ? '#E5E7EB' : HEALING_COLORS.gray[800];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={48} color={HEALING_COLORS.pink[400]} />
        </View>
        <Text style={[styles.title, { color: textColor }]}>已锁定</Text>
      </View>

      <View style={styles.keyboard}>
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricAuth}
          activeOpacity={0.7}
        >
          <Ionicons
            name="scan-outline"
            size={48}
            color={HEALING_COLORS.pink[400]}
          />
          <Text style={[styles.biometricText, { color: textColor }]}>
            点击进行面容解锁
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: HEALING_COLORS.pink[400] + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  keyboard: {
    alignItems: 'center',
  },
  biometricButton: {
    alignItems: 'center',
    padding: 20,
  },
  biometricText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
