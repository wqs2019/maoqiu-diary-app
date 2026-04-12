// 登录表单组件 - 使用 react-hook-form + zod
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { View, TextInput, TouchableOpacity, Alert, Text } from 'react-native';

import { COLORS, FONT_SIZES, SPACING } from '@/config/constant';
import { useZodForm } from '@/hooks/useZodForm';
import { useAuthStore } from '@/store/authStore';
import { loginFormSchema, LoginFormSchema } from '@/utils/validators';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, sendCode, loading } = useAuthStore();
  const [countdown, setCountdown] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(loginFormSchema, { phone: '', code: '' });

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
    const phone = control._formValues.phone;
    if (phone?.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    const success = await sendCode(phone);
    if (success) {
      setCountdown(60);
      Alert.alert('提示', '验证码已发送 (测试：123456)');
    }
  };

  const onSubmit = async (data: LoginFormSchema) => {
    await login(data.phone, data.code);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <View style={{ width: '100%' }}>
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <View style={{ marginBottom: SPACING.large }}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.medium }}
              />
              <TextInput
                style={styles.input}
                placeholder="请输入手机号"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                maxLength={11}
              />
            </View>
            {errors.phone && (
              <View style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="warning" size={14} color={COLORS.error} />
                  <View style={{ marginLeft: 4 }}>
                    <Text style={styles.errorText}>{errors.phone.message}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, value } }) => (
          <View style={{ marginBottom: SPACING.large }}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.medium }}
              />
              <TextInput
                style={styles.input}
                placeholder="请输入验证码"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
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
            {errors.code && (
              <View style={{ marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="warning" size={14} color={COLORS.error} />
                  <View style={{ marginLeft: 4 }}>
                    <Text style={styles.errorText}>{errors.code.message}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>{loading ? '登录中...' : '登录'}</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
      </TouchableOpacity>

      <View style={styles.testHint}>
        <Text style={styles.testHintText}>测试模式：验证码输入 123456</Text>
      </View>
    </View>
  );
};

const styles = {
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontWeight: '600' as const,
  },
  codeButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.small,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: SPACING.medium + 4,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: SPACING.large,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
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
    fontWeight: '600' as const,
    marginRight: SPACING.small,
  },
  testHint: {
    marginTop: SPACING.large,
    alignItems: 'center' as const,
  },
  testHintText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: 12,
  },
};
