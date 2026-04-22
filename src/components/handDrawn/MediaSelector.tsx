import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { DraggableGrid } from 'react-native-draggable-grid';

import { MediaPreviewer } from './MediaPreviewer';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { imageService } from '../../services/imageService';
import { MediaResource } from '../../types';

import { useAppTheme } from '../../hooks/useAppTheme';

interface MediaSelectorProps {
  media: MediaResource[];
  onMediaChange: (media: MediaResource[]) => void;
  maxCount?: number;
  hideHeader?: boolean;
  draggable?: boolean;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  media,
  onMediaChange,
  maxCount = 9,
  hideHeader = false,
  draggable = false,
}) => {
  const isUploading = useRef(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const { isDark } = useAppTheme();

  // 重试上传单个媒体
  const retryUpload = async (index: number) => {
    const item = media[index];
    if (!item) return;

    // 设置为 loading 状态
    const updatedMedia = [...media];
    updatedMedia[index] = {
      ...item,
      uploadStatus: 'loading',
      uploadError: undefined,
    };
    onMediaChange(updatedMedia);

    try {
      console.log(`[MediaUpload] Retrying upload for media at index ${index}`);

      // 生成唯一的云存储路径（上传到 diary 目录）
      const extension = item.mimeType?.split('/')[1] || 'jpg';
      const pathResult = await imageService.generateCloudPath(extension, 'diary');
      const cloudPath = pathResult.data.cloudPath;

      // 上传到云端（传递 mimeType 用于智能压缩）
      const uploadResult = await imageService.uploadImage(item.uri, cloudPath, item.mimeType);

      let thumbnailUrl = item.thumbnail;
        let uploadedLivePhotoVideoUri = item.livePhotoVideoUri;

        // 如果是视频且有本地封面图，也需要上传封面图
        if (item.type === 'video' && item.thumbnail?.startsWith('file://')) {
          try {
            const thumbPathResult = await imageService.generateCloudPath('jpg', 'diary');
            const thumbUploadResult = await imageService.uploadImage(
              item.thumbnail,
              thumbPathResult.data.cloudPath,
              'image/jpeg'
            );
            if (thumbUploadResult.success && thumbUploadResult.data) {
              thumbnailUrl = thumbUploadResult.data.url;
            }
          } catch (e) {
            console.warn('Failed to upload video thumbnail on retry:', e);
          }
        }

        // 如果是实况照片且包含本地视频路径，也需要上传对应的视频
        if (item.type === 'livePhoto' && item.livePhotoVideoUri?.startsWith('file://')) {
          try {
            const videoPathResult = await imageService.generateCloudPath('mov', 'diary');
            const videoUploadResult = await imageService.uploadImage(
              item.livePhotoVideoUri,
              videoPathResult.data.cloudPath,
              'video/quicktime'
            );
            if (videoUploadResult.success && videoUploadResult.data) {
              uploadedLivePhotoVideoUri = videoUploadResult.data.url;
            }
          } catch (e) {
            console.warn('Failed to upload live photo video on retry:', e);
          }
        }

        if (uploadResult.success && uploadResult.data) {
          console.log(`[MediaUpload] Retry success: ${uploadResult.data.url}`);
          // 更新成功的媒体
          const successMedia = [...media];
          successMedia[index] = {
            ...item,
            uri: uploadResult.data.url,
            thumbnail: thumbnailUrl,
            livePhotoVideoUri: uploadedLivePhotoVideoUri,
            uploadStatus: 'success',
            uploadError: undefined,
          };
          onMediaChange(successMedia);
        } else {
        throw new Error(uploadResult.message || '上传失败');
      }
    } catch (error: any) {
      console.error('[MediaUpload] Retry failed:', error);
      // 更新错误信息
      const failMedia = [...media];
      failMedia[index] = {
        ...item,
        uploadStatus: 'fail',
        uploadError: error.message || '上传失败',
      };
      onMediaChange(failMedia);
    }
  };

  const showMediaOptions = () => {
    Alert.alert('选择媒体', '请选择要添加的内容', [
      {
        text: '📷 照片',
        onPress: () => pickImages(),
      },
      {
        text: '🎬 视频',
        onPress: () => pickVideo(),
      },
      {
        text: '取消',
        style: 'cancel',
      },
    ]);
  };

  // 上传单个媒体到云端（带重试）
  const uploadMediaItem = async (item: MediaResource, retryCount = 1): Promise<MediaResource> => {
    let currentTry = 0;
    while (currentTry < retryCount) {
      try {
        console.log(`[MediaUpload] Uploading ${item.type} (Try ${currentTry + 1}/${retryCount})`);

        const extension = item.mimeType?.split('/')[1] || (item.type === 'video' ? 'mp4' : 'jpg');
        const pathResult = await imageService.generateCloudPath(extension, 'diary');
        const cloudPath = pathResult.data.cloudPath;

        const uploadResult = await imageService.uploadImage(item.uri, cloudPath, item.mimeType);

        let thumbnailUrl = item.thumbnail;
        let uploadedLivePhotoVideoUri = item.livePhotoVideoUri;

        // 如果是视频且有本地封面图，也需要上传封面图
        if (item.type === 'video' && item.thumbnail?.startsWith('file://')) {
          try {
            const thumbPathResult = await imageService.generateCloudPath('jpg', 'diary');
            const thumbUploadResult = await imageService.uploadImage(
              item.thumbnail,
              thumbPathResult.data.cloudPath,
              'image/jpeg'
            );
            if (thumbUploadResult.success && thumbUploadResult.data) {
              thumbnailUrl = thumbUploadResult.data.url;
            }
          } catch (e) {
            console.warn('Failed to upload video thumbnail:', e);
          }
        }

        // 如果是实况照片且包含本地视频路径，也需要上传对应的视频
        if (item.type === 'livePhoto' && item.livePhotoVideoUri?.startsWith('file://')) {
          try {
            const videoPathResult = await imageService.generateCloudPath('mov', 'diary');
            const videoUploadResult = await imageService.uploadImage(
              item.livePhotoVideoUri,
              videoPathResult.data.cloudPath,
              'video/quicktime'
            );
            if (videoUploadResult.success && videoUploadResult.data) {
              uploadedLivePhotoVideoUri = videoUploadResult.data.url;
            }
          } catch (e) {
            console.warn('Failed to upload live photo video:', e);
          }
        }

        if (uploadResult.success && uploadResult.data) {
          return {
            ...item,
            uri: uploadResult.data.url,
            thumbnail: thumbnailUrl,
            livePhotoVideoUri: uploadedLivePhotoVideoUri,
            uploadStatus: 'success',
            uploadError: undefined,
          };
        } else {
          throw new Error(uploadResult.message || '上传失败');
        }
      } catch (error: any) {
        currentTry++;
        console.error(`[MediaUpload] Upload failed (Try ${currentTry}/${retryCount}):`, error);
        if (currentTry >= retryCount) {
          return {
            ...item,
            uploadStatus: 'fail',
            uploadError: error.message || '上传失败',
          };
        }
      }
    }
    return {
      ...item,
      uploadStatus: 'fail',
      uploadError: '超出最大重试次数',
    };
  };

  // 批量上传媒体到云端
  const uploadAllMedia = async (mediaList: MediaResource[]): Promise<MediaResource[]> => {
    const uploadedMedia: MediaResource[] = [];

    for (let i = 0; i < mediaList.length; i++) {
      const item = mediaList[i];
      console.log(`[MediaUpload] Processing media ${i + 1}/${mediaList.length}`);

      const uploadedItem = await uploadMediaItem(item);
      uploadedMedia.push(uploadedItem); // 总是添加，即使失败也保留
    }

    return uploadedMedia;
  };

  const pickImages = async () => {
    if (media.length >= maxCount) {
      Alert.alert('提示', `最多只能上传 ${maxCount} 个媒体文件`);
      return;
    }

    const remainingCount = maxCount - media.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'livePhotos'],
      allowsMultipleSelection: true,
      selectionLimit: remainingCount,
      quality: 0.8,
      // 必须开启此选项，ImagePicker 才会将 Live Photo 的视频部分抽离并返回 livePhotoVideoUri / pairedVideoAsset
      allowsEditing: false, 
      exif: false,
    });

    if (!result.canceled && result.assets) {
      console.log('[MediaSelector] pickImages result assets:', JSON.stringify(result.assets, null, 2));
      // 先添加本地媒体（带 loading 状态）
      const localMedia: MediaResource[] = result.assets.map((asset) => {
        // Expo ImagePicker 17.0+ 中，如果指定了 livePhotos 并且未经过 allowsEditing 处理，
        // 会返回 `pairedVideoAsset` 包含对应的视频。
        // 为了兼容不同的返回格式，我们同时检查 pairedVideoAsset 和 livePhotoVideoUri
        const pairedVideo = (asset as any).pairedVideoAsset;
        const liveVideoUri = pairedVideo?.uri || (asset as any).livePhotoVideoUri;
        const isLivePhoto = !!liveVideoUri;
        
        return {
          type: isLivePhoto ? 'livePhoto' : 'image',
          uri: asset.uri,
          size: asset.fileSize ?? undefined,
          mimeType: asset.mimeType ?? undefined,
          livePhotoVideoUri: liveVideoUri,
        };
      });

      // 合并到现有媒体
      const allMedia = [...media, ...localMedia];
      onMediaChange(allMedia);

      // 上传到云端
      isUploading.current = true;

      // 设置为 loading 状态
      const loadingMedia: MediaResource[] = allMedia.map((m, idx) => {
        if (idx >= media.length) {
          return {
            ...m,
            uploadStatus: 'loading',
          };
        }
        return m;
      });
      onMediaChange(loadingMedia);

      const uploadedMedia = await uploadAllMedia(localMedia);

      // 替换已上传的媒体（保持顺序）
      const finalMedia: MediaResource[] = allMedia.map((m, idx) => {
        if (idx >= media.length) {
          // 这是新上传的媒体
          const uploadedIdx = idx - media.length;
          const uploadedItem = uploadedMedia[uploadedIdx];
          if (uploadedItem) {
            return {
              ...uploadedItem,
              uploadStatus: uploadedItem.uploadError ? 'fail' : 'success',
            };
          }
        }
        return m;
      });

      onMediaChange(finalMedia);
      isUploading.current = false;
    }
  };

  const pickVideo = async () => {
    if (media.length >= maxCount) {
      Alert.alert('提示', `最多只能上传 ${maxCount} 个媒体文件`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];

      let thumbnailUri = undefined;
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 1000,
        });
        thumbnailUri = uri;
      } catch (e) {
        console.warn('Failed to generate video thumbnail:', e);
      }

      const localMedia: MediaResource = {
        type: 'video',
        uri: asset.uri,
        thumbnail: thumbnailUri,
        duration: asset.duration ?? undefined,
        size: asset.fileSize ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        uploadStatus: 'loading',
      };

      // 先添加本地媒体
      const allMedia = [...media, localMedia];
      onMediaChange(allMedia);

      // 上传到云端
      isUploading.current = true;

      const uploadedMedia = await uploadAllMedia([localMedia]);

      // 替换为已上传的媒体
      const finalMedia = allMedia.map((m, idx) => {
        if (idx === allMedia.length - 1) {
          return uploadedMedia[0] || m;
        }
        return m;
      });

      onMediaChange(finalMedia);
      isUploading.current = false;
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    onMediaChange(newMedia);
  };

  const renderMediaPreview = (item: MediaResource, originalIndex: number) => {
    const isUploading = item.uploadStatus === 'loading';
    const isFailed = item.uploadStatus === 'fail';

    // Calculate current index in the media array
    const currentIndex = media.findIndex((m) => m.uri === item.uri);

    return (
      <View
        key={item.uri}
        style={[
          styles.mediaItem,
          isFailed && styles.mediaItemFailed,
          isUploading && styles.mediaItemUploading,
        ]}
      >
        {item.type === 'image' || item.type === 'livePhoto' ? (
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: item.uri }}
              style={[
                styles.mediaThumbnail,
                isFailed && styles.mediaThumbnailFailed,
                isUploading && styles.mediaThumbnailUploading,
              ]}
            />
            {item.type === 'livePhoto' && (
              <View style={styles.livePhotoBadge}>
                <Ionicons name="aperture" size={12} color="#FFF" />
                <Text style={styles.livePhotoText}>实况</Text>
              </View>
            )}
          </View>
        ) : item.type === 'video' ? (
          <View style={styles.videoThumbnail}>
            <Image
              source={{ uri: item.thumbnail || item.uri }}
              style={[
                styles.mediaThumbnail,
                isFailed && styles.mediaThumbnailFailed,
                isUploading && styles.mediaThumbnailUploading,
              ]}
            />
            <View style={styles.videoDurationBadge}>
              <Ionicons name="time" size={12} color="#FFF" />
              <Text style={styles.videoDurationText}>{formatDuration(item.duration || 0)}</Text>
            </View>
            <View style={styles.videoIconOverlay}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        ) : null}

        {/* Loading 状态显示在封面中央 */}
        {isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {/* 删除按钮 */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            removeMedia(currentIndex);
          }}
        >
          <Ionicons name="close-circle" size={24} color="#FF4444" />
        </TouchableOpacity>

        {/* 重试按钮（仅失败时显示） */}
        {isFailed && (
          <TouchableOpacity style={styles.retryButton} onPress={() => retryUpload(currentIndex)}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* 类型标识 */}
        <View style={styles.mediaTypeBadge}>
          <Text style={styles.mediaTypeText}>
            {item.type === 'image' ? '📷' : item.type === 'video' ? '🎬' : '📹'}
          </Text>
        </View>

        {/* 上传失败提示 */}
        {isFailed && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>上传失败</Text>
          </View>
        )}
      </View>
    );
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const gridData = React.useMemo(() => {
    const data = media.map((item, index) => ({
      ...item,
      // 使用唯一的 uri 作为 key，而不是 index，防止重排时组件卸载重建
      key: item.uri,
      disabledDrag: !draggable,
      disabledReSorted: !draggable,
    }));

    if (media.length < maxCount) {
      data.push({
        key: 'add-button',
        isAddButton: true,
        disabledDrag: true,
        disabledReSorted: true,
      } as any);
    }
    return data;
  }, [media, maxCount]);

  const renderGridItem = (item: any, index: number) => {
    if (item.isAddButton) {
      return (
        <View style={styles.gridItemContainer} key={item.key}>
          <View
            style={[styles.addButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: isDark ? '#333' : '#E5E5E5' }, isUploading.current && styles.addButtonDisabled]}
          >
            <Ionicons name="add-circle-outline" size={32} color={isDark ? '#AAA' : HEALING_COLORS.pink[500]} />
            <Text style={[styles.addButtonText, { color: isDark ? '#AAA' : '#999' }]}>添加媒体</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.gridItemContainer} key={item.key}>
        {renderMediaPreview(item, index)}
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderBottomColor: isDark ? '#333' : '#F5F5F5' }]}>
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isDark ? '#AAA' : '#666' }]}>媒体附件</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#888' : '#999' }]}>
              （最多{maxCount}个{draggable && media.length > 1 ? '，长按可拖动排序' : ''}）
            </Text>
          </View>
          <Text style={[styles.count, { color: isDark ? '#888' : '#999' }]}>
            {media.length}/{maxCount}
          </Text>
        </View>
      )}

      <DraggableGrid
        numColumns={3}
        data={gridData}
        renderItem={renderGridItem}
        itemHeight={120}
        delayLongPress={200}
        onItemPress={(item: any) => {
          if (item.isAddButton) {
            if (!isUploading.current) {
              showMediaOptions();
            }
          } else {
            const isUploadingItem = item.uploadStatus === 'loading';
            const isFailed = item.uploadStatus === 'fail';
            if (!isUploadingItem && !isFailed) {
              const currentIndex = media.findIndex((m) => m.uri === item.uri);
              if (currentIndex >= 0) {
                setPreviewIndex(currentIndex);
                setPreviewVisible(true);
              }
            }
          }
        }}
        onDragRelease={(newData) => {
          const newMedia = newData.filter((i: any) => !i.isAddButton).map((i: any) => {
            const { key, isAddButton, disabledDrag, disabledReSorted, ...rest } = i;
            return rest;
          });
          onMediaChange(newMedia as MediaResource[]);
        }}
      />

      <MediaPreviewer
        visible={previewVisible}
        media={media.filter((m) => m.uploadStatus !== 'loading' && m.uploadStatus !== 'fail')}
        initialIndex={Math.max(
          0,
          media
            .filter((m) => m.uploadStatus !== 'loading' && m.uploadStatus !== 'fail')
            .findIndex((m) => m.uri === media[previewIndex]?.uri)
        )}
        onClose={() => {
          setPreviewVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  count: {
    fontSize: 12,
    color: '#999',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItemContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaItem: {
    width: 115,
    height: 115,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  mediaItemFailed: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  mediaItemUploading: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: HEALING_COLORS.pink[300],
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  mediaThumbnailFailed: {
    opacity: 0.5,
  },
  mediaThumbnailUploading: {
    opacity: 0.6,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIconOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
  },
  livePhotoBadge: {
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
  livePhotoText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  retryButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  successBadge: {
    position: 'absolute',
    top: 4,
    right: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    padding: 2,
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,68,68,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  mediaTypeText: {
    fontSize: 12,
  },
  addButton: {
    width: 115,
    height: 115,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: HEALING_COLORS.pink[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,230,235,0.3)',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 12,
    color: HEALING_COLORS.pink[500],
    marginTop: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});
