import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { HEALING_COLORS, HAND_DRAWN_STYLES } from '../../config/handDrawnTheme';
import { TimelineItem } from '../../types';
import { HandDrawnCard } from './HandDrawnCard';

interface TimelineViewProps {
    items: TimelineItem[];
    onItemPress?: (item: TimelineItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    items,
    onItemPress,
}) => {
    const groupedItems = items.reduce((acc, item) => {
        const date = new Date(item.date);
        const dateKey = date.toISOString().split('T')[0];

        if (!acc[dateKey]) {
            acc[dateKey] = {
                date: dateKey,
                displayDate: formatDate(date),
                items: [],
            };
        }
        acc[dateKey].items.push(item);
        return acc;
    }, {} as Record<string, { date: string; displayDate: string; items: TimelineItem[] }>);

    const sortedDates = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {sortedDates.map((dateKey, index) => (
                <View key={dateKey} style={styles.dateGroup}>
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateText}>{groupedItems[dateKey].displayDate}</Text>
                        <View style={styles.dateLine} />
                    </View>

                    {groupedItems[dateKey].items.map((item) => (
                        <View key={item._id} style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <HandDrawnCard
                                    style="soft"
                                    padding="medium"
                                    onPress={() => onItemPress?.(item)}
                                >
                                    <View style={styles.itemHeader}>
                                        <Text style={styles.itemTitle}>{item.title}</Text>
                                        {item.scenario && (
                                            <Text style={styles.scenarioIcon}>
                                                {getScenarioIcon(item.scenario)}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.itemDescription} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                    {item.location && (
                                        <Text style={styles.itemLocation}>📍 {item.location}</Text>
                                    )}
                                </HandDrawnCard>
                            </View>
                        </View>
                    ))}
                </View>
            ))}

            {items.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📝</Text>
                    <Text style={styles.emptyText}>暂无记录</Text>
                    <Text style={styles.emptySubText}>开始记录你的生活吧</Text>
                </View>
            )}
        </ScrollView>
    );
};

const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return '今天';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
    }

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('zh-CN', options);
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
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    scenarioIcon: {
        fontSize: 20,
        marginLeft: 8,
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
