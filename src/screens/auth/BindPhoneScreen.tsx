import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuthStore } from '../../store/authStore';
import authService from '../../services/auth';
import { useToast } from '@/components/common/Toast';
import { RootStackParamList } from '../../navigation/RootNavigator';

const BindPhoneScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { scene } = route.params || {};
  
  const isFromSettings = scene === 'account';
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { sendCode, user, setNeedsBind } = useAuthStore();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

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
      toast.error(t('loginScreen.invalidPhone') || '请输入正确的手机号');
      return;
    }
    const success = await sendCode(phone);
    if (success) {
      setCountdown(60);
      toast.success(t('auth.sendCodeSuccess') || '验证码已发送');
    } else {
      const currentError = useAuthStore.getState().error;
      if (currentError) toast.error(currentError);
    }
  };

  const handleBind = async () => {
    if (phone?.length !== 11) {
      toast.error(t('loginScreen.invalidPhone') || '请输入正确的手机号');
      return;
    }
    if (code?.length !== 6) {
      toast.error(t('loginScreen.invalidCode') || '请输入6位验证码');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 验证手机号和验证码，并获取手机号对应的老账号信息
      const loginResult = await authService.login(phone, code);
      
      // 2. 调用云函数，将当前的 appleId 绑定到这个老账号上
      const { CloudService } = require('../../services/tcb');
      const bindRes: any = await CloudService.callFunction('user', {
        action: 'bindAppleId',
        data: {
          userId: loginResult.user._id,
          appleId: user?.appleId,
        },
      });

      if (bindRes.code !== 0 || !bindRes.data?.success) {
        throw new Error(bindRes.data?.message || t('bindPhoneScreen.bindFailed') || '绑定失败');
      }

      // 3. 绑定成功后，保存老账号的 token 和 user，并更新全局状态
      // 更新本地 user 对象的 appleId
      const updatedUser = { ...loginResult.user, appleId: user?.appleId };
      await authService.saveToken(loginResult.token);
      await authService.saveUserInfo(updatedUser);
      useAuthStore.setState({ isLoggedIn: true, user: updatedUser, needsBind: false, loading: false });
      
      if (isFromSettings) {
        // 如果是从设置页进来的，绑定成功后返回上一页
        navigation.goBack();
      } else {
        // 如果是从登录页进来的，绑定成功后直接进入首页
        // 由于我们设置了 needsBind: false，RootNavigator 会自动切换到 MainStack
      }
      
    } catch (error: any) {
      toast.error(error.message || t('bindPhoneScreen.bindFailedRetry') || '绑定失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // 用户选择暂不绑定，直接进入首页
    // 将 needsBind 设置为 false，RootNavigator 会自动切换到 MainStack
    setNeedsBind(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFF5F8' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + SPACING.small }]}
        onPress={() => {
          if (isFromSettings) {
            navigation.goBack();
          } else {
            // 如果是从登录页过来的，点击返回相当于跳过绑定，直接进入首页
            handleSkip();
          }
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 80,
            paddingBottom: insets.bottom + SPACING.xlarge,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('bindPhoneScreen.title') || '绑定手机号'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('bindPhoneScreen.subtitle') || '绑定手机号后，您可以找回之前的日记数据，并支持多端登录。'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : COLORS.secondary }]}>
              <Ionicons name="call" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('loginScreen.phonePlaceholder') || '请输入手机号'}
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
                placeholder={t('loginScreen.codePlaceholder') || '请输入验证码'}
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
                  (countdown > 0 || isSubmitting) && [styles.codeButtonDisabled, { backgroundColor: colors.border }]
                ]}
                onPress={handleSendCode}
                disabled={countdown > 0 || isSubmitting}
              >
                <Text
                  style={[
                    styles.codeButtonText,
                    { color: isDark ? '#000' : '#FFF' },
                    (countdown > 0 || isSubmitting) && [styles.codeButtonTextDisabled, { color: colors.textSecondary }]
                  ]}
                >
                  {countdown > 0 ? `${countdown}s` : (t('loginScreen.sendCodeShort') || '获取')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.bindButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              isSubmitting && [styles.bindButtonDisabled, { backgroundColor: colors.primary + '80' }]
            ]}
            onPress={handleBind}
            disabled={isSubmitting}
          >
            <Text style={[styles.bindButtonText, { color: isDark ? '#000' : '#FFF' }]}>
              {isSubmitting ? (t('bindPhoneScreen.binding') || '绑定中...') : (t('bindPhoneScreen.bindNow') || '立即绑定')}
            </Text>
          </TouchableOpacity>

          {!isFromSettings && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                {t('bindPhoneScreen.skip') || '暂不绑定，直接进入'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.large - SPACING.small,
    zIndex: 10,
    padding: SPACING.small,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.large,
  },
  header: {
    marginBottom: SPACING.xlarge,
  },
  title: {
    fontSize: FONT_SIZES.xxlarge + 4,
    fontWeight: 'bold',
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONT_SIZES.medium,
    lineHeight: 22,
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
    borderRadius: 16,
    paddingHorizontal: SPACING.medium,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: SPACING.medium,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.medium + 2,
    fontSize: FONT_SIZES.large,
  },
  codeButton: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small + 4,
    borderRadius: 12,
    marginLeft: SPACING.small,
  },
  codeButtonDisabled: {
    opacity: 0.8,
  },
  codeButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  codeButtonTextDisabled: {
    opacity: 0.8,
  },
  bindButton: {
    borderRadius: 24,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.large,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  bindButtonDisabled: {
    shadowOpacity: 0.1,
  },
  bindButtonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: SPACING.xlarge,
    alignItems: 'center',
    padding: SPACING.small,
  },
  skipButtonText: {
    fontSize: FONT_SIZES.medium,
  },
});

export default BindPhoneScreen;
