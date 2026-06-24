import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HAND_DRAWN_STYLES,
  HEALING_COLORS,
  DARK_HEALING_COLORS,
} from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { I18nLangType, useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scheduleDailyReminder, cancelDailyReminder } from '../../utils/notifications';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const { t } = useTranslation();

  // 补全 DARK_HEALING_COLORS 中缺失的颜色，防止报错
  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;

  const themeStyle = HAND_DRAWN_STYLES.soft;

  const {
    theme,
    setTheme,
    language,
    setLanguage,
    notificationsEnabled,
    setNotificationsEnabled,
    reminderTime,
    setReminderTime,
  } = useAppStore();
  const { user, updateProfile } = useAuthStore();
  const [cacheSize, setCacheSize] = useState(t('settingsScreen.cacheCalculating'));
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [hideCircleTab, setHideCircleTab] = useState(user?.hideCircleTab === true);
  const [isUpdatingCirclePreference, setIsUpdatingCirclePreference] = useState(false);

  useEffect(() => {
    calculateCacheSize();
  }, []);

  useEffect(() => {
    setHideCircleTab(user?.hideCircleTab === true);
  }, [user?.hideCircleTab]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const success = await scheduleDailyReminder(reminderTime.hour, reminderTime.minute);
      if (success) {
        await setNotificationsEnabled(true);
        Alert.alert(
          t('common.tip'),
          t('settingsScreen.notificationsEnabled', {
            time: formatTime(reminderTime.hour, reminderTime.minute),
          })
        );
      } else {
        Alert.alert(t('common.tip'), t('settingsScreen.notificationsPermission'));
      }
    } else {
      await cancelDailyReminder();
      await setNotificationsEnabled(false);
    }
  };

  const handleTimeConfirm = async (date: Date) => {
    setTimePickerVisible(false);
    const hour = date.getHours();
    const minute = date.getMinutes();
    await setReminderTime({ hour, minute });

    // 如果通知已经开启，则重新调度
    if (notificationsEnabled) {
      const success = await scheduleDailyReminder(hour, minute);
      if (success) {
        Alert.alert(t('common.tip'), t('settingsScreen.reminderUpdated', { time: formatTime(hour, minute) }));
      } else {
        Alert.alert(t('common.tip'), t('settingsScreen.notificationsPermission'));
      }
    }
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleThemePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('settingsScreen.themeOptions.system'),
            t('settingsScreen.themeOptions.light'),
            t('settingsScreen.themeOptions.dark'),
            t('common.cancel'),
          ],
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            setTheme('system');
          } else if (buttonIndex === 1) {
            setTheme('light');
          } else if (buttonIndex === 2) {
            setTheme('dark');
          }
        }
      );
    } else {
      Alert.alert(t('settingsScreen.chooseTheme'), '', [
        {
          text: t('settingsScreen.themeOptions.system'),
          onPress: () => {
            setTheme('system');
          },
        },
        {
          text: t('settingsScreen.themeOptions.light'),
          onPress: () => {
            setTheme('light');
          },
        },
        {
          text: t('settingsScreen.themeOptions.dark'),
          onPress: () => {
            setTheme('dark');
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const getThemeText = () => {
    if (theme === 'system') return t('settingsScreen.themeOptions.system');
    if (theme === 'dark') return t('settingsScreen.themeOptions.dark');
    return t('settingsScreen.themeOptions.light');
  };

  const getLanguageText = () => {
    if (language === 'en-US') return t('setting.english');
    return t('setting.chinese');
  };

  const handleLanguageChange = async (nextLanguage: I18nLangType) => {
    if (nextLanguage === language) {
      return;
    }

    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      console.error('Set language error:', error);
      Alert.alert(t('common.tip'), t('settingsScreen.setLanguageFailed'));
    }
  };

  const handleLanguagePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('setting.chinese'), t('setting.english'), t('common.cancel')],
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

    Alert.alert(t('settingsScreen.chooseLanguage'), '', [
      {
        text: t('setting.chinese'),
        onPress: () => {
          handleLanguageChange('zh-CN');
        },
      },
      {
        text: t('setting.english'),
        onPress: () => {
          handleLanguageChange('en-US');
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const calculateCacheSize = () => {
    try {
      const totalSize = Paths.cache.size || 0;

      // format size
      if (totalSize < 1024) {
        setCacheSize(`${totalSize} B`);
      } else if (totalSize < 1024 * 1024) {
        setCacheSize(`${(totalSize / 1024).toFixed(2)} KB`);
      } else {
        setCacheSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      }
    } catch (e) {
      console.log('Calculate cache error:', e);
      setCacheSize('0 MB');
    }
  };

  const handleClearCache = () => {
    Alert.alert(t('settingsScreen.clearCacheTitle'), t('settingsScreen.clearCacheMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          try {
            // clear expo-image cache
            await Image.clearMemoryCache();
            await Image.clearDiskCache();

            // clear file system cache
            try {
              const items = Paths.cache.list();
              for (const item of items) {
                try {
                  item.delete();
                } catch (err) {}
              }
            } catch (err) {
              console.log('Error deleting file system cache:', err);
            }

            calculateCacheSize();
            Alert.alert(t('common.tip'), t('common.clearSuccess'));
          } catch (e) {
            console.log('Clear cache error:', e);
            Alert.alert(t('common.tip'), t('common.clearFailed'));
          }
        },
      },
    ]);
  };

  const handleToggleHideCircleTab = async (enabled: boolean) => {
    if (!user?._id || isUpdatingCirclePreference) {
      return;
    }

    const previousValue = hideCircleTab;
    setHideCircleTab(enabled);
    setIsUpdatingCirclePreference(true);

    try {
      await updateProfile(user._id, { hideCircleTab: enabled });
    } catch (error: any) {
      setHideCircleTab(previousValue);
      Alert.alert(t('common.tip'), error?.message || t('settingsScreen.hideCircleSaveFailed'));
    } finally {
      setIsUpdatingCirclePreference(false);
    }
  };

  const renderSettingItem = (
    iconName: keyof typeof Feather.glyphMap,
    title: string,
    color: string,
    rightComponent: React.ReactNode,
    isLast = false,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder,
        { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[50] },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
          <Feather name={iconName} size={20} color={color} />
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
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' },
      ]}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[100] },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather name="chevron-left" size={28} color={currentHealingColors.gray[800]} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] },
          ]}
        >
          {t('settingsScreen.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 账号与安全 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'shield',
            t('settingsScreen.sections.accountSecurity'),
            currentHealingColors.blue[500],
            <Feather name="chevron-right" size={20} color={currentHealingColors.gray[400]} />,
            false,
            () => {
              navigation.navigate('AccountSecurity' as never);
            }
          )}
          {/* 多语言 */}
          
          {renderSettingItem(
            'globe',
            t('settingsScreen.sections.multiLanguage'),
            currentHealingColors.green[500],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.valueText,
                  { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                ]}
              >
                {getLanguageText()}
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                style={{ marginLeft: 4 }}
              />
            </View>,
            false,
            handleLanguagePress
          )}
          {renderSettingItem(
            'slash',
            t('settingsScreen.sections.blockedUsers'),
            currentHealingColors.pink[500],
            <Feather name="chevron-right" size={20} color={currentHealingColors.gray[400]} />,
            true,
            () => {
              navigation.navigate('BlockedUsers' as never);
            }
          )}
        </View>

        {/* 隐私与安全
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
        </View>
        */}

        {/* 通用设置 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'bell',
            t('settingsScreen.sections.dailyReminder'),
            currentHealingColors.yellow[500],
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{
                false: isDark ? '#333' : currentHealingColors.gray[200],
                true: currentHealingColors.pink[400],
              }}
              thumbColor={isDark && !notificationsEnabled ? '#888' : '#FFFFFF'}
            />,
            false
          )}
          {notificationsEnabled &&
            renderSettingItem(
              'clock',
              t('settingsScreen.sections.reminderTime'),
              currentHealingColors.yellow[500],
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.valueText,
                    { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                  ]}
                >
                  {formatTime(reminderTime.hour, reminderTime.minute)}
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                  style={{ marginLeft: 4 }}
                />
              </View>,
              false,
              () => {
                setTimePickerVisible(true);
              }
            )}
          {renderSettingItem(
            'moon',
            t('settingsScreen.sections.themeMode'),
            currentHealingColors.blue[400],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.valueText,
                  { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
                ]}
              >
                {getThemeText()}
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                style={{ marginLeft: 4 }}
              />
            </View>,
            false,
            handleThemePress
          )}
          {renderSettingItem(
            'aperture',
            t('settingsScreen.sections.customTheme'),
            currentHealingColors.purple[400],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="chevron-right"
                size={20}
                color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                style={{ marginLeft: 4 }}
              />
            </View>,
            true,
            () => {
              if (!user?.isVip?.value) {
                Alert.alert(t('common.tip'), t('settingsScreen.vipThemeTip'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('settingsScreen.goSubscribe'), onPress: () => navigation.navigate('Subscription' as never) }
                ]);
                return;
              }
              navigation.navigate('ThemeSetting' as never);
            }
          )}
        </View>

        {/* 不看圈子 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'eye-off',
            t('settingsScreen.sections.hideCircleTab'),
            currentHealingColors.purple[500],
            <Switch
              value={hideCircleTab}
              onValueChange={handleToggleHideCircleTab}
              disabled={isUpdatingCirclePreference}
              trackColor={{
                false: isDark ? '#333' : currentHealingColors.gray[200],
                true: currentHealingColors.pink[400],
              }}
              thumbColor={isDark && !hideCircleTab ? '#888' : '#FFFFFF'}
            />,
            true
          )}
        </View>

        {/* 数据与存储 */}
        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {renderSettingItem(
            'trash-2',
            t('settingsScreen.sections.clearCache'),
            currentHealingColors.gray[600],
            <Text
              style={[
                styles.valueText,
                { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] },
              ]}
            >
              {cacheSize}
            </Text>,
            false,
            handleClearCache
          )}
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        display="spinner"
        locale="zh-CN"
        date={new Date(new Date().setHours(reminderTime.hour, reminderTime.minute, 0, 0))}
        onConfirm={handleTimeConfirm}
        onCancel={() => {
          setTimePickerVisible(false);
        }}
        confirmTextIOS="确认"
        cancelTextIOS="取消"
        isDarkModeEnabled={isDark}
        pickerStyleIOS={{ justifyContent: 'center', alignItems: 'center' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: HEALING_COLORS.gray[800],
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
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
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#FFF0F3',
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
    color: HEALING_COLORS.gray[800],
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: HEALING_COLORS.gray[500],
  },
});

export default SettingsScreen;
