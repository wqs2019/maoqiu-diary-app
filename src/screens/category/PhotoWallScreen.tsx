import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';

import { MediaPreviewer } from '../../components/handDrawn/MediaPreviewer';
import { LoadableImage } from '../../components/handDrawn/PhotoWall';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryList } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';
import { ScenarioType, MediaResource } from '../../types';

const { width } = Dimensions.get('window');
const SPACING = 8;
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

// 生成稳定的伪随机高度来模拟瀑布流效果
const getStableHeight = (uri: string) => {
  const hash = uri.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const heights = [ITEM_WIDTH, ITEM_WIDTH * 1.2, ITEM_WIDTH * 1.5, ITEM_WIDTH * 0.8];
  return heights[hash % heights.length];
};

interface PhotoItem extends MediaResource {
  diaryId: string;
  diaryTitle: string;
}

const PhotoWallScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { scenario } = route.params || {};
  const { isDark } = useAppTheme();

  const user = useAuthStore((state) => state.user);
  const userId = user?._id;

  const { data, isLoading, refetch, isRefetching } = useDiaryList({
    page: 1,
    pageSize: 1000, // 瀑布流尽量取全量数据
    scenario: scenario === 'all' ? undefined : scenario,
    userId,
  });

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const allMedia = useMemo(() => {
    const mediaList: PhotoItem[] = [];
    data?.list?.forEach((d) => {
      if (d.media) {
        d.media.forEach((m) => {
          mediaList.push({
            ...m,
            diaryId: d._id,
            diaryTitle: d.title || '无标题日记',
          });
        });
      }
    });
    return mediaList;
  }, [data?.list]);

  const { leftColumn, rightColumn } = useMemo(() => {
    const left: { item: PhotoItem; index: number; height: number }[] = [];
    const right: { item: PhotoItem; index: number; height: number }[] = [];

    let leftHeight = 0;
    let rightHeight = 0;

    allMedia.forEach((item, index) => {
      const h = getStableHeight(item.uri);
      if (leftHeight <= rightHeight) {
        left.push({ item, index, height: h });
        leftHeight += h;
      } else {
        right.push({ item, index, height: h });
        rightHeight += h;
      }
    });

    return { leftColumn: left, rightColumn: right };
  }, [allMedia]);

  const scenarioName =
    scenario === 'all' || !scenario
      ? '全部记录'
      : SCENARIO_TEMPLATES[scenario as ScenarioType]?.name || '记录';

  const handlePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const renderMediaItem = (itemData: { item: PhotoItem; index: number; height: number }) => {
    const { item, index, height } = itemData;
    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.8}
        onPress={() => {
          handlePreview(index);
        }}
        style={[
          styles.mediaCard,
          {
            height,
            backgroundColor: isDark ? '#1E1E1E' : '#FFF',
            shadowColor: isDark ? '#000' : '#000',
          },
        ]}
      >
        <LoadableImage
          source={{ uri: item.thumbnail || item.uri }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
        {item.type === 'video' && (
          <View style={styles.mediaOverlay}>
            <Ionicons name="play" size={24} color="#FFF" />
          </View>
        )}
        {item.type === 'livePhoto' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}

        {/* 日记标题 */}
        <View style={styles.diaryTitleBadge}>
          <Text style={styles.diaryTitleText} numberOfLines={1}>
            {item.diaryTitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#121212' : '#FFF',
            borderBottomColor: isDark ? '#333' : '#F3F4F6',
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#FFF' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111827' }]}>
          {scenarioName} - 时光相册
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        indicatorStyle={isDark ? 'white' : 'black'}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={HEALING_COLORS.pink[400]}
          />
        }
      >
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={HEALING_COLORS.pink[400]} />
          </View>
        ) : allMedia.length > 0 ? (
          <View style={styles.masonryContainer}>
            <View style={styles.column}>{leftColumn.map(renderMediaItem)}</View>
            <View style={styles.column}>{rightColumn.map(renderMediaItem)}</View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={isDark ? '#444' : '#D1D5DB'} />
            <Text style={[styles.emptyText, { color: isDark ? '#888' : '#9CA3AF' }]}>
              这里空空如也，快去记录吧
            </Text>
          </View>
        )}
      </ScrollView>

      {allMedia.length > 0 && (
        <MediaPreviewer
          visible={previewVisible}
          media={allMedia}
          initialIndex={previewIndex}
          onClose={() => {
            setPreviewVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  masonryContainer: {
    flexDirection: 'row',
    padding: SPACING,
    gap: SPACING,
  },
  column: {
    flex: 1,
    gap: SPACING,
  },
  mediaCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  diaryTitleBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '80%',
  },
  diaryTitleText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default PhotoWallScreen;
