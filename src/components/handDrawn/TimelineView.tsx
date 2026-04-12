import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { HandDrawnCard } from './HandDrawnCard';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
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
                  <HandDrawnCard style="soft" padding="medium" onPress={() => onItemPress?.(item)}>
                    <View style={styles.itemHeader}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.itemDate}>{formatCardDate(item.date)}</Text>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {item.scenario && (
                        <Text style={styles.scenarioIcon}>{getScenarioIcon(item.scenario)}</Text>
                      )}
                    </View>
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.footerContainer}>
                      {item.location && <Text style={styles.itemLocation}>📍 {item.location}</Text>}
                      <View style={styles.iconContainer}>
                        {item.mood && (
                          <Text style={styles.statusIcon}>{getMoodConfig(item.mood).emoji}</Text>
                        )}
                        {item.weather && (
                          <Text style={styles.statusIcon}>
                            {getWeatherConfig(item.weather).emoji}
                          </Text>
                        )}
                      </View>
                    </View>
                  </HandDrawnCard>
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

const formatCardDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDay = days[date.getDay()];

  return `${month}月${day}日 ${weekDay}`;
};

const getScenarioIcon = (scenario: string): string => {
  const icons: Record<string, string> = {
    travel: '✈️',
    movie: '🎬',
    outing: '🌳',
    food: '🍔',
    daily: '📝',
    special: '🎉',
  };
  return icons[scenario] || '📝';
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: HEALING_COLORS.pink[400],
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  scenarioIcon: {
    fontSize: 24,
    marginLeft: 4,
  },
  statusIcon: {
    fontSize: 20,
    marginLeft: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  itemLocation: {
    fontSize: 12,
    color: '#999',
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
