import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ScrollView as RNScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width } = Dimensions.get('window');
const FEATURE_CARD_WIDTH = width - 64;
const FEATURE_CARD_GAP = 10;
const FEATURE_SNAP_INTERVAL = FEATURE_CARD_WIDTH + FEATURE_CARD_GAP;
const USER_AGREEMENT_URL = 'https://wqs2019.github.io/maoqiu-diary-app/terms.html';
const PRIVACY_POLICY_URL = 'https://wqs2019.github.io/maoqiu-diary-app/privacy.html';
const APP_STORE_URL = 'https://apps.apple.com/cn/app/%E6%AF%9B%E7%90%83%E6%97%A5%E8%AE%B0/id6759290118';
const APP_STORE_LOOKUP_URL = 'https://itunes.apple.com/lookup?id=6759290118&country=cn';
const APP_VERSION = Constants.expoConfig?.version || Constants.nativeAppVersion || '';

const compareVersions = (currentVersion: string, targetVersion: string) => {
  const currentParts = String(currentVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const targetParts = String(targetVersion || '0')
    .split('.')
    .map((part) => Number(part) || 0);
  const maxLength = Math.max(currentParts.length, targetParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const current = currentParts[index] || 0;
    const target = targetParts[index] || 0;

    if (current > target) {
      return 1;
    }

    if (current < target) {
      return -1;
    }
  }

  return 0;
};

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isFeatureAutoPlayPaused, setIsFeatureAutoPlayPaused] = useState(false);
  const featureScrollRef = useRef<RNScrollView>(null);
  const appVersion = APP_VERSION || t('aboutScreen.unknownVersion');
  const FEATURE_CARDS = [
    {
      key: 'diary',
      icon: 'edit-3' as const,
      eyebrow: t('aboutScreen.cards.diary.eyebrow'),
      title: t('aboutScreen.cards.diary.title'),
      description: t('aboutScreen.cards.diary.description'),
      highlights: t('aboutScreen.cards.diary.highlights', { returnObjects: true }) as string[],
      accent: HEALING_COLORS.pink[500],
      background: HEALING_COLORS.pink[50],
    },
    {
      key: 'circle',
      icon: 'globe' as const,
      eyebrow: t('aboutScreen.cards.circle.eyebrow'),
      title: t('aboutScreen.cards.circle.title'),
      description: t('aboutScreen.cards.circle.description'),
      highlights: t('aboutScreen.cards.circle.highlights', { returnObjects: true }) as string[],
      accent: '#8B5CF6',
      background: '#F5F3FF',
    },
    {
      key: 'ai',
      icon: 'message-circle' as const,
      eyebrow: t('aboutScreen.cards.ai.eyebrow'),
      title: t('aboutScreen.cards.ai.title'),
      description: t('aboutScreen.cards.ai.description'),
      highlights: t('aboutScreen.cards.ai.highlights', { returnObjects: true }) as string[],
      accent: '#14B8A6',
      background: '#F0FDFA',
    },
    {
      key: 'shared',
      icon: 'heart' as const,
      eyebrow: t('aboutScreen.cards.shared.eyebrow'),
      title: t('aboutScreen.cards.shared.title'),
      description: t('aboutScreen.cards.shared.description'),
      highlights: t('aboutScreen.cards.shared.highlights', { returnObjects: true }) as string[],
      accent: '#F59E0B',
      background: '#FFFBEB',
    },
  ];

  const handleFeatureScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / FEATURE_SNAP_INTERVAL);
    setActiveFeatureIndex(nextIndex);
  };

  useEffect(() => {
    if (FEATURE_CARDS.length <= 1 || isFeatureAutoPlayPaused) return;

    const timer = setInterval(() => {
      setActiveFeatureIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % FEATURE_CARDS.length;
        featureScrollRef.current?.scrollTo({
          x: nextIndex * FEATURE_SNAP_INTERVAL,
          animated: true,
        });
        return nextIndex;
      });
    }, 3200);

    return () => clearInterval(timer);
  }, [isFeatureAutoPlayPaused]);

  const handleCheckUpdate = async () => {
    try {
      const response = await fetch(APP_STORE_LOOKUP_URL);

      if (!response.ok) {
        throw new Error(t('aboutScreen.updateErrors.appStoreUnavailable'));
      }

      const result = await response.json();
      const latestVersion = result?.results?.[0]?.version?.trim();

      if (!latestVersion) {
        Alert.alert(t('aboutScreen.updateErrors.checkTitle'), t('aboutScreen.updateErrors.noStoreInfo'));
        return;
      }

      if (compareVersions(appVersion, latestVersion) < 0) {
        Alert.alert(
          t('aboutScreen.updateErrors.newVersionTitle'),
          t('aboutScreen.updateErrors.newVersionMessage', { current: appVersion, latest: latestVersion }),
          [
            { text: t('aboutScreen.updateErrors.later'), style: 'cancel' },
            { text: t('aboutScreen.updateErrors.updateNow'), onPress: () => Linking.openURL(APP_STORE_URL) },
          ]
        );
        return;
      }

      Alert.alert(t('aboutScreen.updateErrors.checkTitle'), t('aboutScreen.updateErrors.latestVersion', { current: appVersion }));
    } catch (error: any) {
      Alert.alert(t('aboutScreen.updateErrors.checkFailed'), error?.message || t('aboutScreen.updateErrors.checkFailedFallback'));
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFF' : HEALING_COLORS.gray[800]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
          {t('aboutScreen.headerTitle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        indicatorStyle={isDark ? 'white' : 'black'}
      >
        <View style={styles.logoSection}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: isDark ? '#333' : currentHealingColors.pink[50],
                borderColor: isDark ? '#1E1E1E' : '#FFFFFF',
                shadowColor: isDark ? '#000' : currentHealingColors.pink[400],
              },
            ]}
          >
            <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={[styles.appName, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
            {t('aboutScreen.appName')}
          </Text>
          <Text style={[styles.versionText, { color: isDark ? '#888' : HEALING_COLORS.gray[400] }]}>
            {`Version ${appVersion}`}
          </Text>

          <View
            style={[
              styles.sloganContainer,
              {
                backgroundColor: isDark ? '#2C1B24' : currentHealingColors.pink[50],
                borderColor: isDark ? '#4A2533' : currentHealingColors.pink[100],
              },
            ]}
          >
            <Text
              style={[
                styles.sloganText,
                { color: isDark ? currentHealingColors.pink[400] : currentHealingColors.pink[600] },
              ]}
            >
              {t('aboutScreen.sloganTitle')}
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              {t('aboutScreen.sloganDesc1')}
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              {t('aboutScreen.sloganDesc2')}
            </Text>
          </View>

          <View style={styles.featureSection}>
            <View style={styles.featureSectionHeader}>
              <Text style={[styles.featureTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
                {t('aboutScreen.featureTitle')}
              </Text>
              <Text
                style={[
                  styles.featureSubtitle,
                  { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[500] },
                ]}
              >
                {t('aboutScreen.featureSubtitle')}
              </Text>
            </View>

            <ScrollView
              ref={featureScrollRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              snapToInterval={FEATURE_SNAP_INTERVAL}
              snapToAlignment="start"
              onTouchStart={() => setIsFeatureAutoPlayPaused(true)}
              onTouchEnd={() => setIsFeatureAutoPlayPaused(false)}
              onTouchCancel={() => setIsFeatureAutoPlayPaused(false)}
              onScrollBeginDrag={() => setIsFeatureAutoPlayPaused(true)}
              onScrollEndDrag={() => setIsFeatureAutoPlayPaused(false)}
              onMomentumScrollEnd={handleFeatureScrollEnd}
              contentContainerStyle={styles.featureCarouselContent}
            >
              {FEATURE_CARDS.map((card) => (
                <View
                  key={card.key}
                  style={[
                    styles.featureCard,
                    {
                      width: FEATURE_CARD_WIDTH,
                      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                      borderColor: isDark ? '#333' : currentHealingColors.pink[100],
                      shadowColor: isDark ? '#000' : card.accent,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureCardGlow,
                      { backgroundColor: isDark ? '#2A2A2A' : card.background },
                    ]}
                  />
                  <View style={styles.featureCardHeader}>
                    <View
                      style={[
                        styles.featureIconWrap,
                        { backgroundColor: isDark ? `${card.accent}22` : card.background },
                      ]}
                    >
                      <Feather name={card.icon} size={20} color={card.accent} />
                    </View>
                    <View style={styles.featureHeaderText}>
                      <Text style={[styles.featureEyebrow, { color: card.accent }]}>
                        {card.eyebrow}
                      </Text>
                      <Text
                        style={[
                          styles.featureCardTitle,
                          { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] },
                        ]}
                      >
                        {card.title}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.featureDescription,
                      { color: isDark ? '#D1D5DB' : HEALING_COLORS.gray[600] },
                    ]}
                  >
                    {card.description}
                  </Text>

                  <View style={styles.featureTagRow}>
                    {card.highlights.map((highlight) => (
                      <View
                        key={highlight}
                        style={[
                          styles.featureTag,
                          {
                            backgroundColor: isDark ? '#2A2A2A' : `${card.accent}12`,
                            borderColor: isDark ? '#3A3A3A' : `${card.accent}22`,
                          },
                        ]}
                      >
                        <Text style={[styles.featureTagText, { color: card.accent }]}>
                          {highlight}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.featureDots}>
              {FEATURE_CARDS.map((card, index) => (
                <View
                  key={card.key}
                  style={[
                    styles.featureDot,
                    {
                      width: index === activeFeatureIndex ? 18 : 7,
                      backgroundColor:
                        index === activeFeatureIndex
                          ? currentHealingColors.pink[500]
                          : isDark
                          ? '#4B5563'
                          : currentHealingColors.gray[300],
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.menuSection,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : currentHealingColors.pink[100],
              borderRadius: themeStyle.borderRadius,
              shadowColor: isDark ? '#000' : themeStyle.shadowColor,
              shadowOpacity: isDark ? 0.3 : themeStyle.shadowOpacity * 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.menuItem,
              styles.menuItemBorder,
              { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[50] },
            ]}
            onPress={() => Linking.openURL(APP_STORE_URL)}
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              {t('aboutScreen.rateApp')}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.menuItem,
              styles.menuItemBorder,
              { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[50] },
            ]}
            onPress={handleCheckUpdate}
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              {t('aboutScreen.checkUpdate')}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.menuItem,
              styles.menuItemBorder,
              { borderBottomColor: isDark ? '#333' : currentHealingColors.pink[50] },
            ]}
            onPress={() =>
              (navigation as any).navigate('Web', {
                url: USER_AGREEMENT_URL,
                title: t('aboutScreen.userAgreement'),
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              {t('aboutScreen.userAgreement')}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              (navigation as any).navigate('Web', {
                url: PRIVACY_POLICY_URL,
                title: t('aboutScreen.privacyPolicy'),
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              {t('aboutScreen.privacyPolicy')}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? '#888' : HEALING_COLORS.gray[400]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#666' : HEALING_COLORS.gray[400] }]}>
            {t('aboutScreen.copyright')}
          </Text>
          <Text style={[styles.footerText, { color: isDark ? '#666' : HEALING_COLORS.gray[400] }]}>
            Copyright © 2026 Maoqiu Studio.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: HEALING_COLORS.gray[800],
  },
  scrollView: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: HEALING_COLORS.pink[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: HEALING_COLORS.pink[400],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 66,
    height: 66,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: HEALING_COLORS.gray[800],
    marginBottom: 4,
  },
  versionText: {
    fontSize: 13,
    color: HEALING_COLORS.gray[400],
    fontWeight: '600',
    marginBottom: 18,
  },
  sloganContainer: {
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE0E6',
  },
  sloganText: {
    fontSize: 15,
    fontWeight: '700',
    color: HEALING_COLORS.pink[600],
    marginBottom: 10,
  },
  sloganSubText: {
    fontSize: 13,
    color: HEALING_COLORS.gray[600],
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 6,
  },
  featureSection: {
    width: '100%',
    marginTop: 20,
  },
  featureSectionHeader: {
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  featureCarouselContent: {
    paddingVertical: 4,
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    marginRight: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  featureCardGlow: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.85,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featureHeaderText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  featureEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureCardTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'left',
    marginBottom: 14,
  },
  featureTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  featureDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  featureDot: {
    height: 6,
    borderRadius: 999,
    marginHorizontal: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: HEALING_COLORS.gray[100],
  },
  menuItemText: {
    fontSize: 15,
    color: HEALING_COLORS.gray[800],
    fontWeight: '600',
  },
  footer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: HEALING_COLORS.gray[400],
    marginTop: 4,
  },
});

export default AboutScreen;
