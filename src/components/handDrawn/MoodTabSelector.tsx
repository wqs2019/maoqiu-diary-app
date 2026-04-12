import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MoodType } from '../../types';

interface MoodTabSelectorProps {
  selectedMood?: MoodType;
  onSelectMood: (mood: MoodType) => void;
  label?: string;
}

const MOODS: {
  type: MoodType;
  emoji: string;
  label: string;
  primary: string;
  secondary: string;
  background: string;
}[] = [
    { type: 'happy', emoji: '😊', label: '开心', primary: '#FFD60A', secondary: '#FFE666', background: '#FFFBE6' },
    { type: 'excited', emoji: '🤩', label: '兴奋', primary: '#FF6B9D', secondary: '#FFB6D1', background: '#FFF5F7' },
    { type: 'relaxed', emoji: '😌', label: '轻松', primary: '#34C759', secondary: '#A8E6A8', background: '#F0FFF0' },
    { type: 'touched', emoji: '🥺', label: '感动', primary: '#AF52DE', secondary: '#D9A8F0', background: '#F9F0FF' },
    { type: 'normal', emoji: '😐', label: '平静', primary: '#8E8E93', secondary: '#C7C7CC', background: '#F5F5F5' },
    { type: 'sad', emoji: '😢', label: '难过', primary: '#5AC8FA', secondary: '#B6E8FF', background: '#F0F9FF' },
    { type: 'angry', emoji: '😠', label: '生气', primary: '#FF3B30', secondary: '#FF8A80', background: '#FFF5F5' },
  ];

export const MoodTabSelector: React.FC<MoodTabSelectorProps> = ({
  selectedMood,
  onSelectMood,
  label = '心情',
}) => {
  const handlePress = (mood: MoodType) => {
    if (selectedMood === mood) {
      onSelectMood(undefined as any);
    } else {
      onSelectMood(mood);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
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
                  backgroundColor: mood.background,
                  borderColor: mood.secondary,
                },
            ]}
            onPress={() => handlePress(mood.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedMood === mood.type
                  ? { color: '#FFFFFF', fontWeight: '700' }
                  : { color: mood.primary },
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
    minWidth: 70,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
