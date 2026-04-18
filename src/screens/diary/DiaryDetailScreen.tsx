import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';

import { MediaPreviewer } from '../../components/handDrawn/MediaPreviewer';
import { ShareCardModal } from '../../components/handDrawn/ShareCardModal';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { useDiaryDetail, useDeleteDiary, useToggleFavorite } from '../../hooks/useDiaryQuery';

type DiaryDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DiaryDetailRouteProp>();
  const { _id } = route.params;

  const { data: diary, isLoading, error } = useDiaryDetail(_id);
  const deleteMutation = useDeleteDiary();
  const toggleFavorite = useToggleFavorite();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const handleToggleFavorite = async () => {
    if (!diary) return;
    try {
      await toggleFavorite(_id, !!diary.isFavorite);
    } catch (e) {
      Alert.alert('提示', '操作失败，请重试');
    }
  };

  const handleShare = () => {
    if (!diary) return;
    setShareModalVisible(true);
  };

  const handleDelete = () => {
    Alert.alert('删除日记', '确定要删除这篇日记吗？此操作无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(_id, {
            onSuccess: () => {
              // 移除多余的二次弹窗确认，直接返回上一页体验更顺滑
              navigation.goBack();
            },
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error || !diary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>日记加载失败</Text>
      </View>
    );
  }

  const scenario = SCENARIO_TEMPLATES[diary.scenario];
  const mood = getMoodConfig(diary.mood);
  const weather = getWeatherConfig(diary.weather);
  const date = new Date(diary.date || diary.createdAt);
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 安全检查：确保配置存在
  if (!scenario || !mood || !weather) {
    console.error(
      '[DiaryDetail] Invalid data - scenario:',
      !!scenario,
      'mood:',
      !!mood,
      'weather:',
      !!weather
    );
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>数据格式错误</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 头部场景信息 */}
      <View style={[styles.header, { backgroundColor: scenario.color + '15' }]}>
        <View style={styles.headerContent}>
          <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
          <Text style={styles.scenarioName}>{scenario.name}</Text>
        </View>
      </View>

      {/* 标题 */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{diary.title}</Text>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteBtn}>
            <Ionicons
              name={diary.isFavorite ? 'star' : 'star-outline'}
              size={28}
              color={diary.isFavorite ? '#FFD700' : '#CCC'}
            />
          </TouchableOpacity>
        </View>
        {diary.location && (
          <View style={styles.locationTag}>
            <Ionicons name="location" size={16} color={HEALING_COLORS.pink[400]} />
            <Text style={styles.locationText}>{diary.location}</Text>
          </View>
        )}
      </View>

      {/* 时间和元信息 */}
      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaEmoji}>{mood.emoji}</Text>
            <Text style={[styles.metaLabel, { color: mood.primary }]}>{mood.label}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaEmoji}>{weather.emoji}</Text>
            <Text style={[styles.metaLabel, { color: weather.primary }]}>{weather.label}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={18} color="#999" />
            <Text style={styles.metaLabel}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      {/* 分隔线 */}
      <View style={styles.divider} />

      {/* 内容 */}
      <View style={styles.contentSection}>
        <Text style={styles.content}>{diary.content}</Text>
      </View>

      {/* 媒体附件 */}
      {diary.media && diary.media.length > 0 && (
        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>📷 精彩瞬间</Text>
          <View style={styles.mediaGrid}>
            {diary.media.map((media, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => {
                  setPreviewIndex(index);
                  setPreviewVisible(true);
                }}
                style={[
                  styles.mediaItem,
                  { width: `${Math.floor(100 / Math.min(diary.media?.length || 0, 3)) - 4}%` },
                ]}
              >
                <Image
                  source={{ uri: media.thumbnail || media.uri }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                {media.type === 'video' && (
                  <View style={styles.mediaTypeOverlay}>
                    <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
                  </View>
                )}
                {media.type === 'livePhoto' && (
                  <View style={styles.livePhotoBadge}>
                    <Text style={styles.livePhotoText}>LIVE</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 媒体预览 */}
      {diary.media && diary.media.length > 0 && (
        <MediaPreviewer
          visible={previewVisible}
          media={diary.media}
          initialIndex={previewIndex}
          onClose={() => {
            setPreviewVisible(false);
          }}
        />
      )}

      {/* 操作按钮 */}
      <View style={styles.actionSection}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={HEALING_COLORS.pink[400]} />
            <Text style={styles.actionButtonText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditDiary', { diaryId: _id })}
          >
            <Ionicons name="create-outline" size={24} color={HEALING_COLORS.pink[400]} />
            <Text style={styles.actionButtonText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* 分享卡片弹窗 */}
      <ShareCardModal
        visible={shareModalVisible}
        diary={diary}
        onClose={() => {
          setShareModalVisible(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  scenarioIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  favoriteBtn: {
    padding: 4,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  metaSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  metaEmoji: {
    fontSize: 24,
    marginRight: 6,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 28,
    color: '#333',
    textAlignVertical: 'top',
  },
  mediaSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mediaItem: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaTypeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  livePhotoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  livePhotoText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
});

export default DiaryDetailScreen;
