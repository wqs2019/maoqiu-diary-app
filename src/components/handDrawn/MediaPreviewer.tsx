import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';
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
  Animated,
  PanResponder,
} from 'react-native';

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
      <View style={styles.fullScreen}>
        <Image
          source={{ uri: item.thumbnail || item.uri }}
          style={[styles.fullScreen, { opacity: isPlaying ? 0 : 1 }]}
          resizeMode="contain"
        />

        {item.type === 'livePhoto' && item.livePhotoVideoUri && (
          <Video
            source={{ uri: item.livePhotoVideoUri }}
            style={[styles.fullScreen, styles.videoOverlay, { opacity: isPlaying ? 1 : 0 }]}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            isLooping
            isMuted={false}
          />
        )}

        {item.type === 'livePhoto' && (
          <View style={styles.liveIndicator}>
            <Ionicons name="aperture" size={16} color="#FFF" />
            <Text style={styles.liveText}>实况</Text>
          </View>
        )}
      </View>
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

  // 手势相关动画值
  const panY = useRef(new Animated.Value(0)).current;
  const scale = panY.interpolate({
    inputRange: [0, height],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });
  const bgOpacity = panY.interpolate({
    inputRange: [0, height],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有向下滑动且滑动距离超过一定阈值时才触发下拉关闭
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 1.5) {
          // 滑动距离超过 150 或者速度很快，执行关闭动画
          Animated.timing(panY, {
            toValue: height,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onClose();
          });
        } else {
          // 否则回弹
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // 每次 Modal 显示时重置动画值
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible, panY]);

  // Configure audio to play even if the device is in silent mode
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
      } catch (e) {
        console.warn('Failed to configure audio mode:', e);
      }
    };

    configureAudio();
  }, []);

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
      <Animated.View style={[styles.container, { backgroundColor: 'black', opacity: bgOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {media.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{ flex: 1, transform: [{ translateY: panY }, { scale }] }}
          {...panResponder.panHandlers}
        >
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
        </Animated.View>
      </Animated.View>
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
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
