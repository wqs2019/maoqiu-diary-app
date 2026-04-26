import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';

const AppLockSettingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const appLockEnabled = useAppStore((state) => state.appLockEnabled);
  const appLockPassword = useAppStore((state) => state.appLockPassword);
  const setAppLock = useAppStore((state) => state.setAppLock);

  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'initial' | 'set_password' | 'confirm_password'>('initial');

  const handleToggle = (val: boolean) => {
    if (val) {
      setStep('set_password');
    } else {
      Alert.alert('关闭密码锁', '确定要关闭应用密码锁吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setAppLock(false, null);
            setStep('initial');
            setPasswordInput('');
            setConfirmPassword('');
          },
        },
      ]);
    }
  };

  const handleSetPassword = () => {
    if (passwordInput.length !== 4) {
      Alert.alert('提示', '请输入4位数字密码');
      return;
    }
    setStep('confirm_password');
  };

  const handleConfirmPassword = () => {
    if (confirmPassword !== passwordInput) {
      Alert.alert('提示', '两次密码输入不一致，请重新输入');
      setConfirmPassword('');
      setStep('set_password');
      setPasswordInput('');
      return;
    }
    setAppLock(true, passwordInput);
    setStep('initial');
    setPasswordInput('');
    setConfirmPassword('');
    Alert.alert('提示', '密码锁已开启');
  };

  const handleCancelSetup = () => {
    setStep('initial');
    setPasswordInput('');
    setConfirmPassword('');
  };

  const renderContent = () => {
    if (step === 'initial') {
      return (
        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: HEALING_COLORS.yellow[600] + '15' },
                ]}
              >
                <Feather name="lock" size={20} color={HEALING_COLORS.yellow[600]} />
              </View>
              <Text
                style={[
                  styles.menuItemText,
                  { color: isDark ? '#E5E7EB' : HEALING_COLORS.gray[800] },
                ]}
              >
                应用密码锁
              </Text>
            </View>
            <View style={styles.menuItemRight}>
              <Switch
                value={appLockEnabled}
                onValueChange={handleToggle}
                trackColor={{
                  false: isDark ? '#333' : HEALING_COLORS.gray[200],
                  true: HEALING_COLORS.pink[400],
                }}
                thumbColor={isDark && !appLockEnabled ? '#888' : '#FFFFFF'}
              />
            </View>
          </View>
        </View>
      );
    }

    const isConfirm = step === 'confirm_password';
    return (
      <View style={styles.setupContainer}>
        <Text style={[styles.setupTitle, { color: isDark ? '#E5E7EB' : HEALING_COLORS.gray[800] }]}>
          {isConfirm ? '请再次输入密码' : '请设置4位数字密码'}
        </Text>
        <TextInput
          style={[
            styles.passwordInput,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFF',
              color: isDark ? '#FFF' : HEALING_COLORS.gray[800],
              borderColor: isDark ? '#333' : '#FFF0F3',
            },
          ]}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          autoFocus
          value={isConfirm ? confirmPassword : passwordInput}
          onChangeText={isConfirm ? setConfirmPassword : setPasswordInput}
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancelSetup}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={isConfirm ? handleConfirmPassword : handleSetPassword}
          >
            <Text style={styles.confirmButtonText}>下一步</Text>
          </TouchableOpacity>
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
          应用密码锁
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
  setupContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  passwordInput: {
    width: 200,
    height: 50,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 2,
  },
  cancelButton: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    borderColor: HEALING_COLORS.pink[400],
    backgroundColor: HEALING_COLORS.pink[400],
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppLockSettingScreen;
