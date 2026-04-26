import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAuthStore } from '../../store/authStore';

import { useToast } from '@/components/common/Toast';

const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const { login, loginWithWechat, sendCode, loading } = useAuthStore();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [countdown]);

  const handleSendCode = async () => {
    if (phone?.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }
    const success = await sendCode(phone);
    if (success) {
      setCountdown(60);
      toast.success('验证码已发送');
    } else {
      const currentError = useAuthStore.getState().error;
      if (currentError) toast.error(currentError);
    }
  };

  const handleLogin = async () => {
    if (phone?.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }
    if (code?.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    await login(phone, code);
    const currentError = useAuthStore.getState().error;
    if (currentError) {
      toast.error(currentError);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          {/* 装饰元素 */}
          <View style={styles.decoration}>
            <Ionicons name="heart" size={24} color={COLORS.primary} style={styles.decorationIcon} />
            <Ionicons
              name="star"
              size={16}
              color={COLORS.secondary}
              style={[styles.decorationIcon, { top: 10, right: 40 }]}
            />
            <Ionicons
              name="flower"
              size={20}
              color={COLORS.primary}
              style={[styles.decorationIcon, { bottom: 20, left: 20 }]}
            />
          </View>

          {/* 标题部分 */}
          <View style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>欢迎回来！</Text>
            <Text style={styles.subtitle}>登录后开始记录你的美好生活</Text>
          </View>

          {/* 输入框部分 */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="call" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="请输入手机号"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={11}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="请输入验证码"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.codeButton, countdown > 0 && styles.codeButtonDisabled]}
                  onPress={handleSendCode}
                  disabled={countdown > 0}
                >
                  <Text
                    style={[styles.codeButtonText, countdown > 0 && styles.codeButtonTextDisabled]}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 登录按钮 */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>{loading ? '登录中...' : '登录'}</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
            </TouchableOpacity>

            {/* 微信登录（因个人开发者暂无权限，先隐藏以便后续使用） */}
            {false && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>或</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity
                  style={styles.wechatButton}
                  onPress={async () => {
                    await loginWithWechat();
                    const currentError = useAuthStore.getState().error;
                    if (currentError) toast.error(currentError);
                  }}
                  disabled={loading}
                >
                  <Ionicons name="logo-wechat" size={24} color="#07C160" />
                  <Text style={styles.wechatButtonText}>微信一键登录</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.large,
    justifyContent: 'flex-start',
    paddingTop: 80, // 将内容整体往上提
    position: 'relative',
  },
  decoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  decorationIcon: {
    position: 'absolute',
    opacity: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xlarge * 2,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.large,
  },
  title: {
    fontSize: FONT_SIZES.xxlarge + 4,
    fontWeight: 'bold',
    marginBottom: SPACING.small,
    color: COLORS.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 160, 122, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: SPACING.large,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputIcon: {
    marginRight: SPACING.medium,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.medium + 2,
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
  },
  codeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small + 4,
    borderRadius: 12,
    marginLeft: SPACING.small,
  },
  codeButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  codeButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  codeButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: SPACING.medium + 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.large,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.primary + '80',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginRight: SPACING.small,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xlarge,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.medium,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.medium,
  },
  wechatButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: SPACING.medium + 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#07C160',
    shadowColor: '#07C160',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 4,
  },
  wechatButtonText: {
    color: '#07C160',
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginLeft: SPACING.small,
  },
});

export default LoginScreen;
