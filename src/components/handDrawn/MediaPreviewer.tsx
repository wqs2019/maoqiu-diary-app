import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';
import { File, Directory, Paths } from 'expo-file-system';
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
  TouchableOpacity,
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

const formatDuration = (ms: number) => {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AudioWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const waveAnims = useRef(Array.from({ length: 20 }).map(() => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (isPlaying) {
      const animations = waveAnims.map(anim => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: Math.random() * 0.8 + 0.2, duration: 200 + Math.random() * 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.2, duration: 200 + Math.random() * 200, useNativeDriver: true })
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      waveAnims.forEach(anim => {
        Animated.timing(anim, { toValue: 0.2, duration: 200, useNativeDriver: true }).start();
      });
    }
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, gap: 4 }}>
      {waveAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={{
            width: 4,
            height: 40,
            backgroundColor: '#FF85A2',
            borderRadius: 2,
            transform: [{ scaleY: anim }]
          }}
        />
      ))}
    </View>
  );
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
  const [audioStatus, setAudioStatus] = useState({ isPlaying: false, position: 0, duration: item.duration || 0 });
  const [isMediaLoading, setIsMediaLoading] = useState(
    item.type === 'image' || item.type === 'livePhoto' || item.type === 'video' || item.type === 'audio'
  );
  const videoRef = useRef<Video>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    setIsMediaLoading(item.type === 'image' || item.type === 'livePhoto' || item.type === 'video' || item.type === 'audio');
  }, [item.type, item.uri]);

  useEffect(() => {
    if (!isFocused) {
      if (isPlaying) setIsPlaying(false);
      if (audioStatus.isPlaying) {
        videoRef.current?.pauseAsync();
      }
    }
  }, [isFocused, isPlaying, audioStatus.isPlaying]);

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
          ) : item.type === 'audio' ? (
            <View style={[styles.fullScreen, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }]}>
              <Video
                ref={videoRef}
                source={{ uri: item.uri }}
                style={{ width: 0, height: 0 }}
                shouldPlay={isFocused && audioStatus.isPlaying}
                onLoadStart={() => setIsMediaLoading(true)}
                onReadyForDisplay={() => setIsMediaLoading(false)}
                onLoad={() => setIsMediaLoading(false)}
                onError={() => setIsMediaLoading(false)}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    // 只要加载成功，就取消 loading 状态
                    setIsMediaLoading(false);
                    setAudioStatus({
                      isPlaying: status.isPlaying,
                      position: status.positionMillis,
                      duration: status.durationMillis || item.duration || 0,
                    });
                    if (status.didJustFinish) {
                      videoRef.current?.setPositionAsync(0);
                      videoRef.current?.pauseAsync();
                    }
                  }
                }}
              />
              <View style={styles.audioPlayerCard}>
                <TouchableOpacity
                  style={styles.audioPlayButton}
                  onPress={() => {
                    if (audioStatus.isPlaying) {
                      videoRef.current?.pauseAsync();
                    } else {
                      videoRef.current?.playAsync();
                    }
                  }}
                >
                  <Ionicons name={audioStatus.isPlaying ? "pause" : "play"} size={28} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.audioWaveformContainer}>
                  <AudioWaveform isPlaying={audioStatus.isPlaying} />
                </View>

                <Text style={styles.audioTimeText}>
                  {formatDuration(audioStatus.position)} / {formatDuration(audioStatus.duration)}
                </Text>
              </View>
            </View>
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
  const showZoomHint = currentItem?.type === 'image';
  const showLivePhotoHint = currentItem?.type === 'livePhoto';
  const canDownloadCurrentMedia = currentItem?.type === 'image' || currentItem?.type === 'video';// 暂时不允许保存实况照片
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

  const getSaveErrorDetail = (error: unknown, fallback: string) => {
    const knownMessages: Record<string, string> = {
      watermark_capture_failed: '图片水印渲染失败。',
      live_photo_video_missing: '缺少实况视频资源。',
      live_photo_not_supported: '当前设备不支持保存实况图片。',
      invalid_uri: '资源路径无效。',
      missing_file: '资源文件不存在。',
      missing_asset_identifier: '未找到 Live Photo 配对标识，无法保留实况效果。',
      watermark_failed: 'Live Photo 水印渲染失败。',
      write_image_failed: '写入带水印的 Live Photo 图片失败。',
      save_failed: '系统相册保存失败。',
      insert_video_failed: '视频轨道导出准备失败。',
      load_failed: '视频资源加载失败。',
      load_cancelled: '视频资源加载被取消。',
      load_unknown: '视频资源加载状态异常。',
      export_failed: '视频导出失败。',
      export_cancelled: '视频导出已取消。',
      export_unknown: '视频导出失败。',
    };

    const normalizeMessage = (value: unknown) => {
      if (typeof value !== 'string') {
        return undefined;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      return knownMessages[trimmed] || trimmed;
    };

    if (error instanceof Error) {
      return normalizeMessage(error.message) || fallback;
    }

    if (typeof error === 'string') {
      return normalizeMessage(error) || fallback;
    }

    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const userInfo = (record.userInfo && typeof record.userInfo === 'object'
        ? (record.userInfo as Record<string, unknown>)
        : undefined);
      const underlyingError = (userInfo?.NSUnderlyingError && typeof userInfo.NSUnderlyingError === 'object'
        ? (userInfo.NSUnderlyingError as Record<string, unknown>)
        : undefined);

      const message =
        normalizeMessage(record.message) ||
        normalizeMessage(record.localizedDescription) ||
        normalizeMessage(userInfo?.NSLocalizedDescription) ||
        normalizeMessage(underlyingError?.localizedDescription);
      const code = typeof record.code === 'string' ? record.code : undefined;

      if (message && code && !message.includes(code)) {
        return `${message}（${code}）`;
      }

      return message || fallback;
    }

    return fallback;
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
    const isImageLocal = item.uri.startsWith('file://') || item.uri.startsWith('/');
    const isVideoLocal = item.livePhotoVideoUri.startsWith('file://') || item.livePhotoVideoUri.startsWith('/');

    let imageUri = item.uri;
    let videoUri = item.livePhotoVideoUri;
    let imageFile: any = null;
    let videoFile: any = null;

    // 确保下载目录存在
    const cacheDir = new Directory(Paths.cache, 'maoqiu-media-downloads');
    if ((!isImageLocal || !isVideoLocal) && !cacheDir.exists) {
      cacheDir.create();
    }

    if (!isImageLocal) {
      imageFile = await File.downloadFileAsync(
        item.uri,
        new File(cacheDir, `live-img-${timestamp}.${getDownloadFileExtension(item)}`),
        { idempotent: true }
      );
      if (!imageFile.exists) {
        throw new Error('missing_file');
      }
      imageUri = imageFile.uri;
    }

    if (!isVideoLocal) {
      videoFile = await File.downloadFileAsync(
        item.livePhotoVideoUri,
        new File(cacheDir, `live-vid-${timestamp}.${getLivePhotoVideoExtension(item)}`),
        { idempotent: true }
      );
      if (!videoFile.exists) {
        throw new Error('missing_file');
      }
      videoUri = videoFile.uri;
    }

    try {
      await LivePhotoSaver.saveLivePhoto(
        imageUri,
        videoUri,
        '毛球日记',
        `用户：${watermarkUserName}`
      );
    } finally {
      if (imageFile) imageFile.delete();
      if (videoFile) videoFile.delete();
    }
  };

  const saveVideoToLibrary = async (item: MediaResource) => {
    const timestamp = Date.now();
    const isLocal = item.uri.startsWith('file://') || item.uri.startsWith('/');
    
    let videoUri = item.uri;
    let downloadedVideo: any = null;

    if (!isLocal) {
      // 确保下载目录存在
      const cacheDir = new Directory(Paths.cache, 'maoqiu-media-downloads');
      if (!cacheDir.exists) {
        cacheDir.create();
      }
      
      downloadedVideo = await File.downloadFileAsync(
        item.uri,
        new File(cacheDir, `video-${timestamp}.${getVideoFileExtension(item)}`),
        { idempotent: true }
      );
      if (!downloadedVideo.exists) {
        throw new Error('missing_file');
      }
      videoUri = downloadedVideo.uri;
    }

    try {
      if (Platform.OS === 'ios' && LivePhotoSaver?.saveVideo) {
        await LivePhotoSaver.saveVideo(
          videoUri,
          '毛球日记',
          `用户：${watermarkUserName}`
        );
      } else {
        await MediaLibrary.saveToLibraryAsync(videoUri);
      }
    } finally {
      if (downloadedVideo) {
        downloadedVideo.delete();
      }
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
    } catch (error) {
      if (currentItem.type === 'video') {
        Alert.alert('保存失败', getSaveErrorDetail(error, '下载视频失败，请稍后重试。'));
      } else if (currentItem.type === 'livePhoto') {
        Alert.alert('保存失败', getSaveErrorDetail(error, '保存实况图片失败，请稍后重试。'));
      } else {
        Alert.alert('保存失败', getSaveErrorDetail(error, '下载图片失败，请稍后重试。'));
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
        ) : showLivePhotoHint ? (
          <View style={styles.zoomHint} pointerEvents="none">
            <Text style={styles.zoomHintText}>长按图片播放</Text>
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
  audioPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    padding: 16,
    borderRadius: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF85A2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  audioWaveformContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  audioTimeText: {
    color: '#AAA',
    fontSize: 12,
    marginLeft: 12,
    fontVariant: ['tabular-nums'],
  },
});
