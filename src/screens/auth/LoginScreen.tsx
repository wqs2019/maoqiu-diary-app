import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuthStore } from '../../store/authStore';

import { Modal as CommonModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';

const { width } = Dimensions.get('window');
const AGREEMENT_ACCEPTED_KEY = 'login_agreement_accepted';
const USER_AGREEMENT_URL = 'https://wqs2019.github.io/maoqiu-diary-app/terms.html';
const PRIVACY_POLICY_URL = 'https://wqs2019.github.io/maoqiu-diary-app/privacy.html';

// 动画背景组件
const FloatingBlob = ({ 
  color, 
  size, 
  initialTop, 
  initialLeft, 
  animationDuration,
  scaleRange = [0.9, 1.1],
  translateYRange = [-15, 15]
}: { 
  color: string; 
  size: number; 
  initialTop: number; 
  initialLeft: number;
  animationDuration: number;
  scaleRange?: [number, number];
  translateYRange?: [number, number];
}) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(scaleRange[0], { duration: animationDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(scaleRange[1], { duration: animationDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(translateYRange[0], { duration: animationDuration * 1.2, easing: Easing.inOut(Easing.ease) }),
        withTiming(translateYRange[1], { duration: animationDuration * 1.2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: initialTop,
          left: initialLeft,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.65, // 降低透明度让颜色显得更浅更柔和
          filter: 'blur(30px)', // 在支持的平台上产生高斯模糊效果，或者使用阴影模拟
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
        },
        animatedStyle,
      ]}
    />
  );
};

const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [agreementModalVisible, setAgreementModalVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { login, loginWithWechat, sendCode, loading, sendingCode } = useAuthStore();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isDark, colors } = useAppTheme();

  useEffect(() => {
    const loadAgreementState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(AGREEMENT_ACCEPTED_KEY);
        setHasAcceptedAgreement(storedValue === '1');
      } catch (error) {
        console.error('Failed to load agreement state:', error);
      }
    };

    loadAgreementState();
  }, []);

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

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const openPolicyLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Open policy link failed:', error);
      toast.error('打开协议失败，请稍后重试');
    }
  };

  const toggleAgreement = async () => {
    const nextValue = !hasAcceptedAgreement;
    setHasAcceptedAgreement(nextValue);
    try {
      if (nextValue) {
        await AsyncStorage.setItem(AGREEMENT_ACCEPTED_KEY, '1');
      } else {
        await AsyncStorage.removeItem(AGREEMENT_ACCEPTED_KEY);
      }
    } catch (error) {
      console.error('Failed to persist agreement state:', error);
    }
  };

  const acceptAgreementFromModal = async () => {
    if (!hasAcceptedAgreement) {
      setHasAcceptedAgreement(true);
      try {
        await AsyncStorage.setItem(AGREEMENT_ACCEPTED_KEY, '1');
      } catch (error) {
        console.error('Failed to persist agreement state:', error);
      }
    }
    setAgreementModalVisible(false);
  };

  const ensureAgreementAccepted = async () => {
    if (hasAcceptedAgreement) {
      return true;
    }

    setAgreementModalVisible(true);
    toast.error('请先阅读并同意协议');
    return false;
  };

  const handleSendCode = async () => {
    const canContinue = await ensureAgreementAccepted();
    if (!canContinue) {
      return;
    }

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
    const canContinue = await ensureAgreementAccepted();
    if (!canContinue) {
      return;
    }

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
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFF5F8' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={true} backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top,
            paddingBottom: keyboardVisible ? insets.bottom + SPACING.large : insets.bottom + SPACING.xlarge,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.content, keyboardVisible && styles.contentKeyboardVisible]}>
          {/* 装饰元素 - 动态模糊渐变光晕背景 */}
          <View style={styles.decoration}>
            <FloatingBlob
              color={isDark ? "#3A1B24" : "#FFE4E8"} // 深色模式下为暗粉红
              size={width * 0.6}
              initialTop={-width * 0.1}
              initialLeft={-width * 0.1}
              animationDuration={4000}
              translateYRange={[-20, 20]}
            />
            <FloatingBlob
              color={isDark ? "#2D203A" : "#F6F0FA"} // 深色模式下为暗紫
              size={width * 0.7}
              initialTop={width * 0.2}
              initialLeft={width * 0.3}
              animationDuration={5000}
              scaleRange={[-0.8, 1.2]}
            />
            <FloatingBlob
              color={isDark ? "#3B202A" : "#FFF0F5"} // 深色模式下为暗粉
              size={width * 0.5}
              initialTop={width * 0.6}
              initialLeft={-width * 0.1}
              animationDuration={6000}
              translateYRange={[-30, 10]}
            />
            
            {/* 增加一点小点缀 */}
            <Animated.View style={[styles.decorationIcon, { top: 80, right: 50, opacity: isDark ? 0.2 : 0.5 }]}>
              <Ionicons name="sparkles" size={24} color={isDark ? colors.primary : "#FFE066"} />
            </Animated.View>
            <Animated.View style={[styles.decorationIcon, { bottom: 180, left: 40, opacity: isDark ? 0.15 : 0.3 }]}>
              <Ionicons name="heart" size={18} color={isDark ? colors.secondary : "#FFB6C1"} />
            </Animated.View>
          </View>

          {/* 标题部分 */}
          <View style={styles.header}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
            <Text style={[styles.title, { color: colors.primary, textShadowColor: isDark ? 'rgba(255, 133, 162, 0.2)' : 'rgba(255, 160, 122, 0.3)' }]}>欢迎回来！</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>登录后开始记录你的美好生活</Text>
          </View>

          {/* 输入框部分 */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : COLORS.secondary }]}>
                <Ionicons name="call" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={11}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : COLORS.secondary }]}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="请输入验证码"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[
                    styles.codeButton,
                    { backgroundColor: colors.primary },
                    (countdown > 0 || sendingCode) && [styles.codeButtonDisabled, { backgroundColor: colors.border }]
                  ]}
                  onPress={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                >
                  <Text
                    style={[
                      styles.codeButtonText,
                      { color: isDark ? '#000' : '#FFF' },
                      (countdown > 0 || sendingCode) && [styles.codeButtonTextDisabled, { color: colors.textSecondary }]
                    ]}
                  >
                    {sendingCode ? '发送中' : countdown > 0 ? `${countdown}s` : '获取'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 登录按钮 */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                loading && [styles.loginButtonDisabled, { backgroundColor: colors.primary + '80' }]
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={[styles.loginButtonText, { color: isDark ? '#000' : '#FFF' }]}>
                {loading ? '登录中...' : '登录'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={isDark ? '#000' : '#FFF'} />
            </TouchableOpacity>

            <View style={styles.agreementRow}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  {
                    borderColor: hasAcceptedAgreement ? colors.primary : colors.textSecondary,
                    backgroundColor: hasAcceptedAgreement ? colors.primary : 'transparent',
                  },
                ]}
                onPress={toggleAgreement}
                activeOpacity={0.8}
              >
                {hasAcceptedAgreement ? (
                  <Ionicons name="checkmark" size={14} color={isDark ? '#000' : '#FFF'} />
                ) : null}
              </TouchableOpacity>
              <Text style={[styles.agreementText, { color: colors.textSecondary }]}>
                我已阅读并同意
                <Text
                  style={[styles.agreementLink, { color: colors.primary }]}
                  onPress={() => {
                    openPolicyLink(USER_AGREEMENT_URL);
                  }}
                >
                  《用户服务协议》
                </Text>
                和
                <Text
                  style={[styles.agreementLink, { color: colors.primary }]}
                  onPress={() => {
                    openPolicyLink(PRIVACY_POLICY_URL);
                  }}
                >
                  《隐私政策》
                </Text>
              </Text>
            </View>

            {/* 微信登录（因个人开发者暂无权限，先隐藏以便后续使用） */}
            {false && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>或</Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.wechatButton, { backgroundColor: colors.surface }]}
                  onPress={async () => {
                    const canContinue = await ensureAgreementAccepted();
                    if (!canContinue) {
                      return;
                    }
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

      <CommonModal visible={agreementModalVisible} onClose={() => setAgreementModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.agreementModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : COLORS.secondary,
              },
            ]}
          >
            <Text style={[styles.agreementModalTitle, { color: colors.text }]}>登录前请先同意协议</Text>
            <Text style={[styles.agreementModalDesc, { color: colors.textSecondary }]}>
              为了正常使用登录、验证码和后续社区功能，请先阅读并同意用户服务协议和隐私政策。毛球日记对骚扰、诈骗、色情低俗等不良内容和违规用户实行零容忍。
            </Text>
            <View style={styles.agreementModalLinks}>
              <TouchableOpacity
                style={[styles.agreementModalLinkButton, { borderColor: colors.border }]}
                onPress={() => {
                  openPolicyLink(USER_AGREEMENT_URL);
                }}
              >
                <Text style={[styles.agreementModalLinkText, { color: colors.primary }]}>
                  用户服务协议
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.agreementModalLinkButton, { borderColor: colors.border }]}
                onPress={() => {
                  openPolicyLink(PRIVACY_POLICY_URL);
                }}
              >
                <Text style={[styles.agreementModalLinkText, { color: colors.primary }]}>
                  隐私政策
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.agreementModalActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, { backgroundColor: isDark ? colors.background : '#F8F8F8' }]}
                onPress={() => setAgreementModalVisible(false)}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.textSecondary }]}>
                  暂不同意
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={acceptAgreementFromModal}
              >
                <Text style={[styles.modalPrimaryButtonText, { color: isDark ? '#000' : '#FFF' }]}>
                  同意并继续
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CommonModal>
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
    paddingHorizontal: SPACING.large,
    justifyContent: 'flex-start',
    paddingTop: 80, // 将内容整体往上提
    position: 'relative',
  },
  contentKeyboardVisible: {
    paddingTop: 56,
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
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.large,
    paddingHorizontal: SPACING.small,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.small,
    marginTop: 2,
  },
  agreementText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    lineHeight: 20,
  },
  agreementLink: {
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.large,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  agreementModalCard: {
    borderRadius: 24,
    padding: SPACING.large,
    borderWidth: 1,
  },
  agreementModalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.medium,
  },
  agreementModalDesc: {
    fontSize: FONT_SIZES.medium,
    lineHeight: 22,
    textAlign: 'center',
  },
  agreementModalLinks: {
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  agreementModalLinkButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  agreementModalLinkText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  agreementModalActions: {
    flexDirection: 'row',
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
});

export default LoginScreen;
