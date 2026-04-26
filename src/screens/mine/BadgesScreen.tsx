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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BADGES_CONFIG, BadgeConfig } from '../../config/badgesConfig';
import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDiaryStats } from '../../hooks/useDiaryQuery';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const BADGE_ITEM_WIDTH = (width - 40 - 32) / 3; // 3 columns, 20 padding each side, 16 gap between columns

const BadgesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();

  // 获取解锁的徽章列表
  const { unlockedBadges, isLoading } = useDiaryStats(user?._id);

  // 弹窗状态
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);

  const handleBadgePress = (badge: BadgeConfig) => {
    setSelectedBadge(badge);
  };

  const closeBadgeModal = () => {
    setSelectedBadge(null);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: isDark ? '#333' : '#F0F0F0',
            backgroundColor: isDark ? '#121212' : '#FAFAFA',
          },
        ]}
      >
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
          我的徽章
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] }]}>
            已收集 <Text style={styles.summaryHighlight}>{unlockedBadges.length}</Text> /{' '}
            {BADGES_CONFIG.length} 枚徽章
          </Text>
        </View>

        <View style={styles.badgesGrid}>
          {BADGES_CONFIG.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);

            return (
              <TouchableOpacity
                key={badge.id}
                style={[
                  styles.badgeItem,
                  {
                    borderRadius: themeStyle.borderRadius,
                  },
                  isUnlocked
                    ? [
                        styles.badgeUnlocked,
                        {
                          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                          borderColor: isDark ? '#333' : '#FFF0F3',
                          shadowColor: isDark ? '#000' : themeStyle.shadowColor,
                        },
                      ]
                    : [
                        styles.badgeLocked,
                        {
                          backgroundColor: isDark ? '#121212' : '#F5F5F5',
                          borderColor: isDark ? '#333' : '#EAEAEA',
                        },
                      ],
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  handleBadgePress(badge);
                }}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isUnlocked
                      ? { backgroundColor: badge.color + (isDark ? '40' : '20') }
                      : [styles.iconLocked, { backgroundColor: isDark ? '#333' : '#EEEEEE' }],
                  ]}
                >
                  <Text style={[styles.badgeIcon, !isUnlocked && styles.badgeIconLocked]}>
                    {badge.icon}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.badgeName,
                    isUnlocked
                      ? { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }
                      : { color: isDark ? '#888' : HEALING_COLORS.gray[400] },
                  ]}
                  numberOfLines={1}
                >
                  {badge.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 徽章详情弹窗 */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={closeBadgeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            {selectedBadge && (
              <>
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeBadgeModal}>
                  <Feather name="x" size={24} color={isDark ? '#AAA' : HEALING_COLORS.gray[400]} />
                </TouchableOpacity>

                <View
                  style={[
                    styles.modalIconContainer,
                    unlockedBadges.includes(selectedBadge.id)
                      ? { backgroundColor: selectedBadge.color + (isDark ? '40' : '20') }
                      : [styles.iconLocked, { backgroundColor: isDark ? '#333' : '#EEEEEE' }],
                  ]}
                >
                  <Text
                    style={[
                      styles.modalBadgeIcon,
                      !unlockedBadges.includes(selectedBadge.id) && styles.badgeIconLocked,
                    ]}
                  >
                    {selectedBadge.icon}
                  </Text>
                </View>

                <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>

                <View style={styles.modalStatusContainer}>
                  {unlockedBadges.includes(selectedBadge.id) ? (
                    <Text style={[styles.modalStatusText, { color: HEALING_COLORS.green[500] }]}>
                      ✨ 已获得
                      {user?.unlockedBadges?.[selectedBadge.id] &&
                        ` (${new Date(user.unlockedBadges[selectedBadge.id]).toLocaleDateString()})`}
                    </Text>
                  ) : (
                    <Text style={[styles.modalStatusText, { color: HEALING_COLORS.gray[400] }]}>
                      🔒 未获得
                    </Text>
                  )}
                </View>

                <Text style={styles.modalBadgeDesc}>{selectedBadge.description}</Text>
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
    backgroundColor: '#FAFAFA',
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
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    color: HEALING_COLORS.gray[600],
    fontWeight: '500',
  },
  summaryHighlight: {
    color: HEALING_COLORS.pink[500],
    fontSize: 24,
    fontWeight: '800',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 40,
  },
  badgeItem: {
    width: BADGE_ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    elevation: 2,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeUnlocked: {
    borderColor: '#FFF0F3',
  },
  badgeLocked: {
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    shadowOpacity: 0,
    elevation: 0,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconLocked: {
    backgroundColor: '#F0F0F0',
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeIconLocked: {
    opacity: 0.3,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    color: HEALING_COLORS.gray[800],
    marginBottom: 8,
  },
  modalStatusContainer: {
    backgroundColor: '#FAFAFA',
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
    color: HEALING_COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BadgesScreen;
