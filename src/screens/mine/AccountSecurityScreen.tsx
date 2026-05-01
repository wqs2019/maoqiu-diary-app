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
import { useVipGuard } from '../../hooks/useVipGuard';
import { CloudService } from '../../services/tcb';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { useState, useEffect } from 'react';

const AccountSecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const { checkVipPermission } = useVipGuard();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toast = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeleteModal) {
      setDeleteCountdown(10);
      timer = setInterval(() => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setDeleteCountdown(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showDeleteModal]);

  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;
  const themeStyle = HAND_DRAWN_STYLES.soft;

  // Mask phone number
  const formatPhone = (phone?: string) => {
    if (!phone || phone.length < 11) return '未绑定手机号';
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  const handleDeleteAccount = async () => {
    if (!user?._id) return;
    
    toast.loading('正在注销账号...');
    
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
      toast.hide();
      toast.success('账号已成功注销');
      await logout();
    } catch (error) {
      console.error('Delete account error:', error);
      toast.hide();
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
            '隐私安全',
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
              if (checkVipPermission('appLock')) {
                navigation.navigate('AppLockSetting' as never);
              }
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
            () => setShowDeleteModal(true)
          )}
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              真的要离开吗？🥺
            </Text>
            <Text style={[styles.modalText, { color: currentHealingColors.gray[600] }]}>
              注销账号后，您在毛球日记记录的<Text style={{ fontWeight: 'bold', color: currentHealingColors.pink[500] }}>所有日记、相册以及心情数据将永远消失，无法找回</Text>。
            </Text>
            <Text style={[styles.modalText, { color: currentHealingColors.gray[600], marginTop: 12, marginBottom: 24 }]}>
              毛球会很想念您的，希望能有机会再听您分享每一天的喜怒哀乐。
            </Text>
            
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentHealingColors.gray[100] }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentHealingColors.gray[700] }]}>我再想想</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { backgroundColor: deleteCountdown > 0 ? currentHealingColors.gray[400] : currentHealingColors.pink[500] }
                ]}
                disabled={deleteCountdown > 0}
                onPress={() => {
                  setShowDeleteModal(false);
                  handleDeleteAccount();
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  {deleteCountdown > 0 ? `残忍离开 (${deleteCountdown}s)` : '残忍离开'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalText: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountSecurityScreen;
