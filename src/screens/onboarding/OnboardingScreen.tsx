import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  FlatList,
  ViewToken,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { useAppTheme } from '../../hooks/useAppTheme';

import { HEALING_COLORS } from '@/config/handDrawnTheme';
import { useAppStore } from '@/store/appStore';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  image: any;
  color: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: '记录柔软时光',
    description: '每一个摇尾巴的瞬间\n都值得被温柔珍藏',
    image: require('../../../assets/mimi/1.png'),
    color: HEALING_COLORS.pink[50],
  },
  {
    id: '2',
    title: '专属记忆角落',
    description: '搭建你们的专属回忆墙\n让爱有迹可循',
    image: require('../../../assets/mimi/2.png'),
    color: HEALING_COLORS.blue[50],
  },
  {
    id: '3',
    title: '毛球智能陪伴',
    description: '遇到小麻烦？\n毛球AI随时为你答疑解惑',
    image: require('../../../assets/mimi/3.png'),
    color: HEALING_COLORS.yellow[50],
  },
  {
    id: '4',
    title: '毛球圈子',
    description: '加入毛球圈子\n与其他用户分享记忆',
    image: require('../../../assets/mimi/4.png'),
    color: HEALING_COLORS.green[50],
  },
];

const SlideItem: React.FC<{ item: Slide; index: number; scrollX: any; isDark: boolean }> = ({ item, index, scrollX, isDark }) => {
  const animatedImageStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [50, 0, 50], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#111827' }]}>{item.title}</Text>
        <Text style={[styles.description, { color: isDark ? '#AAA' : '#6B7280' }]}>
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
};

const PaginationDot: React.FC<{ index: number; scrollX: any; isDark: boolean }> = ({ index, scrollX, isDark }) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    
    return {
      width: dotWidth,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedDotStyle,
        { backgroundColor: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[500] }
      ]}
    />
  );
};

const OnboardingScreen: React.FC = () => {
  const { setFirstLaunch } = useAppStore();
  const { isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);
  
  const scrollX = useSharedValue(0);

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0] && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleStart();
    }
  };

  const handleStart = async () => {
    await setFirstLaunch(false);
  };

  const renderItem = ({ item, index }: { item: Slide; index: number }) => {
    return <SlideItem item={item} index={index} scrollX={scrollX} isDark={isDark} />;
  };

  // 背景颜色渐变动画
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const isDarkColors = ['#121212', '#1E1E1E', '#121212'];
    const lightColors = SLIDES.map(s => s.color);
    const colorsToUse = isDark ? isDarkColors : lightColors;

    const backgroundColor = interpolateColor(
      scrollX.value,
      SLIDES.map((_, i) => i * width),
      colorsToUse
    );

    return { backgroundColor };
  });

  return (
    <Animated.View style={[styles.container, animatedBackgroundStyle]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.flatListContainer}>
          <Animated.FlatList
            data={SLIDES}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            bounces={false}
            keyExtractor={(item) => item.id}
            onScroll={(event) => {
              scrollX.value = event.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
            onViewableItemsChanged={viewableItemsChanged}
            viewabilityConfig={viewConfig}
            ref={slidesRef}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.paginator}>
            {SLIDES.map((_, index) => {
              const animatedDotStyle = useAnimatedStyle(() => {
                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                const dotWidth = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
                const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
                
                return {
                  width: dotWidth,
                  opacity,
                };
              });

              return (
                <Animated.View
                  key={index.toString()}
                  style={[
                    styles.dot,
                    animatedDotStyle,
                    { backgroundColor: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[500] }
                  ]}
                />
              );
            })}
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: isDark ? HEALING_COLORS.pink[500] : HEALING_COLORS.pink[400] }]} onPress={scrollToNext} activeOpacity={0.8}>
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? '开启毛球日记' : '继续'}
            </Text>
            {currentIndex === SLIDES.length - 1 && (
              <Ionicons name="paw" size={20} color="#FFF" style={styles.buttonIcon} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

// ... helper function for color interpolation
import { interpolateColor } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flex: 3,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: width * 0.8,
    height: width * 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  footer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: height * 0.05,
  },
  paginator: {
    flexDirection: 'row',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default OnboardingScreen;
