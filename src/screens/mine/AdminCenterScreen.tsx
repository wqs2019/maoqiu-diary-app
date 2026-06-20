import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import feedbackService from '@/services/feedbackService';
import { useAuthStore } from '@/store/authStore';

type AdminEntry = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  actionLabel?: string;
  badgeCount?: number;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const AdminCenterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const surfaceColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#FCE7F3';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';

  const openPlannedFeature = useCallback((title: string) => {
    Alert.alert('即将开放', `${title} 入口已预留，后续可以在这里继续扩展。`);
  }, []);

  const loadPendingCount = useCallback(async () => {
    if (!user?._id || !user.isAdmin) {
      setPendingReviewCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const count = await feedbackService.getAdminPendingCount(user._id);
      setPendingReviewCount(count);
    } catch (error) {
      console.error('Failed to load admin pending count', error);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadPendingCount();
    }, [loadPendingCount])
  );

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>管理员中心</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.centerState}>
          <Feather name="lock" size={44} color={subTextColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>当前账号无管理员权限</Text>
          <Text style={[styles.emptyDesc, { color: subTextColor }]}>
            只有 `admin_list` 中的账号才可以查看管理员中心。
          </Text>
        </View>
      </View>
    );
  }

  const governanceEntries: AdminEntry[] = [
    {
      key: 'moderation',
      title: '内容审核',
      description: '查看用户举报、拉黑自动留痕和审核处理记录',
      icon: 'shield',
      iconBg: '#FCE7F3',
      iconColor: HEALING_COLORS.pink[600],
      badgeCount: pendingReviewCount,
      loading,
      onPress: () => navigation.navigate('AdminModeration'),
    },
    {
      key: 'governance-records',
      title: '治理记录',
      description: '汇总平台治理动作、回执结果和后续复核线索',
      icon: 'archive',
      iconBg: isDark ? '#1F2937' : '#EEF2FF',
      iconColor: isDark ? '#C4B5FD' : '#6366F1',
      actionLabel: '规划中',
      disabled: true,
      onPress: () => openPlannedFeature('治理记录'),
    },
  ];

  const platformEntries: AdminEntry[] = [
    {
      key: 'user-management',
      title: '用户管理',
      description: '查看用户列表、会员状态、管理员身份和账号注销情况',
      icon: 'users',
      iconBg: isDark ? '#1F2937' : '#ECFDF5',
      iconColor: isDark ? '#6EE7B7' : '#059669',
      onPress: () => navigation.navigate('AdminUserManagement'),
    },
    {
      key: 'monitoring-dashboard',
      title: '监控大盘',
      description: '查看页面 PV/UV 趋势、最近错误日志和用户报错明细',
      icon: 'activity',
      iconBg: isDark ? '#1F2937' : '#EEF2FF',
      iconColor: isDark ? '#93C5FD' : '#2563EB',
      onPress: () => navigation.navigate('MonitoringDashboard'),
    },
    {
      key: 'system-config',
      title: '系统配置',
      description: '配置 AI 入口、圈子入口等面向用户的全局展示开关',
      icon: 'sliders',
      iconBg: isDark ? '#27272A' : '#FFF7ED',
      iconColor: isDark ? '#FDBA74' : '#EA580C',
      onPress: () => navigation.navigate('SystemConfig'),
    },
  ];

  const renderEntry = (entry: AdminEntry, isLast: boolean) => (
    <TouchableOpacity
      key={entry.key}
      activeOpacity={entry.disabled ? 0.9 : 0.85}
      style={[
        styles.entryRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
      onPress={entry.onPress}
    >
      <View style={styles.entryLeft}>
        <View style={[styles.iconWrap, { backgroundColor: entry.iconBg }]}>
          <Feather name={entry.icon} size={18} color={entry.iconColor} />
        </View>
        <View style={styles.entryTextWrap}>
          <View style={styles.entryTitleRow}>
            <Text style={[styles.entryTitle, { color: textColor }]}>{entry.title}</Text>
            {entry.actionLabel ? (
              <View style={[styles.planTag, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}>
                <Text style={[styles.planTagText, { color: subTextColor }]}>{entry.actionLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.entryDesc, { color: subTextColor }]}>{entry.description}</Text>
        </View>
      </View>

      <View style={styles.entryRight}>
        {entry.loading ? (
          <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
        ) : entry.badgeCount ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{entry.badgeCount > 99 ? '99+' : entry.badgeCount}</Text>
          </View>
        ) : null}
        <Feather name="chevron-right" size={20} color={subTextColor} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>管理员中心</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>管理员工作台</Text>
          <Text style={[styles.sectionDesc, { color: subTextColor }]}>
            先把治理和平台管理入口统一收口，后面继续加功能时不需要再改整体结构。
          </Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.blockTitle, { color: textColor }]}>内容治理</Text>
          <View style={[styles.entryCard, { backgroundColor: surfaceColor, borderColor }]}>
            {governanceEntries.map((entry, index) =>
              renderEntry(entry, index === governanceEntries.length - 1)
            )}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.blockTitle, { color: textColor }]}>平台管理</Text>
          <View style={[styles.entryCard, { backgroundColor: surfaceColor, borderColor }]}>
            {platformEntries.map((entry, index) =>
              renderEntry(entry, index === platformEntries.length - 1)
            )}
          </View>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 32,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  sectionBlock: {
    marginTop: 18,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryTextWrap: {
    flex: 1,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  planTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  planTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entryDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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

export default AdminCenterScreen;
