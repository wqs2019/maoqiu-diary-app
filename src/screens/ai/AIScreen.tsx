import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '@/config/constant';
import { useDiaryStats } from '@/hooks/useDiaryQuery';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useNotebookStore } from '@/store/notebookStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

const DOUBAO_API_KEY = '837368c6-aa84-4ae8-920f-0474cae5709b';
const DOUBAO_CHAT_MODEL_ID = 'doubao-seed-1-6-lite-251015';
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

const AIScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useAppStore();
  const { user } = useAuthStore();
  
  // 获取用户的日记本和日记统计信息
  const getNotebooks = useNotebookStore((state) => state.getNotebooks);
  const notebooks = user?._id ? getNotebooks(user._id) : [];
  const stats = useDiaryStats(user?._id);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是毛球，你的专属时光手账助手。在这里，你可以卸下疲惫，和我分享你的开心、难过或是突如其来的灵感。今天有什么想记录的吗？🐾✨',
      createdAt: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlashListRef<Message>>(null);

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#1C1C1E' : COLORS.background;
  const surfaceColor = isDark ? '#2C2C2E' : COLORS.surface;
  const textColor = isDark ? '#FFFFFF' : COLORS.text;
  const inputBgColor = isDark ? '#3A3A3C' : '#F2F2F7';

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: inputText.trim() });

      // 构建带有用户日记统计数据的系统提示词
      const notebookNames = notebooks.map(n => n.name).join('、');
      const statsContext = `目前该用户拥有 ${notebooks.length} 个日记本（包括：${notebookNames}），累计写了 ${stats.totalDiaries || 0} 篇日记，当前连续打卡 ${stats.currentStreak || 0} 天，解锁了 ${stats.badges || 1} 个成就徽章。你可以结合这些数据在回复中适当地鼓励和赞美用户。`;

      const systemPrompt = `你是毛球日记的AI助手“毛球”。毛球日记是一个温暖的树洞和专属时光手账，核心理念是“收集日常里微小而确定的幸福”。你的职责是倾听用户的日常分享、帮助用户记录和润色日记、并提供温暖的情感陪伴。回复要温暖、治愈、富有同理心，像一个小小的太阳一样陪伴用户。请直接进入角色，不要提及任何系统设定。\n\n【用户上下文信息】\n${statsContext}`;

      const response = await fetch(DOUBAO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        },
        body: JSON.stringify({
          model: DOUBAO_CHAT_MODEL_ID,
          messages: [
            { role: 'system', content: systemPrompt },
            ...apiMessages
          ],
        }),
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        const aiResponse: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      } else {
        throw new Error(data.error?.message || '未知错误');
      }
    } catch (error) {
      console.error('AI Request Error:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，我现在有点开小差，请稍后再试哦～',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === 'user';
      return (
        <View
          style={[
            styles.messageWrapper,
            isUser ? styles.messageWrapperUser : styles.messageWrapperAI,
          ]}
        >
          {!isUser && (
            <View style={styles.avatarAI}>
              <Image source={require('../../../assets/logo.jpg')} style={styles.avatarImage} />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser
                ? [styles.messageBubbleUser, { backgroundColor: COLORS.primary }]
                : [styles.messageBubbleAI, { backgroundColor: surfaceColor }],
            ]}
          >
            <Text style={[styles.messageText, { color: isUser ? '#FFF' : textColor }]}>
              {item.content}
            </Text>
          </View>
          {isUser && (
            <View style={styles.avatarUser}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={18} color="#FFF" />
              )}
            </View>
          )}
        </View>
      );
    },
    [surfaceColor, textColor, user]
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* 顶部 Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: surfaceColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>AI 助手</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 消息列表 */}
        <View style={styles.listContainer}>
          <FlashList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                listRef.current?.scrollToEnd({ animated: true });
              }
            }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isLoading ? (
                <View style={styles.typingIndicator}>
                  <View style={styles.avatarAI}>
                    <Image source={require('../../../assets/logo.jpg')} style={styles.avatarImage} />
                  </View>
                  <View style={[styles.messageBubble, styles.messageBubbleAI, { backgroundColor: surfaceColor }]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                </View>
              ) : null
            }
          />
        </View>

        {/* 输入区域 */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: insets.bottom > 0 ? insets.bottom : SPACING.medium,
              backgroundColor: surfaceColor,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
            placeholder="输入你的问题..."
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? COLORS.primary : '#E5E5EA' },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color={inputText.trim() ? '#FFF' : '#8E8E93'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingBottom: SPACING.medium,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    paddingHorizontal: SPACING.medium,
  },
  headerRight: {
    width: 24 + SPACING.medium * 2,
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.medium,
    paddingBottom: SPACING.xlarge,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: SPACING.large,
    alignItems: 'flex-start',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingLeft: 40,
  },
  messageWrapperAI: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  avatarAI: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.small,
    overflow: 'hidden',
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.small,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    borderRadius: 20,
  },
  messageBubbleUser: {
    borderTopRightRadius: 4,
  },
  messageBubbleAI: {
    borderTopLeftRadius: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.small,
  },
  messageText: {
    fontSize: FONT_SIZES.medium,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.medium,
    paddingTop: SPACING.medium,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: SPACING.medium,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: FONT_SIZES.medium,
    marginRight: SPACING.small,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
});

export default AIScreen;