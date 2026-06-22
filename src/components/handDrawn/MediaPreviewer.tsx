import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeModules,
  Platform,
  View,
  StyleSheet,
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
import ViewShot from 'react-native-view-shot';

import { useAuthStore } from '../../store/authStore';
import { MediaResource } from '../../types';

const { width, height } = Dimensions.get('window');
const WATERMARK_EXPORT_MAX_WIDTH = 1440;
const { LivePhotoSaver } = NativeModules as {
  LivePhotoSaver?: {
    saveVideo: (
      videoUri: string,
      brandText: string,
      userText: string
    ) => Promise<boolean>;
    saveLivePhoto: (
      imageUri: string,
      videoUri: string,
      brandText: string,
      userText: string
    ) => Promise<boolean>;
  };
};

interface MediaPreviewerProps {
  visible: boolean;
  media: MediaResource[];
  initialIndex: number;
  onClose: () => void;
  watermarkOwnerName?: string;
}

interface WatermarkCaptureTask {
  uri: string;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const getMaxOffset = (scale: number, size: number) => {
  'worklet';
  return Math.max(0, ((scale - 1) * size) / 2);
};

const MediaItem = ({
  item,
  isFocused,
  onZoomStateChange,
  onLoadStateChange,
}: {
  item: MediaResource;
  isFocused: boolean;
  onZoomStateChange?: (isZoomed: boolean) => void;
  onLoadStateChange?: (isLoaded: boolean) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(
    item.type === 'image' || item.type === 'livePhoto' || item.type === 'video'
  );
  const videoRef = useRef<Video>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    setIsMediaLoading(item.type === 'image' || item.type === 'livePhoto' || item.type === 'video');
  }, [item.type, item.uri]);

  useEffect(() => {
    if (!isFocused && isPlaying) {
      setIsPlaying(false);
    }
  }, [isFocused, isPlaying]);

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

  useEffect(() => {
    if (isFocused) {
      onLoadStateChange?.(!isMediaLoading);
    }
  }, [isFocused, isMediaLoading, onLoadStateChange]);

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
          {item.type === 'video' ? (
            <Video
              source={{ uri: item.uri }}
              style={styles.fullScreen}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay={isFocused}
              isLooping
              onLoadStart={() => setIsMediaLoading(true)}
              onReadyForDisplay={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
            />
          ) : (
            <Reanimated.View style={[styles.zoomableContent, animatedImageStyle]}>
              <Image
                source={{ uri: item.uri || item.thumbnail }}
                style={[styles.fullScreen, { opacity: isPlaying ? 0 : 1 }]}
                resizeMode="contain"
                onLoadStart={() => setIsMediaLoading(true)}
                onLoadEnd={() => setIsMediaLoading(false)}
                onError={() => setIsMediaLoading(false)}
              />

              {item.type === 'livePhoto' && item.livePhotoVideoUri ? (
                <Video
                  ref={videoRef}
                  source={{ uri: item.livePhotoVideoUri }}
                  style={[styles.fullScreen, styles.videoOverlay, { opacity: isPlaying ? 1 : 0 }]}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isPlaying}
                  isLooping={false}
                  isMuted={false}
                />
              ) : null}
            </Reanimated.View>
          )}

          {isMediaLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : null}

