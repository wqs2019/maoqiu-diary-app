import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';

const AppLockSettingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const biometricEnabled = useAppStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useAppStore((state) => state.setBiometricEnabled);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricName, setBiometricName] = useState('面容解锁');

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

  const handleBiometricToggle = async (val: boolean) => {
    if (val) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: '验证以开启生物识别解锁',
          fallbackLabel: '使用密码',
          cancelLabel: '取消',
        });
        if (result.success) {
          setBiometricEnabled(true);
        }
      } catch (e) {
        console.log('Biometric setup error:', e);
        Alert.alert('提示', '生物识别验证失败');
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  const renderContent = () => {
    if (!isBiometricSupported) {
      return (
        <View style={styles.menuSection}>
          <Text style={[styles.notSupportedText, { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[500] }]}>
            当前设备不支持面容解锁
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.menuSection}>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: HEALING_COLORS.blue[500] + '15' },
              ]}
            >
              <Feather name="smile" size={20} color={HEALING_COLORS.blue[500]} />
            </View>
            <Text
              style={[
                styles.menuItemText,
                { color: isDark ? '#E5E7EB' : HEALING_COLORS.gray[800] },
              ]}
            >
              {biometricName}
            </Text>
          </View>
          <View style={styles.menuItemRight}>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{
                false: isDark ? '#333' : HEALING_COLORS.gray[200],
                true: HEALING_COLORS.pink[400],
              }}
              thumbColor={isDark && !biometricEnabled ? '#888' : '#FFFFFF'}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#E5E7EB' : HEALING_COLORS.gray[800]}
          />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: isDark ? '#E5E7EB' : HEALING_COLORS.gray[800] }]}
        >
          隐私安全
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: HAND_DRAWN_STYLES.soft.borderRadius,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notSupportedText: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default AppLockSettingScreen;
