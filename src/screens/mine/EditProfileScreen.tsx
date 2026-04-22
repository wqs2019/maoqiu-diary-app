import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { imageService } from '../../services/imageService';
import { useAuthStore } from '../../store/authStore';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuthStore();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const { isDark } = useAppTheme();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [gender, setGender] = useState<'male' | 'female' | 'secret'>(user?.gender || 'secret');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 监听 user 对象变化，确保首次进入页面时能够填充表单数据
  useEffect(() => {
    if (user && !nickname && !avatar) {
      setNickname(user.nickname || '');
      setAvatar(user.avatar || '');
      setGender(user.gender || 'secret');
      setAge(user.age ? String(user.age) : '');
    }
  }, [user]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);

        const extension = asset.mimeType?.split('/')[1] || 'jpg';
        const { data: pathData } = await imageService.generateCloudPath(extension, 'avatar');

        const uploadResult = await imageService.uploadImage(
          asset.uri,
          pathData.cloudPath,
          asset.mimeType
        );

        if (uploadResult.success && uploadResult.data?.url) {
          setAvatar(uploadResult.data.url);
        } else {
          throw new Error(uploadResult.message || '上传头像失败');
        }
      }
    } catch (error: any) {
      Alert.alert('提示', error.message || '更换头像失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?._id) return;
    if (!nickname.trim()) {
      Alert.alert('提示', '昵称不能为空哦～');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(user._id, {
        nickname: nickname.trim(),
        avatar,
        gender,
        age: age ? parseInt(age, 10) : undefined,
      });
      Alert.alert('✨ 太棒了！', '个人信息更新成功', [
        {
          text: '好的',
          onPress: () => {
            // 返回上一个页面（通常是“我的”页面）
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请检查网络连接后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const renderGenderOption = (
    value: 'male' | 'female' | 'secret',
    label: string,
    icon: keyof typeof Feather.glyphMap
  ) => {
    const isSelected = gender === value;
    return (
      <TouchableOpacity
        style={[
          styles.genderOption,
          { backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#FFF0F3' },
          isSelected && {
            backgroundColor: isDark ? '#2C1B24' : HEALING_COLORS.pink[50],
            borderColor: isDark ? '#4A2533' : HEALING_COLORS.pink[300],
          },
        ]}
        onPress={() => {
          setGender(value);
        }}
      >
        <Feather
          name={icon}
          size={20}
          color={isSelected ? HEALING_COLORS.pink[500] : (isDark ? '#AAA' : HEALING_COLORS.gray[400])}
        />
        <Text
          style={[
            styles.genderText,
            { color: isDark ? '#AAA' : HEALING_COLORS.gray[600] },
            isSelected && { color: isDark ? HEALING_COLORS.pink[400] : HEALING_COLORS.pink[600], fontWeight: '600' },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: isDark ? '#121212' : '#FAFAFA', borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Feather name="chevron-left" size={24} color={isDark ? '#FFF' : HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}>编辑个人资料</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        indicatorStyle={isDark ? 'white' : 'black'}
      >
        {/* 头像区域 */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={handlePickAvatar} 
            style={[
              styles.avatarContainer, 
              { 
                borderColor: isDark ? '#333' : '#FFF',
                shadowColor: isDark ? '#000' : HEALING_COLORS.pink[400]
              }
            ]}
          >
            <Image
              source={
                avatar
                  ? { uri: avatar }
                  : {
                      uri: `https://api.dicebear.com/7.x/notionists/png?seed=${nickname || 'Maoqiu'}`,
                    }
              }
              fadeDuration={0}
              style={styles.avatarImage}
              resizeMode="cover"
            />
            <View style={styles.avatarOverlay}>
              {isUploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Feather name="camera" size={24} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: isDark ? '#AAA' : HEALING_COLORS.gray[500] }]}>点击更换头像</Text>
        </View>

        {/* 表单区域 */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#FFF' : HEALING_COLORS.gray[700] }]}>昵称</Text>
            <TextInput
              style={[styles.input, { borderRadius: themeStyle.borderRadius, backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#FFF0F3', color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入可爱的昵称"
              placeholderTextColor={isDark ? '#888' : HEALING_COLORS.gray[400]}
              maxLength={16}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#FFF' : HEALING_COLORS.gray[700] }]}>性别</Text>
            <View style={styles.genderContainer}>
              {renderGenderOption('female', '女生', 'user')}
              {renderGenderOption('male', '男生', 'user')}
              {renderGenderOption('secret', '保密', 'eye-off')}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#FFF' : HEALING_COLORS.gray[700] }]}>年龄</Text>
            <TextInput
              style={[styles.input, { borderRadius: themeStyle.borderRadius, backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderColor: isDark ? '#333' : '#FFF0F3', color: isDark ? '#FFF' : HEALING_COLORS.gray[800] }]}
              value={age}
              onChangeText={setAge}
              placeholder="你今年多大啦？"
              placeholderTextColor={isDark ? '#888' : HEALING_COLORS.gray[400]}
              keyboardType="number-pad"
              maxLength={3}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { borderRadius: themeStyle.borderRadius, shadowColor: isDark ? '#000' : HEALING_COLORS.pink[500] },
            isSaving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={isSaving || isUploading}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>保存修改</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: HEALING_COLORS.gray[800],
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: HEALING_COLORS.pink[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 13,
    color: HEALING_COLORS.gray[500],
  },
  formSection: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: HEALING_COLORS.gray[700],
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: HEALING_COLORS.gray[800],
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 6,
  },
  genderText: {
    fontSize: 15,
    color: HEALING_COLORS.gray[600],
    fontWeight: '500',
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: HEALING_COLORS.pink[500],
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: HEALING_COLORS.pink[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default EditProfileScreen;
