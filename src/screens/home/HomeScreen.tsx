import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';
import { useAuthStore } from '../../store/authStore';

const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: SPACING.xlarge + insets.top }]}>
          <Text style={styles.greeting}>你好，{user?.nickname || '用户'}</Text>
          <Text style={styles.subGreeting}>欢迎回来</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>生活记录</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无记录</Text>
              <Text style={styles.emptySubText}>开始记录你的生活吧</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近活动</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无活动</Text>
              <Text style={styles.emptySubText}>活动将显示在这里</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xlarge,
    paddingBottom: SPACING.large,
    paddingHorizontal: SPACING.large,
  },
  greeting: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: 'bold',
    color: COLORS.surface,
    marginBottom: SPACING.small,
  },
  subGreeting: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.surface + 'CC',
  },
  content: {
    paddingHorizontal: SPACING.large,
    paddingTop: SPACING.large,
  },
  section: {
    marginBottom: SPACING.large,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.xlarge,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  emptySubText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary + 'CC',
  },
});

export default HomeScreen;
