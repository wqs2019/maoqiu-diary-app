import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';

interface EmptyScreenProps {
  message?: string;
  subMessage?: string;
  onAction?: () => void;
  actionText?: string;
}

const EmptyScreen: React.FC<EmptyScreenProps> = ({
  message = '暂无数据',
  subMessage = '这里还没有内容',
  onAction,
  actionText = '添加',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📭</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subMessage}>{subMessage}</Text>
      {onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.large,
  },
  icon: {
    fontSize: 64,
    marginBottom: SPACING.medium,
  },
  message: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  subMessage: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    borderRadius: 8,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontWeight: '500',
  },
});

export default EmptyScreen;
