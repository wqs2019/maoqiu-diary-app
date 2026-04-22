import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { getMoodConfig } from '../../config/statusConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryList, useDiaryStats } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';

const CalendarScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();

  // 当前日历查看的年月
  const [currentDate, setCurrentDate] = useState(new Date());

  // 生成当前月份的查询范围
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate]);

  // 查询当前月份的所有日记
  const { data: diaryData, isLoading } = useDiaryList({
    page: 1,
    pageSize: 100, // 假设一个月最多写100篇
    userId: user?._id,
    startDate,
    endDate,
  });

  // 获取统计数据（包括准确计算跨月连续打卡）
  const { currentStreak } = useDiaryStats(user?._id);

  // 处理当前月份的日记数据，按日期（YYYY-MM-DD）分组
  const diariesByDate = useMemo(() => {
    const map: Record<string, any> = {};
    if (diaryData?.list) {
      diaryData.list.forEach((diary: any) => {
        // 严格使用用户在写日记时选择的日期 date
        const d = new Date(diary.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        // 如果同一天有多篇，这里简单保留第一篇或用数组
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(diary);
      });
    }
    return map;
  }, [diaryData]);

  // 切换月份
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 生成日历格子数据
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0(周日) - 6(周六)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // 填充前面的空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // 填充本月天数
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        dateKey,
        diaries: diariesByDate[dateKey] || [],
      });
    }
    return days;
  }, [currentDate, diariesByDate]);

  // 计算打卡统计
  const checkInStats = useMemo(() => {
    let totalCheckIns = 0;

    // 计算本月打卡次数（使用当月的数据）
    if (diaryData?.list && diaryData.list.length > 0) {
      const sortedDates = Object.keys(diariesByDate).sort((a, b) => b.localeCompare(a));
      totalCheckIns = sortedDates.length;
    }

    return { totalCheckIns, currentStreak };
  }, [diariesByDate, diaryData, currentStreak]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#121212' : '#FAFAFA', borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather name="chevron-left" size={28} color={isDark ? '#FFF' : HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>打卡日历</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} indicatorStyle={isDark ? 'white' : 'black'}>
        {/* 统计卡片 */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity,
              shadowRadius: themeStyle.shadowRadius,
              shadowOffset: themeStyle.shadowOffset,
              elevation: 8,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[500] }]}>{checkInStats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[500] }]}>连续打卡(天)</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#333' : '#FFF0F3' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[500] }]}>{checkInStats.totalCheckIns}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[500] }]}>本月打卡(次)</Text>
          </View>
        </View>

        {/* 日历主体 */}
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#FFF0F3',
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          {/* 日历头部：切换月份 */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={[styles.monthButton, { backgroundColor: isDark ? '#333' : '#FAFAFA' }]}>
              <Feather name="chevron-left" size={24} color={isDark ? '#E5E7EB' : HEALING_COLORS.gray[600]} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={[styles.monthButton, { backgroundColor: isDark ? '#333' : '#FAFAFA' }]}>
              <Feather name="chevron-right" size={24} color={isDark ? '#E5E7EB' : HEALING_COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* 星期表头 */}
          <View style={styles.weekDaysContainer}>
            {weekDays.map((day, index) => (
              <Text key={index} style={[styles.weekDayText, { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[400] }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* 日历网格 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={HEALING_COLORS.pink[400]} size="large" />
            </View>
          ) : (
            <View style={styles.daysGrid}>
              {calendarDays.map((item, index) => {
                if (!item) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const hasDiary = item.diaries.length > 0;
                const isToday =
                  new Date().getDate() === item.day &&
                  new Date().getMonth() === currentDate.getMonth() &&
                  new Date().getFullYear() === currentDate.getFullYear();

                // 如果有日记，展示第一篇的心情emoji
                const moodEmoji =
                  hasDiary && item.diaries[0].mood
                    ? getMoodConfig(item.diaries[0].mood).emoji
                    : '🐾';

                return (
                  <TouchableOpacity
                    key={`day-${item.day}`}
                    style={styles.dayCell}
                    activeOpacity={hasDiary ? 0.7 : 1}
                    onPress={() => {
                      if (hasDiary) {
                        // 如果当天有多篇，可以跳转到详情或者列表，这里跳转到第一篇的详情
                        (navigation as any).navigate('DiaryDetail', { _id: item.diaries[0]._id });
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && !hasDiary && [styles.todayCircle, { backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[50], borderColor: isDark ? '#4A2533' : HEALING_COLORS.pink[300] }],
                        hasDiary && [styles.checkedCircle, { backgroundColor: isDark ? '#2C1B24' : '#FFF0F3' }],
                      ]}
                    >
                      {hasDiary ? (
                        <Text style={styles.dayEmoji}>{moodEmoji}</Text>
                      ) : (
                        <Text style={[styles.dayText, { color: isDark ? '#E5E7EB' : HEALING_COLORS.gray[700] }, isToday && [styles.todayText, { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600] }]]}>
                          {item.day}
                        </Text>
                      )}
                    </View>
                    {hasDiary && item.diaries.length > 1 && <View style={[styles.multiDot, { backgroundColor: isDark ? HEALING_COLORS.pink[500] : HEALING_COLORS.pink[400] }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#666' : HEALING_COLORS.gray[400] }]}>🐾 每天都要记得来看毛球哦</Text>
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
    backgroundColor: '#FAFAFA',
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFF0F3',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: HEALING_COLORS.pink[500],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: HEALING_COLORS.gray[500],
  },
  statDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#FFF0F3',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFF0F3',
    marginBottom: 40,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HEALING_COLORS.gray[800],
  },
  monthButton: {
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: HEALING_COLORS.gray[400],
    width: 40,
    textAlign: 'center',
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCircle: {
    backgroundColor: HEALING_COLORS.pink[50],
    borderWidth: 2,
    borderColor: HEALING_COLORS.pink[300],
  },
  checkedCircle: {
    backgroundColor: '#FFF0F3',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: HEALING_COLORS.gray[700],
  },
  todayText: {
    color: HEALING_COLORS.pink[600],
    fontWeight: '700',
  },
  dayEmoji: {
    fontSize: 18,
  },
  multiDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: HEALING_COLORS.pink[400],
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: HEALING_COLORS.gray[400],
    fontWeight: '500',
  },
});

export default CalendarScreen;
