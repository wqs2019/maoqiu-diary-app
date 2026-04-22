import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { DiaryCard } from './DiaryCard';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { TimelineItem } from '../../types';

interface TimelineViewProps {
  items: TimelineItem[];
  onItemPress?: (item: TimelineItem) => void;
  onYearLayouts?: (year: string, y: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  onItemPress,
  onYearLayouts,
}) => {
  const { isDark } = useAppTheme();

  const groupedItems = items.reduce(
    (acc, item) => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const dateKey = `${year}-${String(month).padStart(2, '0')}`; // YYYY-MM

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          displayDate: `${year}年${month}月`,
          year: year.toString(),
          items: [],
        };
      }
      acc[dateKey].items.push(item);
      return acc;
    },
    {} as Record<string, { date: string; displayDate: string; year: string; items: TimelineItem[] }>
  );

  const sortedDates = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));

  // Track the first appearance of each year
  const firstAppearanceOfYears = new Set<string>();

  return (
    <View style={styles.container}>
      {sortedDates.map((dateKey, index) => {
        const itemData = groupedItems[dateKey];
        const isFirstOfYear = !firstAppearanceOfYears.has(itemData.year);
        if (isFirstOfYear) {
          firstAppearanceOfYears.add(itemData.year);
        }

        return (
          <View
            key={dateKey}
            style={styles.dateGroup}
            onLayout={(event) => {
              if (isFirstOfYear && onYearLayouts) {
                const layout = event.nativeEvent.layout;
                onYearLayouts(itemData.year, layout.y);
              }
            }}
          >
            <View style={styles.dateHeader}>
              <View style={[styles.dateHeaderBadge, { backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[100] }]}>
                <Text style={styles.dateHeaderYear}>{itemData.year}年</Text>
                <Text style={styles.dateHeaderMonth}>{dateKey.split('-')[1]}月</Text>
              </View>
              <View style={[styles.dateLine, { backgroundColor: isDark ? '#4A2533' : HEALING_COLORS.pink[200] }]} />
            </View>

            {groupedItems[dateKey].items.map((item, itemIndex) => {
              const isLastItem = itemIndex === groupedItems[dateKey].items.length - 1;
              const dateObj = new Date(item.date);
              const dayStr = String(dateObj.getDate()).padStart(2, '0');
              const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
              const weekStr = days[dateObj.getDay()];

              // 格式化今天的友好展示
              const today = new Date();
              const isToday = dateObj.toDateString() === today.toDateString();

              return (
                <View key={item._id} style={styles.timelineItem}>
                  {/* 左侧时间轴区域 */}
                  <View style={styles.timelineLeft}>
                    <Text style={[styles.timelineDay, { color: isDark ? '#FFF' : '#333' }, isToday && styles.timelineDayToday]}>
                      {isToday ? '今天' : dayStr}
                    </Text>
                    <Text style={[styles.timelineWeek, { color: isDark ? '#AAA' : '#999' }, isToday && styles.timelineWeekToday]}>
                      {weekStr}
                    </Text>
                    <View style={[styles.timelineDot, { borderColor: isDark ? '#121212' : '#FFFFFF' }]} />
                    {!isLastItem && <View style={[styles.timelineVerticalLine, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />}
                  </View>

                  {/* 右侧卡片内容 */}
                  <View style={styles.timelineContent}>
                    <DiaryCard item={item} onPress={onItemPress} />
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyText}>暂无记录</Text>
          <Text style={styles.emptySubText}>开始记录你的生活吧</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  dateGroup: {
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingRight: 40,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  dateHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: HEALING_COLORS.pink[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  dateHeaderYear: {
    fontSize: 14,
    fontWeight: '600',
    color: HEALING_COLORS.pink[600],
    marginRight: 4,
  },
  dateHeaderMonth: {
    fontSize: 18,
    fontWeight: '800',
    color: HEALING_COLORS.pink[700],
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: HEALING_COLORS.pink[200],
    borderRadius: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  timelineDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    lineHeight: 28,
  },
  timelineDayToday: {
    fontSize: 20,
    color: HEALING_COLORS.pink[500],
  },
  timelineWeek: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
  },
  timelineWeekToday: {
    color: HEALING_COLORS.pink[400],
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: HEALING_COLORS.pink[400],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: HEALING_COLORS.pink[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  timelineVerticalLine: {
    position: 'absolute',
    top: 60, // 根据字体高度调整起点
    bottom: -32, // 延伸到下一个 item
    width: 2,
    backgroundColor: '#F0F0F0',
    borderRadius: 1,
    borderStyle: 'dashed',
  },
  timelineContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});
