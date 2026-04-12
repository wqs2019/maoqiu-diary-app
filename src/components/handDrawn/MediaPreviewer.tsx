import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  Dimensions,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { MediaResource } from '../../types';

const { width, height } = Dimensions.get('window');

interface MediaPreviewerProps {
  visible: boolean;
  media: MediaResource[];
  initialIndex: number;
  onClose: () => void;
}

const LivePhotoItem = ({ item, isFocused }: { item: MediaResource; isFocused: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // When not focused, ensure it stops
  useEffect(() => {
    if (!isFocused && isPlaying) {
      setIsPlaying(false);
    }
  }, [isFocused]);

  const handlePressIn = () => {
    if (item.type === 'livePhoto') {
      setIsPlaying(true);
    }
  };

  const handlePressOut = () => {
    if (item.type === 'livePhoto') {
      setIsPlaying(false);
    }
  };

  return (
    <Pressable
      style={styles.itemContainer}
      onLongPress={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={200}
    >
      {isPlaying && item.type === 'livePhoto' ? (
        <View style={styles.fullScreen}>
          <Video
            source={{ uri: item.uri }}
            style={styles.fullScreen}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
          />
          <View style={styles.liveIndicator}>
            <Ionicons name="radio-button-on" size={16} color="#FFF" />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      ) : (
        <View style={styles.fullScreen}>
          <Image
            source={{ uri: item.thumbnail || item.uri }}
            style={styles.fullScreen}
            resizeMode="contain"
          />
          {item.type === 'livePhoto' && (
            <View style={styles.liveIndicator}>
              <Ionicons name="radio-button-on" size={16} color="#FFF" />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export const MediaPreviewer: React.FC<MediaPreviewerProps> = ({
  visible,
  media,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = ({ item, index }: { item: MediaResource; index: number }) => {
    const isFocused = currentIndex === index;

    if (item.type === 'video') {
      return (
        <View style={styles.itemContainer}>
          <Video
            source={{ uri: item.uri }}
            style={styles.fullScreen}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay={isFocused}
            isLooping
          />
        </View>
      );
    }

    if (item.type === 'livePhoto' || item.type === 'image') {
      return <LivePhotoItem item={item} isFocused={isFocused} />;
    }

    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {media.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={media}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialScrollIndex={initialIndex >= 0 && initialIndex < media.length ? initialIndex : 0}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  counterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  itemContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
