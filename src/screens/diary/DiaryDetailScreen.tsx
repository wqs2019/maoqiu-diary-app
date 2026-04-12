import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useDiaryDetail, useDeleteDiary } from '../../hooks/useDiaryQuery';
import { MoodType, WeatherType } from '../../types';

type DiaryDetailRouteProp = RouteProp<{ params: { _id: string } }, 'params'>;

const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string; color: string }> = {
  happy: { emoji: '😊', label: '开心', color: '#FFD60A' },
  excited: { emoji: '🤩', label: '兴奋', color: '#FF6B9D' },
  relaxed: { emoji: '😌', label: '轻松', color: '#34C759' },
  touched: { emoji: '🥺', label: '感动', color: '#AF52DE' },
  normal: { emoji: '😐', label: '平静', color: '#8E8E93' },
  sad: { emoji: '😢', label: '难过', color: '#5AC8FA' },
  angry: { emoji: '😠', label: '生气', color: '#FF3B30' },
};

const WEATHER_CONFIG: Record<WeatherType, { emoji: string; label: string; color: string }> = {
  sunny: { emoji: '☀️', label: '晴', color: '#FFD60A' },
  cloudy: { emoji: '☁️', label: '阴', color: '#8E8E93' },
  rainy: { emoji: '🌧️', label: '雨', color: '#5AC8FA' },
  snowy: { emoji: '❄️', label: '雪', color: '#B6E8FF' },
  windy: { emoji: '💨', label: '风', color: '#A8E6A8' },
  foggy: { emoji: '🌫️', label: '雾', color: '#D4EDD4' },
};

const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<DiaryDetailRouteProp>();
  const { _id } = route.params;

  const { data: diary, isLoading, error } = useDiaryDetail(_id);
  const deleteMutation = useDeleteDiary();

  const handleShare = async () => {
    if (!diary) return;
    try {
      await Share.share({
        message: `${diary.title}\n\n${diary.content}\n\n—— 来自毛球日记`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
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
  const mood = MOOD_CONFIG[diary.mood];
  const weather = WEATHER_CONFIG[diary.weather];
  const date = new Date(diary.createdAt);
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
        <Text style={styles.title}>{diary.title}</Text>
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
            <Text style={[styles.metaLabel, { color: mood.color }]}>{mood.label}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaEmoji}>{weather.emoji}</Text>
            <Text style={[styles.metaLabel, { color: weather.color }]}>{weather.label}</Text>
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
              <View
                key={index}
                style={[
                  styles.mediaItem,
                  { width: `${Math.floor(100 / Math.min(diary.media?.length || 0, 3)) - 4}%` },
                ]}
              >
                <Image source={{ uri: media.uri }} style={styles.mediaImage} resizeMode="cover" />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 操作按钮 */}
      <View style={styles.actionSection}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={HEALING_COLORS.pink[400]} />
            <Text style={styles.actionButtonText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
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
