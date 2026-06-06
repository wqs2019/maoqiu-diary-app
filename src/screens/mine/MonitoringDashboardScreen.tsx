import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LineTrendChart from '@/components/common/LineTrendChart';
import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  fetchMonitoringDashboard,
  getMonitoringPageLabel,
  MonitoringDashboard,
} from '@/services/monitorService';
import { useAuthStore } from '@/store/authStore';

const formatDateTime = (value?: string | number) => {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }

  return date.toLocaleString();
};

const buildUserLabel = (errorItem: MonitoringDashboard['recentErrors'][number]) => {
  if (errorItem.userSnapshot?.nickname) {
    return errorItem.userSnapshot.nickname;
  }

  if (errorItem.userSnapshot?.phone) {
    return errorItem.userSnapshot.phone;
  }

  if (errorItem.userId) {
    return errorItem.userId;
  }

  return '匿名用户';
};

const MonitoringDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDark } = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const surfaceColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#FCE7F3';

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!user?._id || !user.isAdmin) {
      setDashboard(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const result = await fetchMonitoringDashboard(user._id);
      setDashboard(result);
    } catch (error) {
      console.error('Failed to load monitoring dashboard', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id, user?.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  if (!user?.isAdmin) {
    return (
      <View style={[styles.centerState, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <Feather name="lock" size={44} color={subTextColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>当前账号无管理员权限</Text>
        <Text style={[styles.emptyDesc, { color: subTextColor }]}>只有管理员可以查看监控大盘。</Text>
      </View>
    );
  }

  if (loading && !dashboard) {
    return (
      <View style={[styles.centerState, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color={HEALING_COLORS.pink[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={HEALING_COLORS.pink[500]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
        <Text style={[styles.heroTitle, { color: textColor }]}>监控大盘</Text>
        <Text style={[styles.heroDesc, { color: subTextColor }]}>
          汇总过去一周的页面访问情况和客户端错误日志，便于定位页面热度与线上异常。
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.summaryLabel, { color: subTextColor }]}>总 PV</Text>
          <Text style={[styles.summaryValue, { color: textColor }]}>{dashboard?.overview.totalPv || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.summaryLabel, { color: subTextColor }]}>总 UV</Text>
          <Text style={[styles.summaryValue, { color: textColor }]}>{dashboard?.overview.totalUv || 0}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.summaryLabel, { color: subTextColor }]}>错误数</Text>
          <Text style={[styles.summaryValue, { color: textColor }]}>{dashboard?.overview.totalErrors || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.summaryLabel, { color: subTextColor }]}>监控页面</Text>
          <Text style={[styles.summaryValue, { color: textColor }]}>{dashboard?.overview.pageCount || 0}</Text>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>页面监控</Text>
        <Text style={[styles.sectionDesc, { color: subTextColor }]}>过去一周全站 PV / UV 趋势</Text>
        <LineTrendChart
          values={(dashboard?.pageTrend || []).map((item) => item.pv)}
          color={HEALING_COLORS.pink[500]}
          height={84}
        />
        <View style={styles.trendLabelRow}>
          {(dashboard?.pageTrend || []).map((item) => (
            <Text key={item.date} style={[styles.trendLabel, { color: subTextColor }]}>
              {item.label}
            </Text>
          ))}
        </View>

        {(dashboard?.pageStats || []).length ? (
          dashboard?.pageStats.map((item) => (
            <View key={item.pageName} style={[styles.metricCard, { borderColor }]}>
              <View style={styles.metricHeader}>
                <View>
                  <Text style={[styles.metricTitle, { color: textColor }]}>{getMonitoringPageLabel(item.pageName)}</Text>
                  <Text style={[styles.metricSubTitle, { color: subTextColor }]}>{item.pageName}</Text>
                </View>
                <View style={styles.metricTotals}>
                  <Text style={[styles.metricTotalText, { color: textColor }]}>PV {item.totalPv}</Text>
                  <Text style={[styles.metricTotalText, { color: textColor }]}>UV {item.totalUv}</Text>
                </View>
              </View>
              <LineTrendChart
                values={item.trend.map((trendItem) => trendItem.pv)}
                color={HEALING_COLORS.pink[400]}
                height={64}
                strokeWidth={2.5}
                pointRadius={2}
              />
              <View style={styles.trendLabelRow}>
                {item.trend.map((trendItem) => (
                  <Text key={`${item.pageName}-${trendItem.date}`} style={[styles.trendLabel, { color: subTextColor }]}>
                    {trendItem.label}
                  </Text>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyDesc, { color: subTextColor }]}>过去一周还没有页面访问数据。</Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>错误监控</Text>
        <Text style={[styles.sectionDesc, { color: subTextColor }]}>展示用户、页面和最近上报的错误日志</Text>
        <LineTrendChart
          values={(dashboard?.errorTrend || []).map((item) => item.count)}
          color={isDark ? '#F87171' : '#EF4444'}
          height={84}
        />
        <View style={styles.trendLabelRow}>
          {(dashboard?.errorTrend || []).map((item) => (
            <Text key={item.date} style={[styles.trendLabel, { color: subTextColor }]}>
              {item.label}
            </Text>
          ))}
        </View>

        {(dashboard?.recentErrors || []).length ? (
          dashboard?.recentErrors.map((item) => (
            <View key={item._id || `${item.pageName}-${item.createdAt}`} style={[styles.errorCard, { borderColor }]}>
              <View style={styles.errorHeader}>
                <View style={styles.errorBadgeRow}>
                  <View style={[styles.errorBadge, { backgroundColor: item.isFatal ? '#FEE2E2' : '#FEF3C7' }]}>
                    <Text style={[styles.errorBadgeText, { color: item.isFatal ? '#B91C1C' : '#B45309' }]}>
                      {item.isFatal ? '致命' : '普通'}
                    </Text>
                  </View>
                  <Text style={[styles.errorPage, { color: textColor }]}>
                    {getMonitoringPageLabel(item.pageName)} / {item.pageName}
                  </Text>
                </View>
                <Text style={[styles.errorTime, { color: subTextColor }]}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <Text style={[styles.errorMeta, { color: subTextColor }]}>用户：{buildUserLabel(item)}</Text>
              <Text style={[styles.errorMeta, { color: subTextColor }]}>来源：{item.source || 'manual'}</Text>
              <Text style={[styles.errorTitle, { color: textColor }]}>
                {item.errorName || 'Error'}: {item.errorMessage}
              </Text>
              {!!item.stack && (
                <Text style={[styles.errorStack, { color: subTextColor }]} numberOfLines={4}>
                  {item.stack}
                </Text>
              )}
              <Text style={[styles.errorMeta, { color: subTextColor }]}>
                设备：{item.deviceInfo?.platform || 'unknown'} {item.deviceInfo?.appVersion || ''}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyDesc, { color: subTextColor }]}>过去一周还没有错误日志。</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.backButton, { borderColor }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.backButtonText, { color: textColor }]}>返回管理员中心</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDesc: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
  },
  trendLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trendLabel: {
    fontSize: 11,
  },
  metricCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricSubTitle: {
    marginTop: 4,
    fontSize: 12,
  },
  metricTotals: {
    alignItems: 'flex-end',
  },
  metricTotalText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  errorHeader: {
    marginBottom: 10,
  },
  errorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  errorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorPage: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorTime: {
    marginTop: 6,
    fontSize: 12,
  },
  errorMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorStack: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyBlock: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MonitoringDashboardScreen;
