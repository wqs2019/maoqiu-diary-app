import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TouchableOpacity } from 'react-native';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';

interface HandDrawnCardProps {
  children: React.ReactNode;
  style?: 'soft' | 'warm' | 'dreamy' | 'natural';
  variant?: 'default' | 'highlight' | 'minimal';
  padding?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  image?: string;
  badge?: string;
  backgroundColor?: string;
}

export const HandDrawnCard: React.FC<HandDrawnCardProps> = ({
  children,
  style: styleType = 'soft',
  variant = 'default',
  padding = 'medium',
  onPress,
  header,
  footer,
  image,
  badge,
  backgroundColor,
}) => {
  const handDrawnStyle = HAND_DRAWN_STYLES[styleType];

  const getPaddingStyle = (): number => {
    switch (padding) {
      case 'small':
        return 12;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    if (variant === 'highlight') {
      return {
        borderWidth: 3,
        borderColor: HEALING_COLORS.pink[300],
        backgroundColor: HEALING_COLORS.pink[50],
      };
    }
    if (variant === 'minimal') {
      return {
        borderWidth: 0,
        shadowColor: '#000000', // 增强阴影，改用深色阴影增加厚重感
        shadowOpacity: 0.18,    // 调高不透明度
        shadowRadius: 20,       // 增加阴影模糊半径
        shadowOffset: { width: 0, height: 8 }, // 加大向下偏移
        elevation: 12,          // Android 下加强投影
      };
    }
    return {};
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={[
        styles.container,
        styles.pressable,
        {
          borderRadius: handDrawnStyle.borderRadius,
          borderWidth: handDrawnStyle.borderWidth,
          borderColor: handDrawnStyle.borderColor,
          shadowColor: handDrawnStyle.shadowColor,
          shadowOpacity: handDrawnStyle.shadowOpacity,
          shadowRadius: handDrawnStyle.shadowRadius,
          shadowOffset: handDrawnStyle.shadowOffset,
          backgroundColor: backgroundColor || '#FFFFFF',
          padding: getPaddingStyle(),
        },
        getVariantStyle(),
      ]}
    >
      {header && <View style={styles.header}>{header}</View>}

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>{children}</View>

      {footer && <View style={styles.footer}>{footer}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    elevation: 2,
  },
  pressable: {
    // 移除 overflow: 'hidden'，否则在 iOS 下会把外部的 shadow 给裁剪掉，导致阴影不可见
  },
  pressableContainer: {
    opacity: 1,
  },
  header: {
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: HEALING_COLORS.pink[500],
  },
});
