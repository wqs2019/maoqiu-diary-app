import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS, DARK_HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { imageService } from '../../services/imageService';
import { useAppStore, ThemeColorType } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';

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
  const { user, updateProfile } = useAuthStore();
  const currentHealingColors = isDark ? { ...HEALING_COLORS, ...DARK_HEALING_COLORS } : HEALING_COLORS;
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectColor = (colorId: ThemeColorType) => {
    setThemeColor(colorId);
    // Home 页面在 Main Tab 中，需要先导航到 Main，再导航到内部的 Home
    (navigation as any).navigate('Main', { screen: 'Home' });
  };

  const handlePickBackground = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (!user?._id) {
          Alert.alert('提示', '请先登录后再设置自定义背景');
          return;
        }

        const asset = result.assets[0];
        setIsUploading(true);

        const extension = asset.mimeType?.split('/')[1] || 'jpg';
        const { data: pathData } = await imageService.generateCloudPath(
          extension,
          'background',
          user._id
        );

        const uploadResult = await imageService.uploadImage(
          asset.uri,
          pathData.cloudPath,
          asset.mimeType
        );

        if (uploadResult.success && uploadResult.data?.url) {
          await updateProfile(user._id, { profileBackground: uploadResult.data.url });
          Alert.alert('提示', '个人主页背景设置成功！');
        } else {
          throw new Error(uploadResult.message || '上传背景失败');
        }
      }
    } catch (error: any) {
      Alert.alert('提示', error.message || '设置背景失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearBackground = async () => {
    if (!user?._id) return;
    try {
      await updateProfile(user._id, { profileBackground: '' });
      Alert.alert('提示', '已恢复默认背景');
    } catch (error: any) {
      Alert.alert('提示', error.message || '恢复默认背景失败');
    }
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

        <Text style={[styles.sectionTitle, { color: isDark ? '#AAA' : HEALING_COLORS.gray[500], marginTop: 32 }]}>自定义主页背景</Text>
        <View style={[styles.backgroundCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <TouchableOpacity style={styles.backgroundSelector} onPress={handlePickBackground}>
            {user?.profileBackground ? (
              <Image source={{ uri: user.profileBackground }} style={styles.backgroundImage} />
            ) : (
              <View style={[styles.backgroundPlaceholder, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                <Feather name="image" size={24} color={isDark ? '#AAA' : HEALING_COLORS.gray[400]} />
                <Text style={[styles.backgroundText, { color: isDark ? '#AAA' : HEALING_COLORS.gray[400] }]}>点击上传背景图片</Text>
              </View>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          {user?.profileBackground && (
            <TouchableOpacity style={[styles.clearBackgroundBtn, { backgroundColor: isDark ? '#333' : '#FFF0F3' }]} onPress={handleClearBackground}>
              <Text style={[styles.clearBackgroundText, { color: currentHealingColors.pink[500] }]}>恢复默认背景</Text>
            </TouchableOpacity>
          )}
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
  backgroundCard: {
    padding: 20,
    borderRadius: HAND_DRAWN_STYLES.soft.borderRadius,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 40,
  },
  backgroundSelector: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backgroundPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  backgroundText: {
    marginTop: 8,
    fontSize: 14,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBackgroundBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  clearBackgroundText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ThemeSettingScreen;
