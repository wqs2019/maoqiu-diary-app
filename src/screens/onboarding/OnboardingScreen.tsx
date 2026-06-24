import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const OnboardingScreen: React.FC = () => {
  const { setFirstLaunch } = useAppStore();
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);
  
  const scrollX = useSharedValue(0);
  const slides: Slide[] = [
    {
      id: '1',
      title: t('onboarding.slides.first.title'),
      description: t('onboarding.slides.first.description'),
      image: require('../../../assets/mimi/1.png'),
      color: HEALING_COLORS.pink[50],
    },
    {
      id: '2',
      title: t('onboarding.slides.second.title'),
      description: t('onboarding.slides.second.description'),
      image: require('../../../assets/mimi/2.png'),
      color: HEALING_COLORS.blue[50],
    },
    {
      id: '3',
      title: t('onboarding.slides.third.title'),
      description: t('onboarding.slides.third.description'),
      image: require('../../../assets/mimi/3.png'),
      color: HEALING_COLORS.yellow[50],
    },
    {
      id: '4',
      title: t('onboarding.slides.fourth.title'),
      description: t('onboarding.slides.fourth.description'),
      image: require('../../../assets/mimi/4.png'),
      color: HEALING_COLORS.green[50],
    },
  ];

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0] && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < slides.length - 1) {
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
    const lightColors = slides.map(s => s.color);
    const colorsToUse = isDark ? isDarkColors : lightColors;

    const backgroundColor = interpolateColor(
      scrollX.value,
      slides.map((_, i) => i * width),
      colorsToUse
    );

    return { backgroundColor };
  });

  return (
    <Animated.View style={[styles.container, animatedBackgroundStyle]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.flatListContainer}>
          <Animated.FlatList
            data={slides}
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
            {slides.map((_, index) => {
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
              {currentIndex === slides.length - 1 ? t('onboarding.start') : t('onboarding.continue')}
            </Text>
            {currentIndex === slides.length - 1 && (
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
