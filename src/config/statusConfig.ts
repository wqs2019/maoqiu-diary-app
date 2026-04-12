import { MoodType, WeatherType } from '../types';

export const MOODS: {
  type: MoodType;
  emoji: string;
  label: string;
  primary: string;
  secondary: string;
  background: string;
}[] = [
  {
    type: 'happy',
    emoji: '😊',
    label: '开心',
    primary: '#FFD60A',
    secondary: '#FFE666',
    background: '#FFFBE6',
  },
  {
    type: 'excited',
    emoji: '🤩',
    label: '兴奋',
    primary: '#FF6B9D',
    secondary: '#FFB6D1',
    background: '#FFF5F7',
  },
  {
    type: 'relaxed',
    emoji: '😌',
    label: '轻松',
    primary: '#34C759',
    secondary: '#A8E6A8',
    background: '#F0FFF0',
  },
  {
    type: 'touched',
    emoji: '🥺',
    label: '感动',
    primary: '#AF52DE',
    secondary: '#D9A8F0',
    background: '#F9F0FF',
  },
  {
    type: 'normal',
    emoji: '😐',
    label: '平静',
    primary: '#8E8E93',
    secondary: '#C7C7CC',
    background: '#F5F5F5',
  },
  {
    type: 'sad',
    emoji: '😢',
    label: '难过',
    primary: '#5AC8FA',
    secondary: '#B6E8FF',
    background: '#F0F9FF',
  },
  {
    type: 'angry',
    emoji: '😠',
    label: '生气',
    primary: '#FF3B30',
    secondary: '#FF8A80',
    background: '#FFF5F5',
  },
];

export const WEATHERS: {
  type: WeatherType;
  emoji: string;
  label: string;
  primary: string;
  secondary: string;
  background: string;
}[] = [
  {
    type: 'sunny',
    emoji: '☀️',
    label: '晴',
    primary: '#FFD60A',
    secondary: '#FFE666',
    background: '#FFFBE6',
  },
  {
    type: 'cloudy',
    emoji: '☁️',
    label: '阴',
    primary: '#8E8E93',
    secondary: '#C7C7CC',
    background: '#F5F5F5',
  },
  {
    type: 'rainy',
    emoji: '🌧️',
    label: '雨',
    primary: '#5AC8FA',
    secondary: '#B6E8FF',
    background: '#F0F9FF',
  },
  {
    type: 'snowy',
    emoji: '❄️',
    label: '雪',
    primary: '#B6E8FF',
    secondary: '#E6F4FF',
    background: '#F0F9FF',
  },
  {
    type: 'windy',
    emoji: '💨',
    label: '风',
    primary: '#A8E6A8',
    secondary: '#D4F0D4',
    background: '#F0FFF0',
  },
  {
    type: 'foggy',
    emoji: '🌫️',
    label: '雾',
    primary: '#D4EDD4',
    secondary: '#E8F5E8',
    background: '#F5FBF5',
  },
];

// Helper functions for easy access
export const getMoodConfig = (type: MoodType | string) => {
  return MOODS.find((m) => m.type === type) || MOODS.find((m) => m.type === 'normal')!;
};

export const getWeatherConfig = (type: WeatherType | string) => {
  return WEATHERS.find((w) => w.type === type) || WEATHERS.find((w) => w.type === 'sunny')!;
};