import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { MOODS } from '../../config/statusConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MoodType } from '../../types';

interface MoodTabSelectorProps {
  selectedMood?: MoodType;
  onSelectMood: (mood: MoodType) => void;
  label?: string;
}

export const MoodTabSelector: React.FC<MoodTabSelectorProps> = ({
  selectedMood,
  onSelectMood,
  label = '心情',
}) => {
  const { isDark } = useAppTheme();

  const handlePress = (mood: MoodType) => {
    if (selectedMood === mood) {
      onSelectMood(undefined as any);
    } else {
      onSelectMood(mood);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.type}
            style={[
              styles.tab,
              selectedMood === mood.type
                ? {
                    backgroundColor: mood.primary,
                    borderColor: mood.primary,
                  }
                : {
                    backgroundColor: isDark ? '#1E1E1E' : mood.background,
                    borderColor: isDark ? '#333' : mood.secondary,
                  },
            ]}
            onPress={() => {
              handlePress(mood.type);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedMood === mood.type
                  ? { color: '#FFFFFF', fontWeight: '700' }
                  : { color: isDark ? '#AAA' : mood.primary },
              ]}
            >
              {mood.label}
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
