import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WeatherType } from '../../types';

interface WeatherTabSelectorProps {
  selectedWeather?: WeatherType;
  onSelectWeather: (weather: WeatherType) => void;
  label?: string;
}

const WEATHERS: { type: WeatherType; emoji: string; label: string; color: string }[] = [
  { type: 'sunny', emoji: '☀️', label: '晴', color: '#FFD60A' },
  { type: 'cloudy', emoji: '☁️', label: '阴', color: '#8E8E93' },
  { type: 'rainy', emoji: '🌧️', label: '雨', color: '#5AC8FA' },
  { type: 'snowy', emoji: '❄️', label: '雪', color: '#B6E8FF' },
  { type: 'windy', emoji: '💨', label: '风', color: '#A8E6A8' },
  { type: 'foggy', emoji: '🌫️', label: '雾', color: '#D4EDD4' },
];

export const WeatherTabSelector: React.FC<WeatherTabSelectorProps> = ({
  selectedWeather,
  onSelectWeather,
  label = '天气',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {WEATHERS.map((weather) => (
          <TouchableOpacity
            key={weather.type}
            style={[
              styles.tab,
              selectedWeather === weather.type && {
                backgroundColor: weather.color + '20',
                borderColor: weather.color,
                borderWidth: 3,
              },
            ]}
            onPress={() => onSelectWeather(weather.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{weather.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedWeather === weather.type && {
                  color: weather.color,
                  fontWeight: '700',
                },
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
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
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
