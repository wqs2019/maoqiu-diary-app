import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { DiaryCard } from './DiaryCard';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
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
              <Text style={styles.dateText}>{groupedItems[dateKey].displayDate}</Text>
              <View style={styles.dateLine} />
            </View>

            {groupedItems[dateKey].items.map((item) => (
              <View key={item._id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <DiaryCard item={item} onPress={onItemPress} />
                </View>
              </View>
            ))}
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
    paddingHorizontal: 16,
    paddingRight: 40, // 留出右侧年份选择器的空间
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginRight: 12,
  },
  dateLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E5E5',
    borderRadius: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: HEALING_COLORS.pink[400],
    marginRight: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
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
