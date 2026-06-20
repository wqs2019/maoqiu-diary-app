import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BADGES_CONFIG, BadgeConfig } from '../../config/badgesConfig';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryStats } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const BADGE_GRID_GAP = 14;
const BADGE_ITEM_WIDTH = Math.floor((width - 40 - BADGE_GRID_GAP) / 2);

const BadgesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { isDark } = useAppTheme();
  const surfaceColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const pageBackgroundColor = isDark ? '#121212' : '#FFF8FB';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(236,72,153,0.12)';
  const primaryTextColor = isDark ? '#F5F5F5' : '#1F2937';
  const secondaryTextColor = isDark ? '#A1A1AA' : '#6B7280';
  const tertiaryTextColor = isDark ? '#71717A' : '#9CA3AF';

  // 获取解锁的徽章列表
  const { unlockedBadges, isLoading } = useDiaryStats(user?._id);
  const collectedBadgeIds = unlockedBadges || [];
  const unlockedBadgeList = BADGES_CONFIG.filter((badge) => collectedBadgeIds.includes(badge.id));
  const lockedBadgeList = BADGES_CONFIG.filter((badge) => !collectedBadgeIds.includes(badge.id));
  const progress = BADGES_CONFIG.length > 0 ? collectedBadgeIds.length / BADGES_CONFIG.length : 0;

  // 弹窗状态
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);

  const handleBadgePress = (badge: BadgeConfig) => {
    setSelectedBadge(badge);
  };

  const closeBadgeModal = () => {
    setSelectedBadge(null);
  };

  const formatBadgeDate = (badgeId: string) => {
    const rawDate = user?.unlockedBadges?.[badgeId];
    if (!rawDate) {
      return '';
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString();
  };

  const renderBadgeCard = (badge: BadgeConfig, isUnlocked: boolean) => (
    <TouchableOpacity
      key={badge.id}
      style={[
        styles.badgeCard,
        {
          backgroundColor: isUnlocked
            ? surfaceColor
            : isDark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.72)',
          borderColor: isUnlocked ? badge.color + (isDark ? '55' : '26') : borderColor,
          shadowColor: isUnlocked ? badge.color : isDark ? '#000' : HEALING_COLORS.gray[300],
          shadowOpacity: isUnlocked ? (isDark ? 0.24 : 0.14) : 0.06,
          elevation: isUnlocked ? 4 : 1,
        },
      ]}
      activeOpacity={0.82}
      onPress={() => {
        handleBadgePress(badge);
      }}
      accessibilityRole="button"
      accessibilityLabel={`查看徽章 ${badge.name} 详情`}
    >
      <View style={styles.badgeCardTopRow}>
        <View
          style={[
            styles.badgeIconWrap,
            {
              backgroundColor: isUnlocked
                ? badge.color + (isDark ? '33' : '18')
                : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F4F4F5',
            },
          ]}
        >
          <Text style={[styles.badgeIcon, !isUnlocked && styles.badgeIconLocked]}>{badge.icon}</Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: isUnlocked
                ? badge.color + (isDark ? '22' : '14')
                : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F3F4F6',
            },
          ]}
        >
          <Feather
            name={isUnlocked ? 'check-circle' : 'lock'}
            size={12}
            color={isUnlocked ? badge.color : tertiaryTextColor}
          />
          <Text
            style={[
              styles.statusChipText,
              { color: isUnlocked ? badge.color : tertiaryTextColor },
            ]}
          >
            {isUnlocked ? '已点亮' : '待解锁'}
          </Text>
        </View>
      </View>

      <Text style={[styles.badgeName, { color: primaryTextColor }]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text
        style={[styles.badgeDescription, { color: isUnlocked ? secondaryTextColor : tertiaryTextColor }]}
        numberOfLines={3}
      >
        {badge.description}
      </Text>

      <View
        style={[
          styles.badgeFooter,
          { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,41,55,0.08)' },
        ]}
      >
        <Text style={[styles.badgeFooterText, { color: secondaryTextColor }]}>
          {isUnlocked ? formatBadgeDate(badge.id) || '已加入收藏' : '点击查看解锁条件'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderStateCard = () => (
    <View
      style={[
        styles.stateCard,
        {
          backgroundColor: surfaceColor,
          borderColor,
          shadowColor: isDark ? '#000' : HEALING_COLORS.pink[300],
        },
      ]}
    >
      <View
        style={[
          styles.stateIconWrap,
          { backgroundColor: isDark ? 'rgba(236,72,153,0.16)' : HEALING_COLORS.pink[50] },
        ]}
      >
        <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
      </View>
      <Text style={[styles.stateTitle, { color: primaryTextColor }]}>正在整理你的徽章墙</Text>
      <Text style={[styles.stateDescription, { color: secondaryTextColor }]}>
        我们正在统计你的成就记录，马上就好。
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: pageBackgroundColor },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)',
                  borderColor,
                },
              ]}
              onPress={() => {
                navigation.goBack();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="返回上一页"
            >
              <Feather name="chevron-left" size={22} color={primaryTextColor} />
            </TouchableOpacity>

            <View
              style={[
                styles.headerPill,
                {
                  backgroundColor: isDark ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.86)',
                  borderColor,
                },
              ]}
            >
              <Feather name="award" size={14} color={HEALING_COLORS.pink[500]} />
              <Text style={[styles.headerPillText, { color: primaryTextColor }]}>
                {collectedBadgeIds.length} / {BADGES_CONFIG.length}
              </Text>
            </View>
          </View>

          <View style={styles.headerTextBlock}>
            <Text style={[styles.eyebrow, { color: HEALING_COLORS.pink[500] }]}>Achievement Wall</Text>
            <Text style={[styles.headerTitle, { color: primaryTextColor }]}>我的徽章</Text>
            <Text style={[styles.headerSubtitle, { color: secondaryTextColor }]}>
              你的每一次记录、坚持与探索，都会慢慢点亮这面属于自己的成就墙。
            </Text>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: surfaceColor,
                borderColor,
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[300],
              },
            ]}
          >
            <View style={styles.heroHeader}>
              <View
                style={[
                  styles.heroIconWrap,
                  { backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : HEALING_COLORS.pink[50] },
                ]}
              >
                <Feather name="award" size={18} color={HEALING_COLORS.pink[500]} />
              </View>
              <Text style={[styles.heroTitle, { color: primaryTextColor }]}>成就总览</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>{collectedBadgeIds.length}</Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>已点亮</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>{lockedBadgeList.length}</Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>待解锁</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: isDark ? '#232326' : '#FFF6FA' }]}>
                <Text style={[styles.statValue, { color: primaryTextColor }]}>
                  {Math.round(progress * 100)}%
                </Text>
                <Text style={[styles.statLabel, { color: secondaryTextColor }]}>完成进度</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressTrackBase,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(236,72,153,0.12)' },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(progress * 100, collectedBadgeIds.length > 0 ? 8 : 0)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>{renderStateCard()}</View>
        ) : (
          <>
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>已点亮徽章</Text>
                  <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>
                    已经达成的里程碑，会在这里闪闪发光。
                  </Text>
                </View>
                <View
                  style={[
                    styles.sectionCountChip,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : HEALING_COLORS.pink[50] },
                  ]}
                >
                  <Text style={[styles.sectionCountText, { color: HEALING_COLORS.pink[600] }]}>
                    {unlockedBadgeList.length} 枚
                  </Text>
                </View>
              </View>

              {unlockedBadgeList.length > 0 ? (
                <View style={styles.badgesGrid}>{unlockedBadgeList.map((badge) => renderBadgeCard(badge, true))}</View>
              ) : (
                <View
                  style={[
                    styles.emptySectionCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor,
                    },
                  ]}
                >
                  <Feather name="award" size={20} color={HEALING_COLORS.pink[400]} />
                  <Text style={[styles.emptySectionTitle, { color: primaryTextColor }]}>还没有点亮的徽章</Text>
                  <Text style={[styles.emptySectionText, { color: secondaryTextColor }]}>
                    先写下第一篇日记，你的徽章墙就会开始发光。
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>待解锁徽章</Text>
                  <Text style={[styles.sectionSubtitle, { color: secondaryTextColor }]}>
                    继续记录生活，这些成就会逐步被你收入囊中。
                  </Text>
                </View>
                <View
                  style={[
                    styles.sectionCountChip,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' },
                  ]}
                >
                  <Text style={[styles.sectionCountText, { color: secondaryTextColor }]}>
                    {lockedBadgeList.length} 枚
                  </Text>
                </View>
              </View>

              <View style={styles.badgesGrid}>{lockedBadgeList.map((badge) => renderBadgeCard(badge, false))}</View>
            </View>
          </>
        )}
      </ScrollView>

      {/* 徽章详情弹窗 */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={closeBadgeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: surfaceColor,
                borderColor,
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[300],
              },
            ]}
          >
            {selectedBadge && (
              <>
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeBadgeModal}>
                  <Feather name="x" size={22} color={secondaryTextColor} />
                </TouchableOpacity>

                <View
                  style={[
                    styles.modalIconContainer,
                    collectedBadgeIds.includes(selectedBadge.id)
                      ? { backgroundColor: selectedBadge.color + (isDark ? '33' : '18') }
                      : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalBadgeIcon,
                      !collectedBadgeIds.includes(selectedBadge.id) && styles.badgeIconLocked,
                    ]}
                  >
                    {selectedBadge.icon}
                  </Text>
                </View>

                <Text style={[styles.modalBadgeName, { color: primaryTextColor }]}>
                  {selectedBadge.name}
                </Text>

                <View
                  style={[
                    styles.modalStatusContainer,
                    {
                      backgroundColor: collectedBadgeIds.includes(selectedBadge.id)
                        ? selectedBadge.color + (isDark ? '22' : '14')
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : '#F3F4F6',
                    },
                  ]}
                >
                  {collectedBadgeIds.includes(selectedBadge.id) ? (
                    <Text style={[styles.modalStatusText, { color: selectedBadge.color }]}>
                      已获得{formatBadgeDate(selectedBadge.id) ? ` · ${formatBadgeDate(selectedBadge.id)}` : ''}
                    </Text>
                  ) : (
                    <Text style={[styles.modalStatusText, { color: tertiaryTextColor }]}>
                      尚未获得
                    </Text>
                  )}
                </View>

                <Text style={[styles.modalBadgeDesc, { color: secondaryTextColor }]}>
                  {selectedBadge.description}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerPillText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTextBlock: {
    marginTop: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  headerSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  heroCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: -4,
  },
  statItem: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 84,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: 16,
  },
  progressTrackBase: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: HEALING_COLORS.pink[500],
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  stateCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  stateDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 240,
  },
  sectionCountChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BADGE_GRID_GAP,
  },
  badgeCard: {
    width: BADGE_ITEM_WIDTH,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  badgeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeIconLocked: {
    opacity: 0.35,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusChipText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    minHeight: 40,
  },
  badgeDescription: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 54,
  },
  badgeFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  badgeFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptySectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySectionText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  modalIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  modalBadgeIcon: {
    fontSize: 40,
  },
  modalBadgeName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalStatusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBadgeDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BadgesScreen;
