import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { MoodType } from '../../types';

interface MoodSelectorProps {
    selectedMood?: MoodType;
    onSelectMood: (mood: MoodType) => void;
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

export const MoodSelector: React.FC<MoodSelectorProps> = ({
    selectedMood,
    onSelectMood,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>今天的心情</Text>
            <View style={styles.moodList}>
                {MOODS.map((mood) => (
                    <TouchableOpacity
                        key={mood.type}
                        style={[
                            styles.moodItem,
                            selectedMood === mood.type && {
                                backgroundColor: mood.color + '20',
                                borderColor: mood.color,
                                borderWidth: 3,
                            },
                        ]}
                        onPress={() => onSelectMood(mood.type)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text
                            style={[
                                styles.moodLabel,
                                selectedMood === mood.type && { color: mood.color, fontWeight: '700' },
                            ]}
                        >
                            {mood.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    moodList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    moodItem: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#E5E5E5',
        minWidth: 60,
    },
    moodEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    moodLabel: {
        fontSize: 12,
        color: '#666',
    },
});
