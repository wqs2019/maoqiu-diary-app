import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { WEATHERS } from '../../config/statusConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { WeatherType } from '../../types';

interface WeatherTabSelectorProps {
  selectedWeather?: WeatherType;
  onSelectWeather: (weather: WeatherType) => void;
  label?: string;
}

export const WeatherTabSelector: React.FC<WeatherTabSelectorProps> = ({
  selectedWeather,
  onSelectWeather,
  label,
}) => {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const scrollRef = React.useRef<ScrollView>(null);
  const itemLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [contentWidth, setContentWidth] = React.useState(0);

  const centerWeatherTab = React.useCallback((weatherType?: WeatherType) => {
    if (!weatherType || viewportWidth <= 0) {
      return;
    }

    const layout = itemLayoutsRef.current[weatherType];
    if (!layout) {
      return;
    }

    const targetX = layout.x + layout.width / 2 - viewportWidth / 2;
    const maxScrollX = Math.max(0, contentWidth - viewportWidth);
    const clampedX = Math.max(0, Math.min(targetX, maxScrollX));

    scrollRef.current?.scrollTo({ x: clampedX, animated: true });
  }, [contentWidth, viewportWidth]);

  const handlePress = (weather: WeatherType) => {
    if (selectedWeather === weather) {
      onSelectWeather(undefined as any);
    } else {
      onSelectWeather(weather);
      requestAnimationFrame(() => {
        centerWeatherTab(weather);
      });
    }
  };

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      centerWeatherTab(selectedWeather);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [centerWeatherTab, selectedWeather]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>{label || t('setting.weather')}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
      >
        {WEATHERS.map((weather) => (
          <TouchableOpacity
            key={weather.type}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              itemLayoutsRef.current[weather.type] = { x, width };
            }}
            style={[
              styles.tab,
              selectedWeather === weather.type
                ? {
                    backgroundColor: weather.primary,
                    borderColor: weather.primary,
                  }
                : {
                    backgroundColor: isDark ? '#1E1E1E' : weather.background,
                    borderColor: isDark ? '#333' : weather.secondary,
                  },
            ]}
            onPress={() => {
              handlePress(weather.type);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{weather.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedWeather === weather.type
                  ? { color: '#FFFFFF', fontWeight: '700' }
                  : { color: isDark ? '#AAA' : weather.primary },
              ]}
            >
              {t(`weather.${weather.type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: 10,
    minWidth: 56,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
