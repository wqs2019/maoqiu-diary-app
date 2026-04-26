import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HAND_DRAWN_STYLES,
  HEALING_COLORS,
  DARK_HEALING_COLORS,
} from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { CloudService } from '../../services/tcb';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/Toast';

const AccountSecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toast = useToast();

  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;
  const themeStyle = HAND_DRAWN_STYLES.soft;

  // Mask phone number
  const formatPhone = (phone?: string) => {
    if (!phone || phone.length < 11) return '未绑定手机号';
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  const handleDevelopTip = () => {
    Alert.alert('提示', '功能开发中，敬请期待');
  };

  const handleDeleteAccount = async () => {
    if (!user?._id) return;
    
    try {
      // 1. 标记用户的日记本为已注销
      const notebookRes: any = await CloudService.callFunction('notebook', {
        action: 'deactivateUserNotebooks',
        data: { userId: user._id },
      });
      if (notebookRes.code !== 0 && notebookRes.data?.success === false) {
        throw new Error(notebookRes.data?.message || '注销日记本失败');
      }

      // 2. 标记用户账户为已注销
      const userRes: any = await CloudService.callFunction('user', {
        action: 'deactivateAccount',
        data: { _id: user._id },
      });
      if (userRes.code !== 0 && userRes.data?.success === false) {
        throw new Error(userRes.data?.message || '注销账户失败');
      }

      // 3. 退出登录
      toast.success('账号已成功注销');
      await logout();
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('注销账号失败，请稍后重试');
    }
  };

  const renderSettingItem = (
    iconName: string,
    title: string,
    color: string,
    rightComponent: React.ReactNode,
    isLast = false,
    onPress?: () => void,
    iconFamily: 'Feather' | 'FontAwesome5' = 'Feather'
  ) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder,
        { borderBottomColor: isDark ? '#333' : '#FFF0F3' },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
          {iconFamily === 'Feather' ? (
            <Feather name={iconName as any} size={20} color={color} />
          ) : (
            <FontAwesome5 name={iconName} size={20} color={color} />
          )}
        </View>
        <Text
          style={[
            styles.menuItemText,
            { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
          ]}
        >
          {title}
        </Text>
      </View>
      <View style={styles.menuItemRight}>{rightComponent}</View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#121212' : '#FAFAFA', paddingTop: insets.top },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#121212' : '#FAFAFA',
            borderBottomColor: isDark ? '#333' : '#F0F0F0',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={24} color={isDark ? '#E5E7EB' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#E5E7EB' : '#333' }]}>
          账号与安全
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 基本信息 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'smartphone',
            '手机号',
            currentHealingColors.blue[500],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.valueText,
                  { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                ]}
              >
                {formatPhone(user?.phone)}
              </Text>
            </View>,
            false
          )}
          {renderSettingItem(
            'lock',
            '隐私密码',
            currentHealingColors.yellow[600],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.valueText,
                  { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                ]}
              >
                设置
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                style={{ marginLeft: 4 }}
              />
            </View>,
            true,
            () => {
              navigation.navigate('AppLockSetting' as never);
            }
          )}
        </View>

        {/* 第三方绑定
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
        </View>
        */}
        {/* 危险操作 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'user-x',
            '注销账号',
            currentHealingColors.pink[600],
            <Feather name="chevron-right" size={20} color={currentHealingColors.gray[400]} />,
            true,
            () => {
              Alert.alert('注销账号', '确定要注销账号吗？注销后数据将无法恢复。', [
                { text: '取消', style: 'cancel' },
                {
                  text: '确定',
                  style: 'destructive',
                  onPress: handleDeleteAccount,
                },
              ]);
            }
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
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
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
  },
});

export default AccountSecurityScreen;
