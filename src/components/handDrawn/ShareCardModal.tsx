import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useToast } from '../common/Toast';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { getMoodConfig, getWeatherConfig } from '../../config/statusConfig';
import { Diary } from '../../types';
import { getThumbnailUrl } from '../../utils/image';

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

type ShareCardTheme = {
  gradient: [string, string, string];
  heroEyebrow: string;
  heroLead: string;
  posterTitle: string;
  posterSubtitle: string;
};

const DEFAULT_SHARE_CARD_THEME: ShareCardTheme = {
  gradient: ['#FFF9FB', '#FFF2F7', '#FFFDFE'],
  heroEyebrow: '',
  heroLead: '',
  posterTitle: '',
  posterSubtitle: '',
};

const SHARE_CARD_THEMES: Record<string, ShareCardTheme> = {
  daily: {
    gradient: ['#FFF8FB', '#FFEAF2', '#FFFDFD'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  travel: {
    gradient: ['#F6FCFF', '#EAF7FF', '#FFFDFB'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  movie: {
    gradient: ['#FFF7FB', '#F7F0FF', '#FFFDFE'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  outing: {
    gradient: ['#F8FFF9', '#EEFBF1', '#FFFDFC'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  food: {
    gradient: ['#FFF9F2', '#FFF1DE', '#FFFDFC'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  special: {
    gradient: ['#FFF8FF', '#F5EDFF', '#FFFDFE'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  learning: {
    gradient: ['#F7F8FF', '#EEF1FF', '#FFFDFE'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
  inspiration: {
    gradient: ['#FFFDF2', '#FFF8D9', '#FFFDFB'],
    heroEyebrow: '',
    heroLead: '',
    posterTitle: '',
    posterSubtitle: '',
  },
};

const getShareCardTheme = (scenarioType?: string): ShareCardTheme =>
  (scenarioType && SHARE_CARD_THEMES[scenarioType]) || DEFAULT_SHARE_CARD_THEME;

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ visible, diary, onClose }) => {
  const exportViewShotRef = useRef<ViewShot>(null);
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const scenario = SCENARIO_TEMPLATES[diary.scenario];
  const mood = getMoodConfig(diary.mood);
  const weather = getWeatherConfig(diary.weather);
  const accentColor = scenario?.color || HEALING_COLORS.pink[500];
  
  const themeKey = scenario?.type || diary.scenario || 'default';
  const shareTheme = {
    gradient: getShareCardTheme(themeKey).gradient,
    heroEyebrow: t(`shareCard.themes.${themeKey}.heroEyebrow`, { defaultValue: t('shareCard.themes.default.heroEyebrow') }),
    heroLead: t(`shareCard.themes.${themeKey}.heroLead`, { defaultValue: t('shareCard.themes.default.heroLead') }),
    posterTitle: t(`shareCard.themes.${themeKey}.posterTitle`, { defaultValue: t('shareCard.themes.default.posterTitle') }),
    posterSubtitle: t(`shareCard.themes.${themeKey}.posterSubtitle`, { defaultValue: t('shareCard.themes.default.posterSubtitle') }),
  };

  const heroTitle = diary.title?.trim() || scenario?.name || t('shareCard.defaultTitle');
  const contentText = diary.content?.trim() || t('shareCard.defaultContent');
  const singleMedia = diary.media?.length === 1 ? diary.media[0] : null;
  const posterMetaLine = [scenario?.name, mood?.label, weather?.label].filter(Boolean).join(' · ');
  const date = new Date(diary.date || diary.createdAt);
  const formattedDate = date.toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const exportCardImage = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const uri = await exportViewShotRef.current?.capture?.();
    if (!uri) {
      throw new Error('share_card_capture_failed');
    }

    return uri;
  };

  const handleSaveImage = async () => {
    let shouldCloseAfterSave = false;

    try {
      setIsSavingImage(true);
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.error(t('shareCard.alerts.permissionDenied'));
        return;
      }

      const uri = await exportCardImage();
      await MediaLibrary.saveToLibraryAsync(uri);
      shouldCloseAfterSave = true;
    } catch (e) {
      console.error('Save share card error:', e);
      toast.error(t('shareCard.alerts.saveFailed'));
    } finally {
      setIsSavingImage(false);
      if (shouldCloseAfterSave) {
        onClose();
        setTimeout(() => {
          toast.success(t('shareCard.alerts.saveSuccess'));
        }, 250);
      }
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const uri = await exportCardImage();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: t('shareCard.dialogTitle'),
        });
      }
    } catch (e) {
      console.error('Share error:', e);
      toast.error(t('shareCard.alerts.shareFailed'));
    } finally {
      setIsSharing(false);
      onClose();
    }
  };

  const renderMediaGrid = () => {
    if (!diary.media || diary.media.length === 0 || diary.media.length === 1) return null;

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
                  source={{ uri: getThumbnailUrl(item.thumbnail || item.uri, 300, 300) }}
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

  const renderHeroMedia = () => {
    if (!singleMedia) return null;

    return (
      <View style={styles.heroMediaCard}>
        <Image
          source={{ uri: getThumbnailUrl(singleMedia.thumbnail || singleMedia.uri, 800, 800) }}
          style={styles.heroMediaImage}
          resizeMode="cover"
        />
        <View style={styles.heroMediaOverlay} />
        {singleMedia.type === 'video' && (
          <View style={styles.heroVideoBadge}>
            <Ionicons name="play-circle" size={16} color="#FFF" />
            <Text style={styles.heroVideoBadgeText}>{t('shareCard.videoClip')}</Text>
          </View>
        )}
        {singleMedia.type === 'livePhoto' && (
          <View style={styles.heroVideoBadge}>
            <Ionicons name="aperture" size={14} color="#FFF" />
            <Text style={styles.heroVideoBadgeText}>{t('shareCard.livePhoto')}</Text>
          </View>
        )}
        <View style={styles.heroMediaCopy}>
          <Text style={styles.heroMediaEyebrow}>{shareTheme.heroEyebrow}</Text>
          <Text style={styles.heroMediaSubline} numberOfLines={1}>
            {posterMetaLine || t('shareCard.fromApp')}
          </Text>
        </View>
      </View>
    );
  };

  const renderShareCard = (withRadius: boolean) => (
    <View style={[styles.card, !withRadius && styles.exportNoRadius]}>
      <View style={styles.gradientLayer}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="shareCardGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={shareTheme.gradient[0]} />
              <Stop offset="58%" stopColor={shareTheme.gradient[1]} />
              <Stop offset="100%" stopColor={shareTheme.gradient[2]} />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#shareCardGradient)" />
        </Svg>
      </View>
      <View style={[styles.decorCircleTop, { backgroundColor: withOpacity(accentColor, '22') }]} />
      <View style={[styles.decorCircleMiddle, { backgroundColor: withOpacity(mood?.primary, '18') }]} />
      <View style={[styles.decorCircleBottom, { backgroundColor: withOpacity(weather?.primary, '16') }]} />

      <View
        style={[
          styles.heroSection,
          {
            backgroundColor: withOpacity(accentColor, '14'),
            borderBottomColor: withOpacity(accentColor, '1E'),
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>MAOQIU DIARY</Text>
          </View>
          <Text style={styles.heroScenarioIcon}>{scenario?.icon || '🌷'}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: withOpacity(accentColor, '18') }]}>
            <Text style={[styles.metaChipText, { color: accentColor }]}>{scenario?.name || t('shareCard.defaultScenario')}</Text>
          </View>
          <View style={[styles.metaChip, styles.metaChipSoft, styles.metaChipSpacing]}>
            <Text style={styles.metaChipSoftText}>{mood?.emoji} {mood?.label || t('shareCard.defaultMood')}</Text>
          </View>
          <View style={[styles.metaChip, styles.metaChipSoft, styles.metaChipSpacing]}>
            <Text style={styles.metaChipSoftText}>{weather?.emoji} {weather?.label || t('shareCard.defaultWeather')}</Text>
          </View>
        </View>

        <Text style={styles.heroDate}>{formattedDate}</Text>
        <Text style={styles.diaryTitle}>{heroTitle}</Text>
        <Text style={styles.heroLead} numberOfLines={2}>
          {shareTheme.heroLead}
        </Text>

        {renderHeroMedia()}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>TODAY'S NOTE</Text>
          <Text style={styles.content} numberOfLines={3}>
            {contentText}
          </Text>
        </View>

        {renderMediaGrid()}

        <View style={styles.footerCard}>
          <View style={styles.posterFooterTop}>
            <View style={styles.footerBadge}>
              <View style={styles.footerDot} />
              <Text style={styles.footerBrand}>{t('shareCard.appName')}</Text>
            </View>
            <Text style={styles.posterFooterMeta}>{posterMetaLine || t('shareCard.slogan')}</Text>
          </View>
          <Text style={styles.posterFooterTitle}>{shareTheme.posterTitle}</Text>
          <Text style={styles.posterFooterSubtitle}>{shareTheme.posterSubtitle}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View pointerEvents="none" style={styles.hiddenCaptureContainer}>
            <ViewShot
              ref={exportViewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={[styles.viewShotContainer, styles.hiddenCaptureCard, { width: PREVIEW_CARD_WIDTH }]}
            >
              {renderShareCard(false)}
            </ViewShot>
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>{t('shareCard.title')}</Text>
              <Text style={styles.subtitle}>{t('shareCard.subtitle')}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardWrapper}>
              <View style={[styles.viewShotContainer, { width: PREVIEW_CARD_WIDTH }]}>
                {renderShareCard(true)}
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomActionContainer}>
            <Text style={styles.bottomHint}>{t('shareCard.bottomHint')}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, (isSavingImage || isSharing) && styles.buttonDisabled]}
                onPress={handleSaveImage}
                disabled={isSavingImage || isSharing}
              >
                {isSavingImage ? (
                  <ActivityIndicator color={HEALING_COLORS.pink[500]} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={HEALING_COLORS.pink[500]} />
                    <Text style={styles.secondaryBtnText}>{t('shareCard.saveImage')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, (isSavingImage || isSharing) && styles.buttonDisabled]}
                onPress={handleShare}
                disabled={isSavingImage || isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>{t('shareCard.shareImage')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  hiddenCaptureContainer: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  hiddenCaptureCard: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  exportNoRadius: {
    borderRadius: 0,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    marginBottom: 8,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
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
    marginBottom: 6,
  },
  diaryTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1B27',
    marginBottom: 6,
    lineHeight: 36,
  },
  heroLead: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7D556B',
  },
  heroMediaCard: {
    marginTop: 12,
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  heroMediaImage: {
    width: '100%',
    height: '100%',
  },
  heroMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 20, 32, 0.20)',
  },
  heroVideoBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.68)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroVideoBadgeText: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroMediaCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroMediaEyebrow: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMediaSubline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
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
    marginBottom: 5,
  },
  content: {
    fontSize: 14,
    color: '#4B3A45',
    lineHeight: 24,
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
  footerCard: {
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: '#F7D7E4',
    paddingTop: 18,
    alignItems: 'stretch',
  },
  posterFooterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  posterFooterMeta: {
    flex: 1,
    marginLeft: 10,
    textAlign: 'right',
    fontSize: 11,
    color: '#B08699',
    fontWeight: '600',
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
  posterFooterTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: '#37242F',
    marginBottom: 6,
  },
  posterFooterSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#9D7287',
    marginBottom: 10,
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
  actionRow: {
    flexDirection: 'row',
    columnGap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFF7FA',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: withOpacity(HEALING_COLORS.pink[500], '55'),
  },
  secondaryBtnText: {
    color: HEALING_COLORS.pink[500],
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  shareBtn: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
});
