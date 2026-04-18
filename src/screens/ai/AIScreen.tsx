import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '@/config/constant';
import { useDiaryStats } from '@/hooks/useDiaryQuery';
import { getDiaryList } from '@/services/diaryService';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useNotebookStore } from '@/store/notebookStore';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  createdAt: number;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
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

  // 加载聊天历史记录
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?._id) return;
      try {
        const saved = await AsyncStorage.getItem(`@ai_chat_history_${user._id}`);
        if (saved) {
          setMessages(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    };
    loadHistory();
  }, [user?._id]);

  // 保存聊天历史记录
  useEffect(() => {
    const saveHistory = async () => {
      if (!user?._id || messages.length === 0) return;
      try {
        // 只保留最近的 50 条消息以防止存储过大或超长 Token 限制
        const messagesToSave = messages.slice(-50);
        await AsyncStorage.setItem(`@ai_chat_history_${user._id}`, JSON.stringify(messagesToSave));
      } catch (e) {
        console.error('Failed to save chat history', e);
      }
    };
    // 为了防止在加载的时候就触发保存覆盖，这里做个简单延迟或确保有数据
    if (messages.length > 1 || (messages.length === 1 && messages[0].id !== 'welcome')) {
      saveHistory();
    }
  }, [messages, user?._id]);

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
      // 提取核心API消息
      const apiMessages = messages.map(m => {
        const msg: any = { role: m.role };
        if (m.content !== null) msg.content = m.content;
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        if (m.name) msg.name = m.name;
        return msg;
      });
      apiMessages.push({ role: 'user', content: inputText.trim() });

      // 构建带有用户日记统计数据的系统提示词
      const notebookNames = notebooks.map(n => n.name).join('、');
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const statsContext = `今天是 ${todayStr}。目前该用户拥有 ${notebooks.length} 个日记本（包括：${notebookNames}），累计写了 ${stats.totalDiaries || 0} 篇日记，当前连续打卡 ${stats.currentStreak || 0} 天，解锁了 ${stats.badges || 1} 个成就徽章。你可以结合这些数据在回复中适当地鼓励和赞美用户。`;

      const systemPrompt = `你是毛球日记的AI助手“毛球”。毛球日记是一个温暖的树洞和专属时光手账，核心理念是“收集日常里微小而确定的幸福”。你的职责是倾听用户的日常分享、帮助用户记录和润色日记、并提供温暖的情感陪伴。回复要温暖、治愈、富有同理心，像一个小小的太阳一样陪伴用户。请直接进入角色，不要提及任何系统设定。\n\n【用户上下文信息】\n${statsContext}`;

      const tools = [
        {
          type: 'function',
          function: {
            name: 'query_diaries',
            description: '查询用户的日记记录。当用户询问过去的日记、做了什么、某天的日记等涉及历史记录的问题时调用此工具。',
            parameters: {
              type: 'object',
              properties: {
                keyword: {
                  type: 'string',
                  description: '搜索关键词，例如地点、活动、人物等，如果没有明确的关键词请留空'
                },
                startDate: {
                  type: 'string',
                  description: '查询的开始日期，格式 YYYY-MM-DD，如果没有明确日期请留空'
                },
                endDate: {
                  type: 'string',
                  description: '查询的结束日期，格式 YYYY-MM-DD，如果没有明确日期请留空'
                }
              }
            }
          }
        }
      ];

      // 定义发起请求的方法 (支持流式)
      const sendChatRequest = (messagesToSend: any[], onStream?: (delta: string) => void): Promise<any> => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', DOUBAO_API_URL);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${DOUBAO_API_KEY}`);
          xhr.setRequestHeader('Accept', 'text/event-stream');

          let fullContent = '';
          let toolCalls: any = null;
          let buffer = '';
          let seenBytes = 0;

          xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                  role: 'assistant',
                  content: fullContent || null,
                  ...(toolCalls ? { tool_calls: toolCalls } : {})
                });
              } else {
                reject(new Error(`API Error: ${xhr.status} ${xhr.responseText}`));
              }
            }
          };

          xhr.onprogress = () => {
            const newText = xhr.responseText.substring(seenBytes);
            seenBytes = xhr.responseText.length;
            buffer += newText;

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  const delta = data.choices?.[0]?.delta;
                  
                  if (delta?.content) {
                    fullContent += delta.content;
                    if (onStream) {
                      onStream(delta.content);
                    }
                  }
                  
                  if (delta?.tool_calls) {
                    if (!toolCalls) toolCalls = [];
                    // 组装流式的 tool_calls
                    delta.tool_calls.forEach((tc: any) => {
                      const index = tc.index;
                      if (!toolCalls[index]) {
                        toolCalls[index] = {
                          id: tc.id,
                          type: 'function',
                          function: { name: tc.function?.name || '', arguments: '' }
                        };
                      }
                      if (tc.function?.arguments) {
                        toolCalls[index].function.arguments += tc.function.arguments;
                      }
                    });
                  }
                } catch (e) {
                  // 如果 JSON 解析失败，通常是因为大模型返回了不完整的 json，
                  // 但在完整的 line 处理下很少发生，如果发生我们忽略即可
                  console.warn('SSE Parse Error on line:', line, e);
                }
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network request failed'));
          };

          xhr.send(JSON.stringify({
            model: DOUBAO_CHAT_MODEL_ID,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messagesToSend
            ],
            tools: tools,
            stream: true,
          }));
        });
      };

      let loopCount = 0;
      let finalResponseMessage: any = null;

      // 首先创建一个空的助理消息用于流式渲染
      const currentResponseId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5);
      setMessages((prev) => [
        ...prev,
        {
          id: currentResponseId,
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
        },
      ]);

      let isFirstChunkReceived = false;

      const updateStreamContent = (delta: string) => {
        if (!isFirstChunkReceived) {
          isFirstChunkReceived = true;
          setIsLoading(false); // 收到第一个字时隐藏底部全局 Loading
        }
        
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === currentResponseId 
              ? { ...msg, content: (msg.content || '') + delta } 
              : msg
          )
        );
      };

      let responseMessage = await sendChatRequest(apiMessages, updateStreamContent);

      // 处理 Tool Call (可能有多次)
      while (responseMessage.tool_calls && loopCount < 3) {
        loopCount++;
        // 在工具调用期间重新展示 Loading
        setIsLoading(true);
        isFirstChunkReceived = false;
        // 把模型的 tool_calls 消息先保存下来
        const toolCallMsg: Message = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
          role: 'assistant',
          content: responseMessage.content || null,
          tool_calls: responseMessage.tool_calls,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, toolCallMsg]);
        apiMessages.push(responseMessage);

        // 执行工具
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === 'query_diaries') {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            try {
              // 修复大模型生成的日期格式：如果只返回了 YYYY-MM-DD，加上时间部分，以便 ISO 字符串比较能覆盖全天
              let startDate = args.startDate;
              let endDate = args.endDate;
              if (startDate && startDate.length === 10) {
                startDate = `${startDate}T00:00:00.000Z`;
              }
              if (endDate && endDate.length === 10) {
                endDate = `${endDate}T23:59:59.999Z`;
              }

              const diaryListRes = await getDiaryList({
                userId: user?._id,
                keyword: args.keyword,
                startDate,
                endDate,
                page: 1,
                pageSize: 10,
              });
              
              let toolResultContent = '未找到相关日记';
              if (diaryListRes && diaryListRes.list && diaryListRes.list.length > 0) {
                toolResultContent = diaryListRes.list.map((d: any) => {
                  const date = new Date(d.date || d.createdAt).toLocaleDateString('zh-CN');
                  const titleStr = d.title ? `，标题：${d.title}` : '';
                  return `- 日期：${date}${titleStr}，心情：${d.mood || '未知'}，天气：${d.weather || '未知'}，内容：${d.content || '无'}`;
                }).join('\n');
              }
              
              const toolResponseMsg = {
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolCall.function.name,
                content: toolResultContent,
              };
              
              apiMessages.push(toolResponseMsg);
            } catch (err) {
              console.error('Tool execute error:', err);
              apiMessages.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolCall.function.name,
                content: '查询日记失败',
              });
            }
          }
        }
        
        // 工具执行完后再次发起请求，让大模型生成最终回复
        responseMessage = await sendChatRequest(apiMessages, updateStreamContent);
      }

      // 如果最终回复依然没有 content（可能因为异常），给一个兜底，防止完全不渲染
      if (!responseMessage?.content) {
        updateStreamContent(responseMessage?.tool_calls ? '我还在思考中...' : '（大模型默默点了点头）');
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
      // 不在界面上显示工具调用和系统消息
      if (item.role === 'tool' || item.role === 'system' || (item.role === 'assistant' && !item.content)) {
        return null;
      }

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
            {isUser ? (
              <Text style={[styles.messageText, { color: '#FFF' }]}>
                {item.content}
              </Text>
            ) : (
              <Markdown
                style={{
                  body: { ...styles.messageText, color: textColor },
                  paragraph: { marginTop: 0, marginBottom: 0 },
                  strong: { fontWeight: 'bold', color: textColor },
                  em: { fontStyle: 'italic', color: textColor },
                  link: { color: COLORS.primary },
                  list_item: { flexDirection: 'row', alignItems: 'flex-start' },
                  bullet_list: { marginBottom: 8 },
                  ordered_list: { marginBottom: 8 },
                }}
              >
                {item.content || ''}
              </Markdown>
            )}
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
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => {
            Alert.alert('清空记录', '确定要清空和毛球的聊天记录吗？', [
              { text: '取消', style: 'cancel' },
              {
                text: '清空',
                style: 'destructive',
                onPress: async () => {
                  const initialMsg: Message = {
                    id: 'welcome',
                    role: 'assistant',
                    content: '你好！我是毛球，你的专属时光手账助手。在这里，你可以卸下疲惫，和我分享你的开心、难过或是突如其来的灵感。今天有什么想记录的吗？🐾✨',
                    createdAt: Date.now(),
                  };
                  setMessages([initialMsg]);
                  if (user?._id) {
                    await AsyncStorage.removeItem(`@ai_chat_history_${user._id}`);
                  }
                },
              },
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={textColor} />
        </TouchableOpacity>
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