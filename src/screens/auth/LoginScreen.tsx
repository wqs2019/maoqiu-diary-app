import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  ActionSheetIOS,
  Alert,
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
import { useAppStore, I18nLangType } from '../../store/appStore';

import { Modal as CommonModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  const [isAppleAvailable, setIsAppleAvailable] = useState(Platform.OS === 'ios');
  const { login, loginWithWechat, loginWithApple, sendCode, loading, sendingCode } = useAuthStore();
  const { language, setLanguage } = useAppStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  const handleLanguageChange = async (nextLanguage: I18nLangType) => {
    if (nextLanguage === language) {
      return;
    }
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      console.error('Set language error:', error);
      toast.error(t('settingsScreen.setLanguageFailed') || 'Failed to set language');
    }
  };

  const handleLanguagePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('setting.chinese') || '简体中文', t('setting.english') || 'English', t('common.cancel') || 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleLanguageChange('zh-CN');
          } else if (buttonIndex === 1) {
            handleLanguageChange('en-US');
          }
        }
      );
      return;
    }

    Alert.alert(t('settingsScreen.chooseLanguage') || 'Choose Language', '', [
      {
        text: t('setting.chinese') || '简体中文',
        onPress: () => {
          handleLanguageChange('zh-CN');
        },
      },
      {
        text: t('setting.english') || 'English',
        onPress: () => {
          handleLanguageChange('en-US');
        },
      },
      { text: t('common.cancel') || 'Cancel', style: 'cancel' },
    ]);
  };

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
    let mounted = true;
    const checkAvailability = async () => {
      if (Platform.OS !== 'ios') {
        setIsAppleAvailable(false);
        return;
      }
      const available = await AppleAuthentication.isAvailableAsync();
      if (mounted) {
        setIsAppleAvailable(available);
      }
    };
    checkAvailability().catch(() => {
      if (mounted) setIsAppleAvailable(false);
    });
    return () => {
      mounted = false;
    };
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
      toast.error(t('loginScreen.openPolicyFailed'));
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
    toast.error(t('loginScreen.agreementRequired'));
    return false;
  };

  const handleSendCode = async () => {
    const canContinue = await ensureAgreementAccepted();
    if (!canContinue) {
      return;
    }

    if (phone?.length !== 11) {
      toast.error(t('loginScreen.invalidPhone'));
      return;
    }
    const success = await sendCode(phone);
    if (success) {
      setCountdown(60);
      toast.success(t('auth.sendCodeSuccess'));
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
      toast.error(t('loginScreen.invalidPhone'));
      return;
    }
    if (code?.length !== 6) {
      toast.error(t('loginScreen.invalidCode'));
      return;
    }
    await login(phone, code);
    const currentError = useAuthStore.getState().error;
    if (currentError) {
      toast.error(currentError);
    }
  };

  const handleAppleLogin = async () => {
    const canContinue = await ensureAgreementAccepted();
    if (!canContinue) {
      return;
    }

    if (Platform.OS !== 'ios') {
      toast.error('Apple 登录仅支持 iOS 设备');
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.familyName, credential.fullName?.givenName]
        .filter(Boolean)
        .join('');
      
      const result = await loginWithApple({
        userId: credential.user,
        email: credential.email ?? null,
        fullName: fullName || null,
        identityToken: credential.identityToken ?? null,
        authorizationCode: credential.authorizationCode ?? null,
      });
      
      if (!result.needsBind) {
        const currentError = useAuthStore.getState().error;
        if (currentError) {
          toast.error(currentError);
        }
      }
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      toast.error(error?.message || 'Apple 登录暂时不可用，请稍后重试');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFF5F8' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={true} backgroundColor="transparent" />
      
      {/* 语言切换按钮 */}
      <TouchableOpacity
        style={[styles.languageButton, { top: insets.top + SPACING.small }]}
        onPress={handleLanguagePress}
      >
        <Ionicons name="language" size={24} color={isDark ? colors.text : COLORS.primary} />
      </TouchableOpacity>

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
            <Text style={[styles.title, { color: colors.primary, textShadowColor: isDark ? 'rgba(255, 133, 162, 0.2)' : 'rgba(255, 160, 122, 0.3)' }]}>{t('loginScreen.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('loginScreen.subtitle')}</Text>
          </View>

          {/* 输入框部分 */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : COLORS.secondary }]}>
                <Ionicons name="call" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('loginScreen.phonePlaceholder')}
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
                  placeholder={t('loginScreen.codePlaceholder')}
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
                    {sendingCode ? t('loginScreen.sendCodeLoading') : countdown > 0 ? `${countdown}s` : t('loginScreen.sendCodeShort')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.smsServiceHint, { color: colors.textSecondary }]}>
                {t('loginScreen.smsServiceHint')}
              </Text>
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
                {loading ? t('loginScreen.loginLoading') : t('auth.login')}
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
                {t('loginScreen.readAndAgree')}
                <Text
                  style={[styles.agreementLink, { color: colors.primary }]}
                  onPress={() => {
                    openPolicyLink(USER_AGREEMENT_URL);
                  }}
                >
                  {t('loginScreen.userAgreement')}
                </Text>
                {t('loginScreen.and')}
                <Text
                  style={[styles.agreementLink, { color: colors.primary }]}
                  onPress={() => {
                    openPolicyLink(PRIVACY_POLICY_URL);
                  }}
                >
                  {t('loginScreen.privacyPolicy')}
                </Text>
              </Text>
            </View>

            {/* 第三方登录 */}
            {Platform.OS === 'ios' && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('loginScreen.or')}</Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>

                {isAppleAvailable ? (
                  <TouchableOpacity
                    style={[
                      styles.customAppleButton,
                      {
                        backgroundColor: '#FFF',
                        borderColor: isDark ? '#FFF' : COLORS.border,
                      },
                    ]}
                    onPress={handleAppleLogin}
                  >
                    <Ionicons name="logo-apple" size={20} color="#000" />
                    <Text style={styles.customAppleButtonText}>
                      {language === 'en-US' ? 'Sign in with Apple' : '通过 Apple 登录'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    disabled
                    style={[
                      styles.wechatButton,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: 'transparent',
                      },
                    ]}
                  >
                    <Ionicons name="logo-apple" size={24} color={colors.textSecondary} />
                    <Text style={[styles.wechatButtonText, { color: colors.textSecondary }]}>
                      Apple 登录当前不可用
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 微信登录（因个人开发者暂无权限，先隐藏以便后续使用） */}
                {false && (
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
                    <Text style={styles.wechatButtonText}>{t('loginScreen.wechatLogin')}</Text>
                  </TouchableOpacity>
                )}
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
            <Text style={[styles.agreementModalTitle, { color: colors.text }]}>{t('loginScreen.agreementModalTitle')}</Text>
            <Text style={[styles.agreementModalDesc, { color: colors.textSecondary }]}>
              {t('loginScreen.agreementModalDesc')}
            </Text>
            <View style={styles.agreementModalLinks}>
              <TouchableOpacity
                style={[styles.agreementModalLinkButton, { borderColor: colors.border }]}
                onPress={() => {
                  openPolicyLink(USER_AGREEMENT_URL);
                }}
              >
                <Text style={[styles.agreementModalLinkText, { color: colors.primary }]}>
                  {t('loginScreen.userAgreement')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.agreementModalLinkButton, { borderColor: colors.border }]}
                onPress={() => {
                  openPolicyLink(PRIVACY_POLICY_URL);
                }}
              >
                <Text style={[styles.agreementModalLinkText, { color: colors.primary }]}>
                  {t('loginScreen.privacyPolicy')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.agreementModalActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, { backgroundColor: isDark ? colors.background : '#F8F8F8' }]}
                onPress={() => setAgreementModalVisible(false)}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.textSecondary }]}>
                  {t('loginScreen.decline')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={acceptAgreementFromModal}
              >
                <Text style={[styles.modalPrimaryButtonText, { color: isDark ? '#000' : '#FFF' }]}>
                  {t('loginScreen.acceptAndContinue')}
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
  languageButton: {
    position: 'absolute',
    right: SPACING.large,
    zIndex: 10,
    padding: SPACING.small,
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
  smsServiceHint: {
    fontSize: FONT_SIZES.small - 1,
    lineHeight: 18,
    marginTop: SPACING.small,
    paddingHorizontal: SPACING.small,
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
    height: 56,
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
  customAppleButton: {
    width: '100%',
    height: 56,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: SPACING.large,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 8,
  },
  customAppleButtonText: {
    color: '#000',
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
