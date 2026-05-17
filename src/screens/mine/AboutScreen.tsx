import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ScrollView as RNScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width } = Dimensions.get('window');
const FEATURE_CARD_WIDTH = width - 64;
const FEATURE_CARD_GAP = 10;
const FEATURE_SNAP_INTERVAL = FEATURE_CARD_WIDTH + FEATURE_CARD_GAP;

const FEATURE_CARDS = [
  {
    key: 'diary',
    icon: 'edit-3' as const,
    eyebrow: '记录此刻',
    title: '写日记',
    description: '把开心、委屈、灵感和那些说不出口的情绪，都安静地留在自己的时光手账里。',
    highlights: ['图文混排', '心情天气', '分类整理'],
    accent: HEALING_COLORS.pink[500],
    background: HEALING_COLORS.pink[50],
  },
  {
    key: 'circle',
    icon: 'globe' as const,
    eyebrow: '看看世界',
    title: '逛圈子',
    description: '遇见更多真实的生活切片，在别人的故事里得到共鸣，也把自己的温柔分享出去。',
    highlights: ['公开日记', '互动点赞', '发现同频'],
    accent: '#8B5CF6',
    background: '#F5F3FF',
  },
  {
    key: 'ai',
    icon: 'message-circle' as const,
    eyebrow: '随时陪伴',
    title: 'AI问答',
    description: '当你想倾诉、想被理解，或只是想有人陪你聊聊，AI 会温柔地接住你的情绪。',
    highlights: ['情绪陪伴', '灵感启发', '即时回应'],
    accent: '#14B8A6',
    background: '#F0FDFA',
  },
  {
    key: 'shared',
    icon: 'heart' as const,
    eyebrow: '共同书写',
    title: '共享日记本',
    description: '邀请恋人、家人或好友一起记录生活，把那些双向奔赴的日常，写成只属于你们的回忆。',
    highlights: ['双人记录', '专属空间', '共同回忆'],
    accent: '#F59E0B',
    background: '#FFFBEB',
  },
];

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isFeatureAutoPlayPaused, setIsFeatureAutoPlayPaused] = useState(false);
  const featureScrollRef = useRef<RNScrollView>(null);

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
          关于毛球
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
            毛球日记
          </Text>
          <Text style={[styles.versionText, { color: isDark ? '#888' : HEALING_COLORS.gray[400] }]}>
            Version 1.0.0
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
              「收集日常里微小而确定的幸福」
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              毛球日记是一个温暖的树洞，也是你专属的时光手账。你可以记录情绪、保存灵感，也能把日常片段认真珍藏起来。
            </Text>
            <Text
              style={[styles.sloganSubText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}
            >
              你也可以逛圈子、和 AI 聊天，或邀请恋人、家人一起写共享日记，让陪伴和回忆都有地方安放。🐾✨
            </Text>
          </View>

          <View style={styles.featureSection}>
            <View style={styles.featureSectionHeader}>
              <Text style={[styles.featureTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
                功能亮点
              </Text>
              <Text
                style={[
                  styles.featureSubtitle,
                  { color: isDark ? '#9CA3AF' : HEALING_COLORS.gray[500] },
                ]}
              >
                4 个核心功能，轻轻一滑就能了解
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
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              ✨ 去应用市场给毛球好评
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
                url: 'https://www.xieyimao.com/doc/detailzh/token/1772109293_4012',
                title: '用户服务协议',
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              📄 用户服务协议
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
                url: 'https://www.xieyimao.com/doc/detailzh/token/1772108718_2251',
                title: '隐私保护政策',
              })
            }
          >
            <Text
              style={[styles.menuItemText, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
            >
              🔒 隐私保护政策
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
            毛球工作室 版权所有
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
