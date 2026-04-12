import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WeatherType } from '../../types';

interface WeatherTabSelectorProps {
  selectedWeather?: WeatherType;
  onSelectWeather: (weather: WeatherType) => void;
  label?: string;
}

const WEATHERS: {
  type: WeatherType;
  emoji: string;
  label: string;
  primary: string;
  secondary: string;
  background: string;
}[] = [
    { type: 'sunny', emoji: '☀️', label: '晴', primary: '#FFD60A', secondary: '#FFE666', background: '#FFFBE6' },
    { type: 'cloudy', emoji: '☁️', label: '阴', primary: '#8E8E93', secondary: '#C7C7CC', background: '#F5F5F5' },
    { type: 'rainy', emoji: '🌧️', label: '雨', primary: '#5AC8FA', secondary: '#B6E8FF', background: '#F0F9FF' },
    { type: 'snowy', emoji: '❄️', label: '雪', primary: '#B6E8FF', secondary: '#E6F4FF', background: '#F0F9FF' },
    { type: 'windy', emoji: '💨', label: '风', primary: '#A8E6A8', secondary: '#D4F0D4', background: '#F0FFF0' },
    { type: 'foggy', emoji: '🌫️', label: '雾', primary: '#D4EDD4', secondary: '#E8F5E8', background: '#F5FBF5' },
  ];

export const WeatherTabSelector: React.FC<WeatherTabSelectorProps> = ({
  selectedWeather,
  onSelectWeather,
  label = '天气',
}) => {
  const handlePress = (weather: WeatherType) => {
    if (selectedWeather === weather) {
      onSelectWeather(undefined as any);
    } else {
      onSelectWeather(weather);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {WEATHERS.map((weather) => (
          <TouchableOpacity
            key={weather.type}
            style={[
              styles.tab,
              selectedWeather === weather.type
                ? {
                  backgroundColor: weather.primary,
                  borderColor: weather.primary,
                }
                : {
                  backgroundColor: weather.background,
                  borderColor: weather.secondary,
                },
            ]}
            onPress={() => handlePress(weather.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{weather.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedWeather === weather.type
                  ? { color: '#FFFFFF', fontWeight: '700' }
                  : { color: weather.primary },
              ]}
            >
              {weather.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 60,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
