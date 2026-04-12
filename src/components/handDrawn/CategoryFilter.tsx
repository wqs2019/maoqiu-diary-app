import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { HEALING_COLORS, SCENARIO_COLORS } from '../../config/handDrawnTheme';
import { ScenarioType } from '../../types';

interface FilterOption {
  id: string;
  label: string;
  icon: string;
  count: number;
  color: string;
}

interface CategoryFilterProps {
  selectedScenario?: ScenarioType | 'all';
  onScenarioChange: (scenario: ScenarioType | 'all') => void;
  selectedMood?: string;
  onMoodChange: (mood: string) => void;
  showFilters?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedScenario = 'all',
  onScenarioChange,
  selectedMood,
  onMoodChange,
  showFilters = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const scenarios: FilterOption[] = [
    { id: 'all', label: '全部', icon: '📊', count: 42, color: HEALING_COLORS.pink[400] },
    { id: 'daily', label: '日常', icon: '📝', count: 15, color: SCENARIO_COLORS.daily.primary },
    { id: 'travel', label: '旅行', icon: '✈️', count: 8, color: SCENARIO_COLORS.travel.primary },
    { id: 'movie', label: '观影', icon: '🎬', count: 12, color: SCENARIO_COLORS.movie.primary },
    { id: 'food', label: '美食', icon: '🍔', count: 10, color: SCENARIO_COLORS.food.primary },
    { id: 'outing', label: '出行', icon: '🌳', count: 7, color: SCENARIO_COLORS.outing.primary },
    { id: 'special', label: '特别', icon: '🎉', count: 5, color: SCENARIO_COLORS.special.primary },
  ];

  const moods: FilterOption[] = [
    { id: 'all', label: '全部', icon: '😊', count: 42, color: '#666' },
    { id: 'happy', label: '开心', icon: '😊', count: 20, color: '#FFD60A' },
    { id: 'relaxed', label: '轻松', icon: '😌', count: 10, color: '#34C759' },
    { id: 'touched', label: '感动', icon: '🥺', count: 5, color: '#AF52DE' },
    { id: 'excited', label: '兴奋', icon: '🤩', count: 7, color: '#FF6B9D' },
  ];

  const selectedScenarioData = scenarios.find((s) => s.id === selectedScenario) || scenarios[0];

  return (
    <View style={styles.container}>
      {/* 筛选栏 */}
      <TouchableOpacity
        style={styles.filterBar}
        onPress={() => {
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.filterLeft}>
          <Ionicons name="filter-outline" size={20} color={selectedScenarioData.color} />
          <Text style={[styles.filterText, { color: selectedScenarioData.color }]}>
            {selectedScenarioData.icon} {selectedScenarioData.label}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#999" />
      </TouchableOpacity>

      {/* 展开的筛选选项 */}
      {expanded && (
        <View style={styles.dropdown}>
          {/* 场景筛选 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>场景</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {scenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario.id}
                  style={[
                    styles.optionChip,
                    selectedScenario === scenario.id && {
                      backgroundColor: scenario.color,
                    },
                  ]}
                  onPress={() => {
                    onScenarioChange(scenario.id as ScenarioType | 'all');
                  }}
                >
                  <Text
                    style={[
                      styles.optionEmoji,
                      selectedScenario === scenario.id && { fontSize: 18 },
                    ]}
                  >
                    {scenario.icon}
                  </Text>
                  <Text
                    style={[
                      styles.optionText,
                      selectedScenario === scenario.id && { color: '#FFFFFF' },
                    ]}
                  >
                    {scenario.label}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      selectedScenario === scenario.id && {
                        backgroundColor: '#FFFFFF30',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        selectedScenario === scenario.id && { color: '#FFFFFF' },
                      ]}
                    >
                      {scenario.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 心情筛选 */}
          {showFilters && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>心情</Text>
              <View style={styles.moodList}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodChip,
                      selectedMood === mood.id && {
                        backgroundColor: mood.color,
                      },
                    ]}
                    onPress={() => {
                      onMoodChange(mood.id);
                    }}
                  >
                    <Text style={styles.moodEmoji}>{mood.icon}</Text>
                    <Text
                      style={[styles.moodText, selectedMood === mood.id && { color: '#FFFFFF' }]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  dropdown: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  moodList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
