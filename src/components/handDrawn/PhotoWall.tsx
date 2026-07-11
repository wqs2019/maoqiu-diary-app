import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated } from 'react-native';

import { HandDrawnCard } from '../../components/handDrawn/HandDrawnCard';
import { HEALING_COLORS, HAND_DRAWN_STYLES } from '../../config/handDrawnTheme';

// Skeleton Component for Images
export const ImageSkeleton = () => {
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const sharedAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    sharedAnimation.start();
    return () => {
      sharedAnimation.stop();
    };
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.8],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.skeletonContainer]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#A0A0A0', opacity }]} />
    </View>
  );
};

// Component to handle individual image loading state
export const LoadableImage = ({ source, style, resizeMode }: any) => {
  const imageUri = typeof source === 'number' ? String(source) : source?.uri || '';
  const [isLoading, setIsLoading] = useState(!!imageUri);

  useEffect(() => {
    setIsLoading(!!imageUri);
    // 防御性处理：对于已缓存图片可能不触发 onload 事件的坑
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // 500ms 后强制结束 loading
    return () => {
      clearTimeout(timer);
    };
  }, [imageUri]);

  return (
    <View style={[style, { overflow: 'hidden', position: 'relative' }]}>
      {/* 始终渲染骨架图在底层，Image 渲染在上层 */}
      {isLoading && (
        <View style={StyleSheet.absoluteFill}>
          <ImageSkeleton />
        </View>
      )}
      <Image
        key={imageUri}
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onLoad={() => {
          setIsLoading(false);
        }}
        onLoadEnd={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
        }}
      />
    </View>
  );
};

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
  isLoading?: boolean;
}

export const PhotoWall: React.FC<PhotoWallProps> = ({ memories = [], isLoading = false }) => {
  const handDrawnStyle = HAND_DRAWN_STYLES.warm;

  const displayMemories = memories.length > 0 ? memories : [];

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
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <HandDrawnCard
                key={`skeleton-${index}`}
                style="warm"
                variant="default"
                padding="small"
              >
                <View style={styles.memoryCard}>
                  <View style={styles.photoGrid}>
                    <View
                      style={[
                        styles.photoItem,
                        styles.singlePhoto,
                        { backgroundColor: 'transparent' },
                      ]}
                    >
                      <ImageSkeleton />
                    </View>
                  </View>
                  <View style={styles.info}>
                    <View style={styles.infoHeader}>
                      <View
                        style={{
                          width: 120,
                          height: 20,
                          backgroundColor: '#E5E5E5',
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      />
                    </View>
                    <View
                      style={{ width: 80, height: 14, backgroundColor: '#E5E5E5', borderRadius: 4 }}
                    />
                  </View>
                </View>
              </HandDrawnCard>
            ))
          : displayMemories.map((memory) => (
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
                        <LoadableImage
                          source={{ uri: image }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
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
      {!isLoading && displayMemories.length === 0 && (
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
  skeletonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
});
