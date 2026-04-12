import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

import { HandDrawnCard } from '../../components/handDrawn/HandDrawnCard';
import { HEALING_COLORS, HAND_DRAWN_STYLES } from '../../config/handDrawnTheme';

interface MemoryCard {
  id: string;
  title: string;
  date: string;
  images: string[];
  scenario: string;
  mood: string;
}

interface PhotoWallProps {
  memories?: MemoryCard[];
}

export const PhotoWall: React.FC<PhotoWallProps> = ({ memories = [] }) => {
  const handDrawnStyle = HAND_DRAWN_STYLES.warm;

  // 模拟数据
  const defaultMemories: MemoryCard[] = [
    {
      id: '1',
      title: '周末野餐时光',
      date: '2024-03-15',
      images: [
        'https://picsum.photos/300/300?random=1',
        'https://picsum.photos/300/300?random=2',
        'https://picsum.photos/300/300?random=3',
      ],
      scenario: 'outing',
      mood: 'happy',
    },
    {
      id: '2',
      title: '京都之旅',
      date: '2024-02-20',
      images: ['https://picsum.photos/300/300?random=4', 'https://picsum.photos/300/300?random=5'],
      scenario: 'travel',
      mood: 'excited',
    },
    {
      id: '3',
      title: '生日派对',
      date: '2024-01-10',
      images: [
        'https://picsum.photos/300/300?random=6',
        'https://picsum.photos/300/300?random=7',
        'https://picsum.photos/300/300?random=8',
        'https://picsum.photos/300/300?random=9',
      ],
      scenario: 'special',
      mood: 'happy',
    },
  ];

  const displayMemories = memories.length > 0 ? memories : defaultMemories;

  const getScenarioEmoji = (scenario: string): string => {
    const emojis: Record<string, string> = {
      travel: '✈️',
      movie: '🎬',
      outing: '🌳',
      food: '🍔',
      daily: '📝',
      special: '🎉',
    };
    return emojis[scenario] || '📷';
  };

  const getMoodEmoji = (mood: string): string => {
    const emojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      normal: '😐',
      excited: '🤩',
      angry: '😠',
      relaxed: '😌',
      touched: '🥺',
    };
    return emojis[mood] || '😊';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>生活碎片</Text>
        <Text style={styles.subtitle}>收集每一个美好瞬间 ✨</Text>
      </View>

      <View style={styles.grid}>
        {displayMemories.map((memory) => (
          <HandDrawnCard key={memory.id} style="warm" variant="default" padding="small">
            <View style={styles.memoryCard}>
              {/* 照片拼贴 */}
              <View style={styles.photoGrid}>
                {memory.images.slice(0, 4).map((image, index) => (
                  <View
                    key={index}
                    style={[
                      styles.photoItem,
                      memory.images.length === 1 && styles.singlePhoto,
                      memory.images.length > 1 && index === 0 && styles.firstPhoto,
                    ]}
                  >
                    <Image source={{ uri: image }} style={styles.photo} resizeMode="cover" />
                  </View>
                ))}
                {memory.images.length > 4 && (
                  <View style={[styles.photoItem, styles.morePhotos]}>
                    <Text style={styles.moreText}>+{memory.images.length - 4}</Text>
                  </View>
                )}
              </View>

              {/* 信息区域 */}
              <View style={styles.info}>
                <View style={styles.infoHeader}>
                  <Text style={styles.scenarioEmoji}>{getScenarioEmoji(memory.scenario)}</Text>
                  <Text style={styles.memoryTitle} numberOfLines={1}>
                    {memory.title}
                  </Text>
                  <Text style={styles.moodEmoji}>{getMoodEmoji(memory.mood)}</Text>
                </View>
                <Text style={styles.memoryDate}>{memory.date}</Text>
              </View>
            </View>
          </HandDrawnCard>
        ))}
      </View>

      {/* 空状态 */}
      {displayMemories.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyText}>暂无照片</Text>
          <Text style={styles.emptySubText}>记录生活，收集美好</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  grid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  memoryCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  photoItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  singlePhoto: {
    width: '100%',
    height: 200,
  },
  firstPhoto: {
    width: '66%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  morePhotos: {
    backgroundColor: HEALING_COLORS.pink[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 16,
    fontWeight: '700',
    color: HEALING_COLORS.pink[500],
  },
  info: {
    paddingHorizontal: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scenarioEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  memoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  moodEmoji: {
    fontSize: 16,
    marginLeft: 6,
  },
  memoryDate: {
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
