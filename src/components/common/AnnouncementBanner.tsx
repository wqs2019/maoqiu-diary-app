import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';

import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface Props {
  text: string;
}

export const AnnouncementBanner: React.FC<Props> = ({ text }) => {
  const { isDark } = useAppTheme();
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 使用另一个 ref 来存储动画对象，方便手动停止
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // 当文本改变时，重置状态
    scrollX.setValue(0);
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  }, [text]);

  useEffect(() => {
    // 确保文本和容器都已测量完成
    if (textWidth > 0 && containerWidth > 0) {
      console.log('Checking animation conditions:', { textWidth, containerWidth });
      
      if (animationRef.current) {
        animationRef.current.stop();
      }

      if (textWidth <= containerWidth + 5) { 
        console.log('No scroll needed');
        scrollX.setValue(0);
        return;
      }

      console.log('Starting scroll animation');
      const scrollDistance = textWidth - containerWidth + 50;
      const duration = scrollDistance * 35;

      const animation = Animated.sequence([
        Animated.delay(1000),
        Animated.timing(scrollX, {
          toValue: -scrollDistance,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(scrollX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = Animated.loop(animation);
      animationRef.current.start();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [textWidth, containerWidth]);

  if (!text) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#333' : '#FFF0F3' }]}>
      <Ionicons name="volume-medium" size={20} color={HEALING_COLORS.pink[500]} style={styles.icon} />
      <View
        style={styles.textContainer}
        onLayout={(e: LayoutChangeEvent) => {
          const w = e.nativeEvent.layout.width;
          console.log('Container Width:', w);
          setContainerWidth(w);
        }}
      >
        <Animated.View
            style={[styles.textWrapper, { transform: [{ translateX: scrollX }] }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 5000 }}>
              <Text
                onLayout={(e: LayoutChangeEvent) => {
                  const w = e.nativeEvent.layout.width;
                  console.log('Text Width:', w);
                  setTextWidth(w);
                }}
                numberOfLines={1}
                ellipsizeMode="clip"
                style={[styles.text, { color: isDark ? '#FFF' : HEALING_COLORS.pink[600] }]}
              >
                {text}
              </Text>
            </View>
          </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 40,
    width: '100%',
    overflow: 'hidden',
  },
  icon: {
    marginRight: 8,
    zIndex: 1,
  },
  textContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textWrapper: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    // 关键：不限制宽度，允许子元素撑开
    width: 'auto',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
    flexWrap: 'nowrap',
    // 强制不换行
  },
});
