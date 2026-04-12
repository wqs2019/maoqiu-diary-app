import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { SCENARIO_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected
          ? {
              backgroundColor: scenario.primary,
              borderColor: scenario.primary,
            }
          : {
              backgroundColor: scenario.background,
              borderColor: scenario.secondary,
            },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{template.icon}</Text>
      <Text style={[styles.text, selected ? { color: '#FFFFFF' } : { color: scenario.primary }]}>
        {template.name}
      </Text>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: selected ? '#FFFFFF' : scenario.primary }]}>
          <Text style={[styles.badgeText, { color: scenario.primary }]}>{count}</Text>
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
