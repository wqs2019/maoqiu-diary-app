import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_DRAWN_STYLES, HEALING_COLORS } from '../../config/handDrawnTheme';
import feedbackService from '../../services/feedbackService';
import { useAuthStore } from '../../store/authStore';

const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeStyle = HAND_DRAWN_STYLES.soft;
  const user = useAuthStore((state) => state.user);

  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请先填写反馈内容哦～');
      return;
    }

    if (!user?._id) {
      Alert.alert('提示', '请先登录后再提交反馈～');
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        userId: user._id,
        type: feedbackType,
        content: content.trim(),
        contact: contact.trim(),
      });

      Alert.alert('发送成功！', '毛球已经收到你的反馈啦，我们会努力变得更好！🐾', [
        { text: '好的', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('提交失败', error.message || '网络开小差了，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeOption = (type: 'bug' | 'feature' | 'other', label: string, icon: string) => {
    const isSelected = feedbackType === type;
    return (
      <TouchableOpacity
        style={[
          styles.typeOption,
          isSelected && {
            backgroundColor: HEALING_COLORS.pink[50],
            borderColor: HEALING_COLORS.pink[300],
          },
        ]}
        onPress={() => setFeedbackType(type)}
        activeOpacity={0.7}
      >
        <Text style={styles.typeIcon}>{icon}</Text>
        <Text
          style={[
            styles.typeText,
            isSelected && { color: HEALING_COLORS.pink[600], fontWeight: '600' },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color={HEALING_COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>帮助与反馈</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingSection}>
          <Text style={styles.greetingEmoji}>💌</Text>
          <Text style={styles.greetingTitle}>Hi，遇到什么问题了吗？</Text>
          <Text style={styles.greetingSub}>无论是报错还是新想法，都欢迎告诉毛球～</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>反馈类型</Text>
          <View style={styles.typeContainer}>
            {renderTypeOption('bug', '遇到Bug', '🐛')}
            {renderTypeOption('feature', '新功能建议', '✨')}
            {renderTypeOption('other', '其他想说的', '💬')}
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>想对毛球说的话</Text>
          <TextInput
            style={[styles.textArea, { borderRadius: themeStyle.borderRadius }]}
            placeholder="请详细描述你遇到的问题或建议，毛球会认真阅读的..."
            placeholderTextColor={HEALING_COLORS.gray[400]}
            multiline
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
            maxLength={500}
          />
          <Text style={styles.wordCount}>{content.length}/500</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>联系方式（选填）</Text>
          <TextInput
            style={[styles.input, { borderRadius: themeStyle.borderRadius }]}
            placeholder="留下你的邮箱或微信，方便我们回复你"
            placeholderTextColor={HEALING_COLORS.gray[400]}
            value={contact}
            onChangeText={setContact}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              { borderRadius: themeStyle.borderRadius },
              (!content.trim() || isSubmitting) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>发送给毛球</Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingVertical: 12,
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
  greetingSection: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  greetingEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: HEALING_COLORS.gray[800],
    marginBottom: 8,
  },
  greetingSub: {
    fontSize: 14,
    color: HEALING_COLORS.gray[500],
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: HEALING_COLORS.gray[700],
    marginBottom: 12,
    marginLeft: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 6,
  },
  typeIcon: {
    fontSize: 20,
  },
  typeText: {
    fontSize: 13,
    color: HEALING_COLORS.gray[600],
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: HEALING_COLORS.gray[800],
    minHeight: 150,
  },
  wordCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: HEALING_COLORS.gray[400],
    marginTop: 8,
    marginRight: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFF0F3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: HEALING_COLORS.gray[800],
  },
  submitButton: {
    backgroundColor: HEALING_COLORS.pink[500],
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: HEALING_COLORS.pink[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default FeedbackScreen;
