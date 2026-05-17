import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '加载中...' }) => {
  const { themeName, isDark } = useAppTheme();
  // HEALING_COLORS is not part of the returned theme context, but pink[400] is standard
  const loadingColor = themeName === 'dark' ? '#FFB6C1' : '#FF8FA3'; // Fallback pinks

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
      <ActivityIndicator size="large" color={loadingColor} />
      <Text style={[styles.message, { color: isDark ? '#AAA' : '#666' }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default LoadingScreen;
