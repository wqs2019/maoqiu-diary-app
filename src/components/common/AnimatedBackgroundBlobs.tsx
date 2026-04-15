import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  withDelay,
} from 'react-native-reanimated';

// 封装单个动画小球
const AnimatedBlob = ({
  style,
  delay = 0,
  duration = 4000,
  xOffset = 20,
  yOffset = 20,
  scaleOffset = 1.1,
}: {
  style: any;
  delay?: number;
  duration?: number;
  xOffset?: number;
  yOffset?: number;
  scaleOffset?: number;
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // 垂直浮动
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(yOffset, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-yOffset, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // 水平浮动 (使用不同的 duration 产生不规则的运动轨迹)
    translateX.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(xOffset, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) }),
          withTiming(-xOffset, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // 缩放呼吸效果
    scale.value = withDelay(
      delay + 1000,
      withRepeat(
        withSequence(
          withTiming(scaleOffset, { duration: duration * 1.5, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: duration * 1.5, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, duration, xOffset, yOffset, scaleOffset]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return <Animated.View style={[styles.blob, style, animatedStyle]} />;
};

export const AnimatedBackgroundBlobs = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedBlob 
        style={styles.blobTopLeft} 
        delay={0} 
        duration={5000} 
        xOffset={30} 
        yOffset={40} 
      />
      <AnimatedBlob 
        style={styles.blobTopRight} 
        delay={1000} 
        duration={6000} 
        xOffset={-40} 
        yOffset={30} 
      />
      <AnimatedBlob 
        style={styles.blobBottomLeft} 
        delay={2000} 
        duration={5500} 
        xOffset={40} 
        yOffset={-30} 
      />
      <AnimatedBlob 
        style={styles.blobBottomRight} 
        delay={1500} 
        duration={4500} 
        xOffset={-30} 
        yOffset={-40} 
      />
      <AnimatedBlob 
        style={styles.blobBottomCenter} 
        delay={500} 
        duration={7000} 
        xOffset={50} 
        yOffset={20} 
        scaleOffset={1.05} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopLeft: {
    width: 200,
    height: 200,
    backgroundColor: '#FFF0F5', // Light pink
    top: -50,
    left: -50,
    opacity: 0.8,
  },
  blobTopRight: {
    width: 240,
    height: 240,
    backgroundColor: '#E6F7FF', // Light cyan/blue
    top: -40,
    right: -80,
    opacity: 0.8,
  },
  blobBottomLeft: {
    width: 260,
    height: 260,
    backgroundColor: '#FFFFE0', // Light yellow
    bottom: 60,
    left: -120,
    opacity: 0.6,
  },
  blobBottomRight: {
    width: 220,
    height: 220,
    backgroundColor: '#F3E5F5', // Light purple
    bottom: 120,
    right: -80,
    opacity: 0.8,
  },
  blobBottomCenter: {
    width: 280,
    height: 280,
    backgroundColor: '#E8F5E9', // Light green
    bottom: -120,
    alignSelf: 'center',
    opacity: 0.7,
  },
});
