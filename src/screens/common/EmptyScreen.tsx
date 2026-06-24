import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, FONT_SIZES, SPACING } from '../../config/constant';

interface EmptyScreenProps {
  message?: string;
  subMessage?: string;
  onAction?: () => void;
  actionText?: string;
}

const EmptyScreen: React.FC<EmptyScreenProps> = ({
  message,
  subMessage,
  onAction,
  actionText,
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('emptyScreen.defaultMessage');
  const displaySubMessage = subMessage || t('emptyScreen.defaultSubMessage');
  const displayActionText = actionText || t('emptyScreen.defaultActionText');

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📭</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      <Text style={styles.subMessage}>{displaySubMessage}</Text>
      {onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{displayActionText}</Text>
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
