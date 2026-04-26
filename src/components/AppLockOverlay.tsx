import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';

import { HEALING_COLORS } from '../config/handDrawnTheme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');

export const AppLockOverlay: React.FC = () => {
  const { isDark } = useAppTheme();
  const appLockEnabled = useAppStore((state) => state.appLockEnabled);
  const appLockPassword = useAppStore((state) => state.appLockPassword);
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const setUnlocked = useAppStore((state) => state.setUnlocked);

  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType[]>([]);

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkBiometric = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setIsBiometricSupported(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType(types);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '解锁毛球日记',
        fallbackLabel: '使用密码',
        cancelLabel: '取消',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setUnlocked(true);
        setInputCode('');
      }
    } catch (e) {
      console.log('Biometric error:', e);
    }
  }, [setUnlocked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        if (appLockEnabled) {
          setUnlocked(false);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled, setUnlocked]);

  // 每次需要显示锁屏时，重置状态
  useEffect(() => {
    if (!isUnlocked) {
      setInputCode('');
      setErrorMsg('');
      if (isBiometricSupported && appLockEnabled) {
        // Automatically trigger Face ID/Touch ID when the lock screen is shown
        handleBiometricAuth();
      }
    }
  }, [isUnlocked, isBiometricSupported, appLockEnabled, handleBiometricAuth]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (num: string) => {
    if (inputCode.length < 4) {
      const newCode = inputCode + num;
      setInputCode(newCode);
      setErrorMsg('');

      if (newCode.length === 4) {
        if (newCode === appLockPassword) {
          // 密码正确，解锁
          setUnlocked(true);
          setInputCode('');
        } else {
          // 密码错误
          setErrorMsg('密码错误，请重试');
          triggerShake();
          setTimeout(() => {
            setInputCode('');
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    if (inputCode.length > 0) {
      setInputCode(inputCode.slice(0, -1));
      setErrorMsg('');
    }
  };

  if (!appLockEnabled || isUnlocked) {
    return null;
  }

  const bgColor = isDark ? '#121212' : '#FAFAFA';
  const textColor = isDark ? '#E5E7EB' : HEALING_COLORS.gray[800];
  const keyBgColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const keyBorderColor = isDark ? '#333' : '#FFF0F3';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={48} color={HEALING_COLORS.pink[400]} />
        </View>
        <Text style={[styles.title, { color: textColor }]}>请输入密码</Text>

        <Animated.View
          style={[styles.dotsContainer, { transform: [{ translateX: shakeAnimation }] }]}
        >
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: isDark ? '#555' : HEALING_COLORS.gray[300],
                  backgroundColor:
                    inputCode.length > index ? HEALING_COLORS.pink[400] : 'transparent',
                },
              ]}
            />
          ))}
        </Animated.View>

        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>

      <View style={styles.keyboard}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keyButton,
                  { backgroundColor: keyBgColor, borderColor: keyBorderColor },
                ]}
                onPress={() => {
                  handleKeyPress(key);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          {isBiometricSupported ? (
            <TouchableOpacity
              style={[
                styles.keyButton,
                { backgroundColor: 'transparent', borderColor: 'transparent' },
              ]}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
                    ? 'scan-outline'
                    : 'finger-print-outline'
                }
                size={32}
                color={textColor}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.keyButton,
                { backgroundColor: 'transparent', borderColor: 'transparent' },
              ]}
            />
          )}
          <TouchableOpacity
            style={[styles.keyButton, { backgroundColor: keyBgColor, borderColor: keyBorderColor }]}
            onPress={() => {
              handleKeyPress('0');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: textColor }]}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keyButton, { backgroundColor: keyBgColor, borderColor: keyBorderColor }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={28} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 50,
  },
  content: {
    alignItems: 'center',
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
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    minHeight: 20,
  },
  keyboard: {
    paddingHorizontal: 30,
    gap: 15,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: (width - 60 - 40) / 3,
    height: (width - 60 - 40) / 3,
    borderRadius: (width - 60 - 40) / 3 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
});
