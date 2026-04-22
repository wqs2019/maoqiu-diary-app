import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { SCENARIO_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ScenarioType } from '../../types';

interface ScenarioChipProps {
  type: ScenarioType;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
}

export const ScenarioChip: React.FC<ScenarioChipProps> = ({
  type,
  selected = false,
  onPress,
  count,
}) => {
  const scenario = SCENARIO_COLORS[type];
  const template = SCENARIO_TEMPLATES[type];
  const { isDark } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { shadowColor: isDark ? '#000' : '#000', shadowOpacity: isDark ? 0.3 : 0.1 },
        selected
          ? {
              backgroundColor: isDark ? scenario.primary : scenario.primary,
              borderColor: isDark ? scenario.primary : scenario.primary,
            }
          : {
              backgroundColor: isDark ? '#1E1E1E' : scenario.background,
              borderColor: isDark ? '#333' : scenario.secondary,
            },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{template.icon}</Text>
      <Text style={[styles.text, selected ? { color: '#FFFFFF' } : { color: isDark ? '#AAA' : scenario.primary }]}>
        {template.name}
      </Text>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: selected ? '#FFFFFF' : (isDark ? '#333' : scenario.primary) }]}>
          <Text style={[styles.badgeText, { color: isDark && !selected ? '#AAA' : scenario.primary }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
