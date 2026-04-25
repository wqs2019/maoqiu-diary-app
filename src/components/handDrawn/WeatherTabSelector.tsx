import React from 'react';
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
  label = '天气',
}) => {
  const { isDark } = useAppTheme();

  const handlePress = (weather: WeatherType) => {
    if (selectedWeather === weather) {
      onSelectWeather(undefined as any);
    } else {
      onSelectWeather(weather);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>{label}</Text>
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
