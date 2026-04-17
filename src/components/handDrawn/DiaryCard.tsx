import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HandDrawnCard } from './HandDrawnCard';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { TimelineItem } from '../../types';

interface DiaryCardProps {
  item: TimelineItem;
  onPress?: (item: TimelineItem) => void;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({ item, onPress }) => {
  const scenario = item.scenario ? SCENARIO_TEMPLATES[item.scenario] : null;
  const mood = item.mood ? getMoodConfig(item.mood) : null;
  const weather = item.weather ? getWeatherConfig(item.weather) : null;

  // 提取首张图片作为封面
  const coverImage = item.media && item.media.length > 0 ? item.media[0] : null;

  // 日期格式化：支持今天/昨天等友好展示
  const formatCardDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `今天 ${timeStr}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${timeStr}`;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}月${day}日 ${timeStr}`;
  };

  return (
    <HandDrawnCard
      style="soft"
      padding="medium"
      variant="minimal"
      onPress={() => onPress?.(item)}
      backgroundColor="#FFFFFF" // 纯白背景色，避免透明度透出阴影杂色
    >
      {/* 顶部状态栏：日期 & 场景标签 */}
      <View style={styles.topBar}>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={14} color={HEALING_COLORS.gray[400]} />
          <Text style={styles.dateText}>{formatCardDate(item.date)}</Text>
        </View>

        {scenario && (
          <View style={[styles.scenarioTag, { backgroundColor: scenario.color + '15' }]}>
            <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
            <Text style={[styles.scenarioText, { color: scenario.color }]}>{scenario.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          {/* 标题 */}
          {!!item.title && (
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          )}

          {/* 内容简述 */}
          {!!item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>

        {/* 封面图片：放置在右侧 */}
        {coverImage && (
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri: coverImage.type === 'video' && coverImage.thumbnail ? coverImage.thumbnail : coverImage.uri,
              }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            {coverImage.type === 'video' && (
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.9)" />
              </View>
            )}
            {coverImage.type === 'livePhoto' && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 底部信息：定位与心情天气 */}
      <View style={styles.footer}>
        <View style={styles.locationContainer}>
          {!!item.location && (
            <>
              <Ionicons name="location" size={14} color={HEALING_COLORS.pink[400]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </>
          )}
        </View>

        <View style={styles.statusContainer}>
          {weather && (
            <View style={[styles.statusBadge, { backgroundColor: weather.background }]}>
              <Text style={styles.statusEmoji}>{weather.emoji}</Text>
              <Text style={[styles.statusLabel, { color: weather.primary }]}>{weather.label}</Text>
            </View>
          )}
          {mood && (
            <View style={[styles.statusBadge, { backgroundColor: mood.background, marginLeft: 6 }]}>
              <Text style={styles.statusEmoji}>{mood.emoji}</Text>
              <Text style={[styles.statusLabel, { color: mood.primary }]}>{mood.label}</Text>
            </View>
          )}
        </View>
      </View>
    </HandDrawnCard>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: HEALING_COLORS.gray[500],
    fontWeight: '500',
    marginLeft: 4,
  },
  scenarioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scenarioIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  scenarioText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2E',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
