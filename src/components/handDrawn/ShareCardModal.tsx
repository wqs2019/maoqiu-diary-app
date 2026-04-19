import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import ViewShot from 'react-native-view-shot';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { getRandomQuote, Quote } from '../../services/quote';
import { Diary } from '../../types';

interface ShareCardModalProps {
  visible: boolean;
  diary: Diary;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ visible, diary, onClose }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [quoteData, setQuoteData] = useState<Quote | null>(null);

  useEffect(() => {
    if (visible) {
      getRandomQuote().then(setQuoteData).catch(console.error);
    } else {
      setQuoteData(null);
    }
  }, [visible]);

  const scenario = SCENARIO_TEMPLATES[diary.scenario];
  const mood = getMoodConfig(diary.mood);
  const weather = getWeatherConfig(diary.weather);
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

    // 根据数量决定列数
    const getColumns = () => {
      if (count === 1) return 1;
      if (count === 2 || count === 4) return 2;
      return 3;
    };

    const columns = getColumns();

    return (
      <View style={styles.gridContainer}>
        <View style={styles.mediaGrid}>
          {media.map((item, index) => {
            const isLastInRow = (index + 1) % columns === 0;
            const isLastRow = Math.floor(index / columns) === Math.floor((count - 1) / columns);
            
            return (
              <View
                key={index}
                style={[
                  styles.mediaWrapper,
                  {
                    width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '32%',
                    aspectRatio: columns === 1 ? 4/3 : 1,
                    marginRight: isLastInRow ? 0 : (columns === 2 ? '3%' : '2%'),
                    marginBottom: isLastRow ? 0 : 8,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.thumbnail || item.uri }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              </View>
            );
          })}
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

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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

                    {quoteData && (
                      <View style={styles.quoteContainer}>
                        <Ionicons name="leaf" size={16} color="#CBD5E1" style={styles.quoteIcon} />
                        <Text style={styles.quoteTextZh}>{quoteData.content.zh}</Text>
                        {quoteData.content.en ? (
                          <Text style={styles.quoteTextEn}>{quoteData.content.en}</Text>
                        ) : null}
                        <Text style={styles.quoteAuthor}>—— {quoteData.author.zh || quoteData.author.en || '佚名'}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>—— 来自毛球日记 ——</Text>
                  </View>
                </View>
              </ViewShot>
            </View>
          </ScrollView>

          <View style={styles.bottomActionContainer}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing}>
              {isSharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shareBtnText}>保存 / 分享</Text>
              )}
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scenarioIcon: {
    fontSize: 48,
    marginRight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dateWrap: {
    flex: 1,
  },
  date: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  weather: {
    fontSize: 16,
  },
  cardBody: {
    padding: 24,
    paddingBottom: 32,
  },
  diaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 16,
    lineHeight: 32,
  },
  content: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 28,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  gridContainer: {
    marginTop: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quoteContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 8,
    left: -4,
    opacity: 0.5,
  },
  quoteTextZh: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 6,
    fontStyle: 'italic',
    paddingLeft: 14,
  },
  quoteTextEn: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 8,
    paddingLeft: 14,
  },
  quoteAuthor: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
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
  bottomActionContainer: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  shareBtn: {
    backgroundColor: HEALING_COLORS.pink[500],
    paddingVertical: 14,
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
