import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MoodType } from '../../types';

interface MoodTabSelectorProps {
  selectedMood?: MoodType;
  onSelectMood: (mood: MoodType) => void;
  label?: string;
}

const MOODS: { type: MoodType; emoji: string; label: string; color: string }[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: '#FFD60A' },
  { type: 'excited', emoji: '🤩', label: '兴奋', color: '#FF6B9D' },
  { type: 'relaxed', emoji: '😌', label: '轻松', color: '#34C759' },
  { type: 'touched', emoji: '🥺', label: '感动', color: '#AF52DE' },
  { type: 'normal', emoji: '😐', label: '平静', color: '#8E8E93' },
  { type: 'sad', emoji: '😢', label: '难过', color: '#5AC8FA' },
  { type: 'angry', emoji: '😠', label: '生气', color: '#FF3B30' },
];

export const MoodTabSelector: React.FC<MoodTabSelectorProps> = ({
  selectedMood,
  onSelectMood,
  label = '心情',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.type}
            style={[
              styles.tab,
              selectedMood === mood.type && {
                backgroundColor: mood.color + '20',
                borderColor: mood.color,
                borderWidth: 3,
              },
            ]}
            onPress={() => onSelectMood(mood.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.labelText,
                selectedMood === mood.type && {
                  color: mood.color,
                  fontWeight: '700',
                },
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
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
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