          {item.type === 'livePhoto' ? (
            <View style={styles.liveIndicator}>
              <Ionicons name="aperture" size={16} color="#FFF" />
              <Text style={styles.liveText}>实况</Text>
            </View>
          ) : null}
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
  watermarkOwnerName,
}) => {
  const user = useAuthStore((state) => state.user);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isCurrentMediaReady, setIsCurrentMediaReady] = useState(false);
  const [watermarkTask, setWatermarkTask] = useState<WatermarkCaptureTask | null>(null);
  const isZoomedRef = useRef(false);
  const watermarkViewShotRef = useRef<ViewShot>(null);
  const watermarkReadyResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

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
        return (
          gestureState.numberActiveTouches === 1 &&
          !isZoomedRef.current &&
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        gestureState.numberActiveTouches === 1 &&
        !isZoomedRef.current &&
        gestureState.dy > 5 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 1.5) {
          Animated.timing(panY, {
            toValue: height,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onClose();
          });
        } else {
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

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [panY, visible]);

  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.warn('Failed to configure audio mode:', error);
      }
    };

    void configureAudio();
  }, []);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setIsCurrentMediaReady(false);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0]?.index === 'number') {
      setCurrentIndex(viewableItems[0].index);
      setIsZoomed(false);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const currentItem = media[currentIndex];
  const showZoomHint = currentItem?.type === 'image' || currentItem?.type === 'livePhoto';
  const canDownloadCurrentMedia =
    currentItem?.type === 'image' || currentItem?.type === 'livePhoto' || currentItem?.type === 'video';
  const watermarkUserName = watermarkOwnerName || user?.nickname || user?.phone || '毛球用户';

  useEffect(() => {
    setIsCurrentMediaReady(false);
  }, [currentIndex, currentItem?.uri, currentItem?.livePhotoVideoUri, visible]);

  const getExtensionFromUri = (uri?: string) => {
    if (!uri) {
      return undefined;
    }

    const cleanUri = uri.split('?')[0];
    const matchedExtension = cleanUri.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
    return matchedExtension;
  };

  const getDownloadFileExtension = (item: MediaResource) => {
    const matchedExtension = getExtensionFromUri(item.uri);

    if (matchedExtension) {
      return matchedExtension;
    }

    if (item.mimeType?.includes('png')) {
      return 'png';
    }

    if (item.mimeType?.includes('webp')) {
      return 'webp';
    }

    if (item.mimeType?.includes('heic')) {
      return 'heic';
    }

    return 'jpg';
  };

  const getLivePhotoVideoExtension = (item: MediaResource) => {
    const matchedExtension = getExtensionFromUri(item.livePhotoVideoUri);
    if (matchedExtension) {
      return matchedExtension;
    }

    return 'mov';
  };

  const getVideoFileExtension = (item: MediaResource) => {
    const matchedExtension = getExtensionFromUri(item.uri);
    if (matchedExtension) {
      return matchedExtension;
    }

    if (item.mimeType?.includes('quicktime')) {
      return 'mov';
    }

    if (item.mimeType?.includes('mp4')) {
      return 'mp4';
    }

    if (item.mimeType?.includes('3gpp')) {
      return '3gp';
    }

    return 'mp4';
  };

  const getRemoteImageSize = async (uri: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        uri,
        (imageWidth, imageHeight) => resolve({ width: imageWidth, height: imageHeight }),
        reject
      );
    });

  const waitForWatermarkRender = async () => {
    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        watermarkReadyResolverRef.current = null;
        resolve();
      };

      watermarkReadyResolverRef.current = finish;
      setTimeout(finish, 800);
    });
  };

  const buildWatermarkedImage = async (item: MediaResource) => {
    const { width: imageWidth, height: imageHeight } = await getRemoteImageSize(item.uri);
    const exportWidth = Math.min(imageWidth, WATERMARK_EXPORT_MAX_WIDTH);
    const exportHeight = Math.max(1, Math.round((imageHeight / imageWidth) * exportWidth));

    setWatermarkTask({
      uri: item.uri,
      width: exportWidth,
      height: exportHeight,
    });

    try {
      await waitForWatermarkRender();
      const captureUri = await watermarkViewShotRef.current?.capture?.();

      if (!captureUri) {
        throw new Error('watermark_capture_failed');
      }

      return captureUri;
    } finally {
      setWatermarkTask(null);
    }
  };

  const saveRegularImageToLibrary = async (item: MediaResource) => {
    const watermarkedUri = await buildWatermarkedImage(item);
    await MediaLibrary.saveToLibraryAsync(watermarkedUri);
  };

  const saveLivePhotoToLibrary = async (item: MediaResource) => {
    if (!item.livePhotoVideoUri) {
      throw new Error('live_photo_video_missing');
    }

    if (Platform.OS !== 'ios' || !LivePhotoSaver?.saveLivePhoto) {
      throw new Error('live_photo_not_supported');
    }

    const timestamp = Date.now();
    const imageFile = await File.downloadFileAsync(
      item.uri,
      new File(Paths.cache, `maoqiu-diary-live-${timestamp}.${getDownloadFileExtension(item)}`)
    );
    const videoFile = await File.downloadFileAsync(
      item.livePhotoVideoUri,
      new File(Paths.cache, `maoqiu-diary-live-${timestamp}.${getLivePhotoVideoExtension(item)}`)
    );

    try {
      await LivePhotoSaver.saveLivePhoto(
        imageFile.uri,
        videoFile.uri,
        '毛球日记',
        `用户：${watermarkUserName}`
      );
    } finally {
      imageFile.delete();
      videoFile.delete();
    }
  };

  const saveVideoToLibrary = async (item: MediaResource) => {
    const timestamp = Date.now();
    const downloadedVideo = await File.downloadFileAsync(
      item.uri,
      new File(Paths.cache, `maoqiu-diary-video-${timestamp}.${getVideoFileExtension(item)}`)
    );

    try {
      if (Platform.OS === 'ios' && LivePhotoSaver?.saveVideo) {
        await LivePhotoSaver.saveVideo(
          downloadedVideo.uri,
          '毛球日记',
          `用户：${watermarkUserName}`
        );
      } else {
        await MediaLibrary.saveToLibraryAsync(downloadedVideo.uri);
      }
    } finally {
      downloadedVideo.delete();
    }
  };

  const handleDownloadMedia = async () => {
    if (!currentItem || !canDownloadCurrentMedia || isSavingMedia) {
      return;
    }

    try {
      setIsSavingMedia(true);

      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert('无法保存', '请先允许毛球日记访问相册，以便保存图片或视频。');
        return;
      }

      if (currentItem.type === 'video') {
        await saveVideoToLibrary(currentItem);
        Alert.alert('保存成功', '视频已保存到系统相册。');
      } else if (currentItem.type === 'livePhoto' && currentItem.livePhotoVideoUri) {
        await saveLivePhotoToLibrary(currentItem);
        Alert.alert('保存成功', '实况图片已保存到系统相册。');
      } else {
        await saveRegularImageToLibrary(currentItem);
        Alert.alert('保存成功', '图片已保存到系统相册。');
      }
    } catch {
      if (currentItem.type === 'video') {
        Alert.alert('保存失败', '下载视频失败，请稍后重试。');
      } else if (currentItem.type === 'livePhoto') {
        Alert.alert('保存失败', '保存实况图片失败，请稍后重试。');
      } else {
        Alert.alert('保存失败', '下载图片失败，请稍后重试。');
      }
    } finally {
      setIsSavingMedia(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.counterText}>
            {media.length ? `${currentIndex + 1} / ${media.length}` : '0 / 0'}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateY: panY }, { scale }] }} {...panResponder.panHandlers}>
          <FlatList
            data={media}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            renderItem={({ item, index }) => (
              <MediaItem
                item={item}
                isFocused={currentIndex === index}
                onZoomStateChange={(zoomed) => {
                  if (currentIndex === index) {
                    setIsZoomed(zoomed);
                  }
                }}
                onLoadStateChange={(loaded) => {
                  if (currentIndex === index) {
                    setIsCurrentMediaReady(loaded);
                  }
                }}
              />
            )}
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

        {showZoomHint ? (
          <View style={styles.zoomHint} pointerEvents="none">
            <Text style={styles.zoomHintText}>双指缩放，双击还原</Text>
          </View>
        ) : null}

        {canDownloadCurrentMedia && isCurrentMediaReady ? (
          <Pressable onPress={handleDownloadMedia} style={styles.floatingDownloadButton} disabled={isSavingMedia}>
            {isSavingMedia ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#FFF" />
            )}
          </Pressable>
        ) : null}

        {watermarkTask ? (
          <View style={styles.hiddenWatermarkContainer} pointerEvents="none">
            <ViewShot
              ref={watermarkViewShotRef}
              options={{ format: 'jpg', quality: 0.95 }}
              style={{ width: watermarkTask.width, height: watermarkTask.height }}
            >
              <View style={[styles.watermarkCanvas, { width: watermarkTask.width, height: watermarkTask.height }]}>
                <Image
                  source={{ uri: watermarkTask.uri }}
                  style={styles.watermarkImage}
                  resizeMode="cover"
                  onLoadEnd={() => watermarkReadyResolverRef.current?.()}
                  onError={() => watermarkReadyResolverRef.current?.()}
                />
                <View
                  style={[
                    styles.watermarkOverlay,
                    {
                      maxWidth: Math.min(Math.max(watermarkTask.width * 0.72, 160), 280),
                    },
                  ]}
                >
                  <Text style={styles.watermarkTitle}>毛球日记</Text>
                  <Text style={styles.watermarkUser}>用户：{watermarkUserName}</Text>
                </View>
              </View>
            </ViewShot>
          </View>
        ) : null}
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
  floatingDownloadButton: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomHintText: {
    color: '#FFF',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hiddenWatermarkContainer: {
    position: 'absolute',
    left: -10000,
    top: -10000,
  },
  watermarkCanvas: {
    backgroundColor: '#000',
  },
  watermarkImage: {
    ...StyleSheet.absoluteFillObject,
  },
  watermarkOverlay: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    minWidth: 120,
    alignItems: 'flex-start',
  },
  watermarkTitle: {
    color: '#FFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    width: '100%',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  watermarkUser: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    width: '100%',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
