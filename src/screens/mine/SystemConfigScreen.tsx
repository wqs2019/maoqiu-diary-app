import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { fetchRemoteAppConfig, saveRemoteAppConfig } from '@/services/configService';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

const SystemConfigScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const appConfig = useAppStore((state) => state.appConfig);
  const setAppConfig = useAppStore((state) => state.setAppConfig);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [showAiChat, setShowAiChat] = useState(appConfig.show_ai_chat);
  const [showCircle, setShowCircle] = useState(appConfig.show_circle);

  const surfaceColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#FCE7F3';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { doc, config } = await fetchRemoteAppConfig();
      setConfigId(doc?._id || null);
      setShowAiChat(config.show_ai_chat);
      setShowCircle(config.show_circle);
      setAppConfig(config);
    } catch (error: any) {
      console.error('Load system config failed:', error);
      Alert.alert('加载失败', error?.message || '系统配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [setAppConfig]);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const handleToggleConfig = useCallback(async (key: 'show_ai_chat' | 'show_circle', value: boolean) => {
    if (!user?._id || !user.isAdmin) {
      Alert.alert('提示', '当前账号无管理员权限');
      return;
    }

    const prevConfig = {
      show_ai_chat: showAiChat,
      show_circle: showCircle,
    };
    const nextConfig = {
      ...prevConfig,
      [key]: value,
    };

    setShowAiChat(nextConfig.show_ai_chat);
    setShowCircle(nextConfig.show_circle);
    setAppConfig(nextConfig);

    try {
      setSaving(true);
      const result = await saveRemoteAppConfig(nextConfig, user._id);
      setConfigId(result.docId);
    } catch (error: any) {
      console.error('Save system config failed:', error);
      setShowAiChat(prevConfig.show_ai_chat);
      setShowCircle(prevConfig.show_circle);
      setAppConfig(prevConfig);
      Alert.alert('保存失败', error?.message || '系统配置保存失败');
    } finally {
      setSaving(false);
    }
  }, [configId, setAppConfig, showAiChat, showCircle, user?._id, user?.isAdmin]);

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, styles.centerState, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <Feather name="lock" size={44} color={subTextColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>当前账号无管理员权限</Text>
        <Text style={[styles.emptyDesc, { color: subTextColor }]}>
          只有管理员可以修改平台入口配置。
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={HEALING_COLORS.pink[500]} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
          <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.heroTitle, { color: textColor }]}>系统配置</Text>
            <Text style={[styles.heroDesc, { color: subTextColor }]}>
              这里的修改会直接影响首页底部导航入口展示，保存后当前设备会立即同步。
            </Text>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.configRow, { borderBottomColor: borderColor }]}>
              <View style={styles.configTextWrap}>
                <Text style={[styles.configTitle, { color: textColor }]}>显示 AI 入口</Text>
                <Text style={[styles.configDesc, { color: subTextColor }]}>
                  控制底部导航里的 AI 问答入口是否对用户展示。
                </Text>
              </View>
              <Switch
                value={showAiChat}
                onValueChange={(value) => handleToggleConfig('show_ai_chat', value)}
                trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: HEALING_COLORS.pink[400] }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>

            <View style={styles.configRow}>
              <View style={styles.configTextWrap}>
                <Text style={[styles.configTitle, { color: textColor }]}>显示圈子入口</Text>
                <Text style={[styles.configDesc, { color: subTextColor }]}>
                  控制底部导航里的圈子入口是否对用户展示。
                </Text>
              </View>
              <Switch
                value={showCircle}
                onValueChange={(value) => handleToggleConfig('show_circle', value)}
                trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: HEALING_COLORS.pink[400] }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  configTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  configDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SystemConfigScreen;
