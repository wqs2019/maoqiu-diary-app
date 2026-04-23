import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HAND_DRAWN_STYLES,
  HEALING_COLORS,
  DARK_HEALING_COLORS,
} from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';
import { scheduleDailyReminder, cancelDailyReminder } from '../../utils/notifications';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { themeName, isDark } = useAppTheme();

  // 补全 DARK_HEALING_COLORS 中缺失的颜色，防止报错
  const currentHealingColors = isDark
    ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS }
    : HEALING_COLORS;

  const themeStyle = HAND_DRAWN_STYLES.soft;

  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled } = useAppStore();
  const [cacheSize, setCacheSize] = useState('计算中...');

  useEffect(() => {
    calculateCacheSize();
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const success = await scheduleDailyReminder();
      if (success) {
        await setNotificationsEnabled(true);
        Alert.alert('提示', '已开启每日 22:00 提醒写日记功能');
      } else {
        Alert.alert('提示', '请在系统设置中允许应用发送通知');
      }
    } else {
      await cancelDailyReminder();
      await setNotificationsEnabled(false);
    }
  };

  const handleThemePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['跟随系统', '浅色模式', '深色模式', '取消'],
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
      Alert.alert('选择主题', '', [
        {
          text: '跟随系统',
          onPress: () => {
            setTheme('system');
          },
        },
        {
          text: '浅色模式',
          onPress: () => {
            setTheme('light');
          },
        },
        {
          text: '深色模式',
          onPress: () => {
            setTheme('dark');
          },
        },
        { text: '取消', style: 'cancel' },
      ]);
    }
  };

  const getThemeText = () => {
    if (theme === 'system') return '跟随系统';
    if (theme === 'dark') return '深色模式';
    return '浅色模式';
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
    Alert.alert('清除缓存', '确定要清除应用缓存吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
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
            Alert.alert('提示', '缓存已清除');
          } catch (e) {
            console.log('Clear cache error:', e);
            Alert.alert('提示', '清除缓存失败');
          }
        },
      },
    ]);
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
      style={[styles.menuItem, !isLast && styles.menuItemBorder, { borderBottomColor: isDark ? '#333' : '#FFF0F3' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
          <Feather name={iconName} size={20} color={color} />
        </View>
        <Text style={[styles.menuItemText, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>{title}</Text>
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
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather name="chevron-left" size={28} color={currentHealingColors.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#E5E7EB' : currentHealingColors.gray[800] }]}>
          应用设置
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
            'shield',
            '账号与安全',
            currentHealingColors.blue[500],
            <Feather name="chevron-right" size={20} color={currentHealingColors.gray[400]} />,
            false,
            () => {
              Alert.alert('提示', '功能开发中');
            }
          )}
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
                  onPress: () => {
                    Alert.alert('提示', '功能开发中');
                  },
                },
              ]);
            }
          )}
        </View>

        {/* 隐私与安全 */}
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
            'lock',
            '应用密码锁',
            currentHealingColors.yellow[600],
            <Feather name="chevron-right" size={20} color={currentHealingColors.gray[400]} />,
            false,
            () => {
              navigation.navigate('AppLockSetting' as never);
            }
          )}
        </View>

        {/* 通用设置 */}
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
            'bell',
            '每日提醒',
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
          {renderSettingItem(
            'moon',
            '主题模式',
            currentHealingColors.blue[400],
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.valueText, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
                {getThemeText()}
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color={isDark ? '#6B7280' : currentHealingColors.gray[400]}
                style={{ marginLeft: 4 }}
              />
            </View>,
            true,
            handleThemePress
          )}
        </View>

        {/* 数据与存储 */}
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
            'trash-2',
            '清除缓存',
            currentHealingColors.gray[600],
            <Text style={[styles.valueText, { color: isDark ? '#9CA3AF' : currentHealingColors.gray[500] }]}>
              {cacheSize}
            </Text>,
            false,
            handleClearCache
          )}
        </View>
      </ScrollView>
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
