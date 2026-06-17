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
const PREVIEW_CARD_WIDTH = Math.min(width - 40, 420);

const withOpacity = (hexColor?: string, opacity: string = '1A') => {
  if (!hexColor || !hexColor.startsWith('#')) {
    return `#FF85A2${opacity}`;
  }

  if (hexColor.length === 7) {
    return `${hexColor}${opacity}`;
  }

  return hexColor;
};

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
  const accentColor = scenario?.color || HEALING_COLORS.pink[500];
  const heroTitle = diary.title?.trim() || scenario?.name || '今日记录';
  const contentText = diary.content?.trim() || '把今天的心情装进一张卡片里。';
  const date = new Date(diary.date || diary.createdAt);
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleShare = async () => {
    try {
      setIsSharing(true);
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
                    aspectRatio: columns === 1 ? 4 / 3 : 1,
                    marginRight: isLastInRow ? 0 : columns === 2 ? '3%' : '2%',
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
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>分享这份心情</Text>
              <Text style={styles.subtitle}>生成一张更适合发给朋友的日记卡片</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardWrapper}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'jpg', quality: 0.9 }}
                style={[styles.viewShotContainer, { width: PREVIEW_CARD_WIDTH }]}
              >
                <View style={styles.card}>
                  <View style={[styles.decorCircleTop, { backgroundColor: withOpacity(accentColor, '22') }]} />
                  <View style={[styles.decorCircleMiddle, { backgroundColor: withOpacity(mood?.primary, '18') }]} />
                  <View style={[styles.decorCircleBottom, { backgroundColor: withOpacity(weather?.primary, '16') }]} />

                  <View style={[styles.heroSection, { backgroundColor: withOpacity(accentColor, '14') }]}>
                    <View style={styles.heroTopRow}>
                      <View style={styles.brandBadge}>
                        <Text style={styles.brandBadgeText}>MAOQIU DIARY</Text>
                      </View>
                      <Text style={styles.heroScenarioIcon}>{scenario?.icon || '🌷'}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { backgroundColor: withOpacity(accentColor, '18') }]}>
                        <Text style={[styles.metaChipText, { color: accentColor }]}>{scenario?.name || '日记'}</Text>
                      </View>
                      <View style={[styles.metaChip, styles.metaChipSoft, styles.metaChipSpacing]}>
                        <Text style={styles.metaChipSoftText}>{mood?.emoji} {mood?.label || '心情'}</Text>
                      </View>
                      <View style={[styles.metaChip, styles.metaChipSoft, styles.metaChipSpacing]}>
                        <Text style={styles.metaChipSoftText}>{weather?.emoji} {weather?.label || '天气'}</Text>
                      </View>
                    </View>

                    <Text style={styles.heroDate}>{formattedDate}</Text>
                    <Text style={styles.diaryTitle}>{heroTitle}</Text>
                    <Text style={styles.heroLead} numberOfLines={2}>
                      今天值得被好好收藏，也值得被温柔分享。
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.contentCard}>
                      <Text style={styles.contentLabel}>TODAY'S NOTE</Text>
                      <Text style={styles.content} numberOfLines={9}>
                        {contentText}
                      </Text>
                    </View>

                    {renderMediaGrid()}

                    {quoteData && (
                      <View style={styles.quoteContainer}>
                        <View style={styles.quoteHeader}>
                          <Ionicons name="sparkles" size={14} color={HEALING_COLORS.pink[500]} />
                          <Text style={styles.quoteLabel}>今日小句子</Text>
                        </View>
                        <Text style={styles.quoteTextZh}>{quoteData.content.zh}</Text>
                        {quoteData.content.en ? (
                          <Text style={styles.quoteTextEn}>{quoteData.content.en}</Text>
                        ) : null}
                        <Text style={styles.quoteAuthor}>
                          —— {quoteData.author.zh || quoteData.author.en || '佚名'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.footerCard}>
                      <View style={styles.footerBadge}>
                        <View style={styles.footerDot} />
                        <Text style={styles.footerBrand}>毛球日记</Text>
                      </View>
                      <Text style={styles.footerText}>把平凡的一天，也分享成闪闪发光的回忆</Text>
                    </View>
                  </View>
                </View>
              </ViewShot>
            </View>
          </ScrollView>

          <View style={styles.bottomActionContainer}>
            <Text style={styles.bottomHint}>保存后可以分享到聊天、朋友圈或社交平台</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing}>
              {isSharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>保存并分享</Text>
                </>
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
    backgroundColor: 'rgba(27, 18, 26, 0.94)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerSpacer: {
    width: 36,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  viewShotContainer: {
    backgroundColor: 'transparent',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF9FB',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircleTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -80,
    right: -50,
  },
  decorCircleMiddle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 140,
    right: -28,
  },
  decorCircleBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -72,
    left: -54,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#A63A68',
  },
  heroScenarioIcon: {
    fontSize: 44,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  metaChipSoft: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  metaChipSpacing: {
    marginLeft: 8,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaChipSoftText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4860',
  },
  heroDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A63A68',
    marginBottom: 10,
  },
  diaryTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1B27',
    marginBottom: 10,
    lineHeight: 36,
  },
  heroLead: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7D556B',
  },
  cardBody: {
    padding: 24,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    shadowColor: '#E8A6C1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 18,
  },
  contentLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#D07097',
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    color: '#4B3A45',
    lineHeight: 29,
    letterSpacing: 0.3,
  },
  gridContainer: {
    marginTop: 4,
    marginBottom: 6,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  quoteContainer: {
    marginTop: 24,
    backgroundColor: '#FFF2F7',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#F9D2E2',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#C85B87',
  },
  quoteTextZh: {
    fontSize: 15,
    color: '#5A4051',
    lineHeight: 25,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  quoteTextEn: {
    fontSize: 12,
    color: '#A47A8E',
    lineHeight: 18,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: '#A47A8E',
    textAlign: 'right',
  },
  footerCard: {
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: '#F7D7E4',
    paddingTop: 18,
    alignItems: 'center',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F9D2E2',
    marginBottom: 10,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: HEALING_COLORS.pink[500],
  },
  footerBrand: {
    fontSize: 12,
    color: '#C85B87',
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    color: '#8B6A7B',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomActionContainer: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  bottomHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginBottom: 10,
  },
  shareBtn: {
    backgroundColor: HEALING_COLORS.pink[500],
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: HEALING_COLORS.pink[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
});
