import React from 'react';
import { useTranslation } from 'react-i18next';
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
  label,
}) => {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const scrollRef = React.useRef<ScrollView>(null);
  const itemLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [contentWidth, setContentWidth] = React.useState(0);

  const centerMoodTab = React.useCallback((moodType?: MoodType) => {
    if (!moodType || viewportWidth <= 0) {
      return;
    }

    const layout = itemLayoutsRef.current[moodType];
    if (!layout) {
      return;
    }

    const targetX = layout.x + layout.width / 2 - viewportWidth / 2;
    const maxScrollX = Math.max(0, contentWidth - viewportWidth);
    const clampedX = Math.max(0, Math.min(targetX, maxScrollX));

    scrollRef.current?.scrollTo({ x: clampedX, animated: true });
  }, [contentWidth, viewportWidth]);

  const handlePress = (mood: MoodType) => {
    if (selectedMood === mood) {
      onSelectMood(undefined as any);
    } else {
      onSelectMood(mood);
      requestAnimationFrame(() => {
        centerMoodTab(mood);
      });
    }
  };

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      centerMoodTab(selectedMood);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [centerMoodTab, selectedMood]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>{label || t('mood.selectMood')}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
      >
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.type}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              itemLayoutsRef.current[mood.type] = { x, width };
            }}
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
              {t(`mood.${mood.type}`)}
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
