import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore, ThemeColorType } from '../../store/appStore';

const THEME_COLORS: { id: ThemeColorType; name: string; color: string }[] = [
  { id: 'pink', name: '樱花粉', color: '#FF85A2' },
  { id: 'blue', name: '天空蓝', color: '#66B8FF' },
  { id: 'green', name: '薄荷绿', color: '#34C759' },
  { id: 'yellow', name: '暖阳黄', color: '#FFD60A' },
  { id: 'purple', name: '薰衣紫', color: '#AF52DE' },
  { id: 'orange', name: '元气橘', color: '#FF9500' },
  { id: 'cyan', name: '浅海青', color: '#00C7BE' },
  { id: 'brown', name: '可可棕', color: '#C0A080' },
];

const ThemeSettingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const { themeColor, setThemeColor } = useAppStore();

  const handleSelectColor = (colorId: ThemeColorType) => {
    setThemeColor(colorId);
    // Home 页面在 Main Tab 中，需要先导航到 Main，再导航到内部的 Home
    (navigation as any).navigate('Main', { screen: 'Home' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0', backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color={isDark ? '#FFF' : HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>自定义主题</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : HEALING_COLORS.gray[500] }]}>选择应用主色调</Text>
        <View style={styles.colorGrid}>
          {THEME_COLORS.map((item) => {
            const isSelected = themeColor === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.colorCard,
                  { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
                  isSelected && { borderColor: item.color, borderWidth: 2 },
                ]}
                onPress={() => handleSelectColor(item.id)}
              >
                <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
                <Text style={[styles.colorName, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>
                  {item.name}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: item.color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorCard: {
    width: '47%',
    padding: 20,
    borderRadius: HAND_DRAWN_STYLES.soft.borderRadius,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  colorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeSettingScreen;