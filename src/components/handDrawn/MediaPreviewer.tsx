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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MediaResource } from '../../types';

const { width, height } = Dimensions.get('window');

interface MediaPreviewerProps {
  visible: boolean;
  media: MediaResource[];
  initialIndex: number;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const getMaxOffset = (scale: number, size: number) => {
  'worklet';
  return Math.max(0, ((scale - 1) * size) / 2);
};

const LivePhotoItem = ({
  item,
  isFocused,
  onZoomStateChange,
}: {
  item: MediaResource;
  isFocused: boolean;
  onZoomStateChange?: (isZoomed: boolean) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // When not focused, ensure it stops
  useEffect(() => {
    if (!isFocused && isPlaying) {
      setIsPlaying(false);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) {
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      onZoomStateChange?.(false);
    }
  }, [
    isFocused,
    onZoomStateChange,
    savedScale,
    scale,
    savedTranslateX,
    savedTranslateY,
    translateX,
    translateY,
  ]);

  const handlePressIn = () => {
    if (item.type === 'livePhoto') {
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.setPositionAsync(0);
      }
    }
  };

  const handlePressOut = () => {
    if (item.type === 'livePhoto') {
      setIsPlaying(false);
    }
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const reportZoomState = (nextScale: number) => {
    onZoomStateChange?.(nextScale > 1.01);
  };

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .manualActivation(true)
    .enabled(item.type === 'image' || item.type === 'livePhoto')
    .onTouchesMove((event, stateManager) => {
      if (event.numberOfTouches !== 1) {
        stateManager.fail();
        return;
      }

      // Let the outer preview keep handling swipe-to-close until the media is zoomed in.
      if (scale.value <= 1.01) {
        stateManager.fail();
        return;
      }

      stateManager.activate();
    })
    .onUpdate((event) => {
      if (scale.value <= 1.01) {
        return;
      }

      const maxOffsetX = getMaxOffset(scale.value, width);
      const maxOffsetY = getMaxOffset(scale.value, height);
      translateX.value = clamp(savedTranslateX.value + event.translationX, -maxOffsetX, maxOffsetX);
      translateY.value = clamp(savedTranslateY.value + event.translationY, -maxOffsetY, maxOffsetY);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      const maxOffsetX = getMaxOffset(scale.value, width);
      const maxOffsetY = getMaxOffset(scale.value, height);
      savedTranslateX.value = clamp(translateX.value, -maxOffsetX, maxOffsetX);
      savedTranslateY.value = clamp(translateY.value, -maxOffsetY, maxOffsetY);
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(item.type === 'image' || item.type === 'livePhoto')
    .onUpdate((event) => {
      const nextScale = clamp(savedScale.value * event.scale, 1, 4);
      scale.value = nextScale;
      runOnJS(reportZoomState)(nextScale);
    })
    .onEnd(() => {
      const finalScale = clamp(scale.value, 1, 4);
      savedScale.value = finalScale;
      if (finalScale <= 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(reportZoomState)(1);
        return;
      }

      const maxOffsetX = getMaxOffset(finalScale, width);
      const maxOffsetY = getMaxOffset(finalScale, height);
      translateX.value = withTiming(clamp(translateX.value, -maxOffsetX, maxOffsetX));
      translateY.value = withTiming(clamp(translateY.value, -maxOffsetY, maxOffsetY));
      savedTranslateX.value = clamp(savedTranslateX.value, -maxOffsetX, maxOffsetX);
      savedTranslateY.value = clamp(savedTranslateY.value, -maxOffsetY, maxOffsetY);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(item.type === 'image' || item.type === 'livePhoto')
    .onEnd(() => {
      if (savedScale.value > 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(reportZoomState)(1);
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(reportZoomState)(2);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, doubleTapGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Pressable
        style={styles.itemContainer}
        onLongPress={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={200}
      >
        <View style={styles.fullScreen}>
          <Reanimated.View style={[styles.zoomableContent, animatedImageStyle]}>
            <Image
              source={{ uri: item.thumbnail || item.uri }}
              style={[styles.fullScreen, { opacity: isPlaying ? 0 : 1 }]}
              resizeMode="contain"
            />

            {item.type === 'livePhoto' && item.livePhotoVideoUri && (
              <Video
                ref={videoRef}
                source={{ uri: item.livePhotoVideoUri }}
                style={[styles.fullScreen, styles.videoOverlay, { opacity: isPlaying ? 1 : 0 }]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                isLooping={false}
                isMuted={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              />
            )}
          </Reanimated.View>

          {item.type === 'livePhoto' && (
            <View style={styles.liveIndicator}>
              <Ionicons name="aperture" size={16} color="#FFF" />
              <Text style={styles.liveText}>实况</Text>
            </View>
          )}
          {(item.type === 'image' || item.type === 'livePhoto') && (
            <View style={styles.zoomHint}>
              <Text style={styles.zoomHintText}>双指缩放，双击还原</Text>
            </View>
          )}
        </View>
      </Pressable>
    </GestureDetector>
  );
};

export const MediaPreviewer: React.FC<MediaPreviewerProps> = ({
  visible,
  media,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isZoomedRef = useRef(false);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有向下滑动且滑动距离超过一定阈值时才触发下拉关闭
        return (
          gestureState.numberActiveTouches === 1 &&
          !isZoomedRef.current &&
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
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
      setIsZoomed(false);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
      setIsZoomed(false);
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
      return (
        <LivePhotoItem
          item={item}
          isFocused={isFocused}
          onZoomStateChange={(zoomed) => {
            if (isFocused) {
              setIsZoomed(zoomed);
            }
          }}
        />
      );
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
            scrollEnabled={!isZoomed}
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
  zoomableContent: {
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
  zoomHint: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  zoomHintText: {
    color: '#FFF',
    fontSize: 12,
  },
});
