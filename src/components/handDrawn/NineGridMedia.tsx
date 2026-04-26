import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';

import { LoadableImage } from './PhotoWall';

import { MediaResource } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NineGridMediaProps {
  media: MediaResource[];
  onPreview: (media: MediaResource[], index: number) => void;
  containerWidth?: number;
}

const IMAGE_MARGIN = 4;
/**
 * 9宫格图片组件
 */
export const NineGridMedia: React.FC<NineGridMediaProps> = ({
  media,
  onPreview,
  containerWidth = SCREEN_WIDTH - 64, // 默认宽度减去一些 padding
}) => {
  if (!media || media.length === 0) return null;

  const mediaCount = media.length;

  // 1张图：最大宽度为容器宽度的 2/3，或者全宽
  // 2张图、4张图：2列
  // 3、5、6、7、8、9张图：3列
  const getLayout = () => {
    if (mediaCount === 1) {
      return { columns: 1, itemWidth: Math.floor(containerWidth * 0.7) };
    }
    if (mediaCount === 2 || mediaCount === 4) {
      return { columns: 2, itemWidth: Math.floor((containerWidth - IMAGE_MARGIN) / 2) };
    }
    return { columns: 3, itemWidth: Math.floor((containerWidth - IMAGE_MARGIN * 2) / 3) };
  };

  const { columns, itemWidth } = getLayout();

  return (
    <View style={[styles.mediaGrid, { width: containerWidth }]}>
      {media.map((mediaItem, index) => {
        const isLastInRow = (index + 1) % columns === 0;
        const isLastRow = Math.floor(index / columns) === Math.floor((mediaCount - 1) / columns);

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            onPress={() => {
              onPreview(media, index);
            }}
            style={[
              styles.mediaWrapper,
              {
                width: itemWidth,
                height: itemWidth,
                marginRight: isLastInRow ? 0 : IMAGE_MARGIN,
                marginBottom: isLastRow ? 0 : IMAGE_MARGIN,
              },
            ]}
          >
            <LoadableImage
              source={{ uri: mediaItem.thumbnail || mediaItem.uri }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {mediaItem.type === 'video' && (
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={Math.max(24, itemWidth * 0.3)} color="#FFF" />
              </View>
            )}
            {mediaItem.type === 'livePhoto' && (
              <View style={styles.liveBadge}>
                <Ionicons name="aperture" size={12} color="#FFF" />
                <Text style={styles.liveText}>实况</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  mediaWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    marginLeft: 2,
  },
});
