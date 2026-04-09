import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';

const CategoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>分类</Text>
      <Text style={styles.description}>分类页面 - 生活记录分类</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: 'bold',
    marginBottom: SPACING.medium,
    color: COLORS.text,
  },
  description: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
});

export default CategoryScreen;