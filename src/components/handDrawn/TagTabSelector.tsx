import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { TagType } from '../../types';

interface TagTabSelectorProps {
  selectedTags: TagType[];
  onToggleTag: (tag: TagType) => void;
  label?: string;
}

const TAGS: { type: TagType; emoji: string; label: string; color: string }[] = [
  { type: 'daily', emoji: '📝', label: '日常', color: '#FF85A2' },
  { type: 'work', emoji: '💼', label: '工作', color: '#5AC8FA' },
  { type: 'study', emoji: '📚', label: '学习', color: '#FFD60A' },
  { type: 'travel', emoji: '✈️', label: '旅游', color: '#34C759' },
  { type: 'sports', emoji: '⚽', label: '运动', color: '#FF9500' },
  { type: 'food', emoji: '🍔', label: '美食', color: '#FF6B9D' },
  { type: 'mood', emoji: '💭', label: '心情', color: '#AF52DE' },
  { type: 'family', emoji: '👨‍👩‍👧', label: '家庭', color: '#FF85A2' },
  { type: 'friends', emoji: '👯', label: '朋友', color: '#B6E8FF' },
  { type: 'shopping', emoji: '🛍️', label: '购物', color: '#FFB6C1' },
];

export const TagTabSelector: React.FC<TagTabSelectorProps> = ({
  selectedTags,
  onToggleTag,
  label = '标签',
}) => {
  const isSelected = (tag: TagType) => selectedTags.includes(tag);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {TAGS.map((tag) => {
          const selected = isSelected(tag.type);
          return (
            <TouchableOpacity
              key={tag.type}
              style={[
                styles.tab,
                selected && {
                  backgroundColor: tag.color,
                  borderColor: tag.color,
                },
              ]}
              onPress={() => {
                onToggleTag(tag.type);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{tag.emoji}</Text>
              <Text style={[styles.labelText, selected && { color: '#FFFFFF', fontWeight: '700' }]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 10,
  },
  emoji: {
    fontSize: 18,
    marginRight: 6,
  },
  labelText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
