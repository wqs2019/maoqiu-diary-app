import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { Diary, ScenarioType, MoodType, WeatherType } from '../../types';

interface ShareCardModalProps {
  visible: boolean;
  diary: Diary;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ visible, diary, onClose }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const scenario = SCENARIO_TEMPLATES[diary.scenario as ScenarioType];
  const mood = getMoodConfig(diary.mood as MoodType);
  const weather = getWeatherConfig(diary.weather as WeatherType);
  const date = new Date(diary.date || diary.createdAt);
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleShare = async () => {
    try {
      setIsSharing(true);
      // Wait for re-render if any
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: '分享日记卡片',
          });
        }
      }
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setIsSharing(false);
      onClose();
    }
  };

  const renderMediaGrid = () => {
    if (!diary.media || diary.media.length === 0) return null;

    const media = diary.media;
    const count = media.length;

    if (count === 1) {
      return (
        <Image
          source={{ uri: media[0].thumbnail || media[0].uri }}
          style={[styles.gridImageFull, { height: 200 }]}
          resizeMode="cover"
        />
      );
    }

    if (count === 2) {
      return (
        <View style={styles.gridRow}>
          <Image source={{ uri: media[0].thumbnail || media[0].uri }} style={styles.gridImageItem} resizeMode="cover" />
          <Image source={{ uri: media[1].thumbnail || media[1].uri }} style={styles.gridImageItem} resizeMode="cover" />
        </View>
      );
    }

    if (count === 3) {
      return (
        <View style={styles.gridContainer}>
          <Image source={{ uri: media[0].thumbnail || media[0].uri }} style={[styles.gridImageFull, { height: 160 }]} resizeMode="cover" />
          <View style={styles.gridRow}>
            <Image source={{ uri: media[1].thumbnail || media[1].uri }} style={styles.gridImageItem} resizeMode="cover" />
            <Image source={{ uri: media[2].thumbnail || media[2].uri }} style={styles.gridImageItem} resizeMode="cover" />
          </View>
        </View>
      );
    }

    // 4 张及以上图片
    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          <Image source={{ uri: media[0].thumbnail || media[0].uri }} style={styles.gridImageItem} resizeMode="cover" />
          <Image source={{ uri: media[1].thumbnail || media[1].uri }} style={styles.gridImageItem} resizeMode="cover" />
        </View>
        <View style={styles.gridRow}>
          <Image source={{ uri: media[2].thumbnail || media[2].uri }} style={styles.gridImageItem} resizeMode="cover" />
          <View style={styles.imageOverlayContainer}>
            <Image source={{ uri: media[3].thumbnail || media[3].uri }} style={styles.gridImageItem} resizeMode="cover" />
            {count > 4 && (
              <View style={styles.overlayTextContainer}>
                <Text style={styles.overlayText}>+{count - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>分享预览</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.cardWrapper}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={styles.viewShotContainer}
            >
              <View style={styles.card}>
                <View style={[styles.cardHeader, { backgroundColor: scenario?.color + '20' }]}>
                  <Text style={styles.scenarioIcon}>{scenario?.icon}</Text>
                  <View style={styles.dateWrap}>
                    <Text style={styles.date}>{formattedDate}</Text>
                    <Text style={styles.weather}>
                      {weather?.emoji} {mood?.emoji}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {diary.title ? <Text style={styles.diaryTitle}>{diary.title}</Text> : null}
                  <Text style={styles.content} numberOfLines={8}>
                    {diary.content}
                  </Text>

                  {renderMediaGrid()}
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>—— 来自毛球日记 ——</Text>
                </View>
              </View>
            </ViewShot>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing}>
            {isSharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>保存 / 分享</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewShotContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  scenarioIcon: {
    fontSize: 44,
    marginRight: 16,
  },
  dateWrap: {
    flex: 1,
  },
  date: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  weather: {
    fontSize: 16,
  },
  cardBody: {
    padding: 24,
  },
  diaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    color: '#555',
    lineHeight: 26,
    marginBottom: 20,
  },
  gridContainer: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridImageFull: {
    width: '100%',
    borderRadius: 12,
  },
  gridImageItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
  },
  imageOverlayContainer: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlayTextContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    backgroundColor: '#fafafa',
  },
  footerText: {
    fontSize: 12,
    color: '#aaa',
    letterSpacing: 2,
  },
  shareBtn: {
    backgroundColor: HEALING_COLORS.pink[500],
    marginHorizontal: 32,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: HEALING_COLORS.pink[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});