import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';

import { useToast } from '../../components/common/Toast';
import { DatePicker } from '../../components/handDrawn/DatePicker';
import { HandDrawnButton } from '../../components/handDrawn/HandDrawnButton';
import { MediaSelector } from '../../components/handDrawn/MediaSelector';
import { MoodTabSelector } from '../../components/handDrawn/MoodTabSelector';
import { WeatherTabSelector } from '../../components/handDrawn/WeatherTabSelector';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useCreateDiary, useUpdateDiary, useDiaryDetail } from '../../hooks/useDiaryQuery';
import { useQueryClient } from '../../hooks/useQuery';
import { useVipGuard } from '../../hooks/useVipGuard';
import { textSafetyService } from '../../services/textSafetyService';
import { useAuthStore } from '../../store/authStore';
import { useNotebookStore } from '../../store/notebookStore';
import { ScenarioType, MoodType, WeatherType, MediaResource } from '../../types';

type EditDiaryRouteProp = RouteProp<
  { params: { scenario?: ScenarioType; diaryId?: string } },
  'params'
>;

const EditDiaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditDiaryRouteProp>();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const toast = useToast();
  const initialScenario = route.params?.scenario || 'daily';
  const diaryId = route.params?.diaryId;
  const isEditMode = !!diaryId;

  // 获取已有日记数据
  const { data: existingDiary } = useDiaryDetail(diaryId || '');

  const [scenario, setScenario] = React.useState<ScenarioType>(initialScenario);
  const [date, setDate] = React.useState(new Date());
  const [location, setLocation] = React.useState('');
  const [mood, setMood] = React.useState<MoodType | undefined>('happy');
  const [weather, setWeather] = React.useState<WeatherType | undefined>('sunny');
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [media, setMedia] = React.useState<MediaResource[]>([]);
  const [isPublic, setIsPublic] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [ipLocation, setIpLocation] = React.useState<string>('');
  const scenarioScrollRef = React.useRef<ScrollView>(null);
  const scenarioLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const [scenarioViewportWidth, setScenarioViewportWidth] = React.useState(0);
  const [scenarioContentWidth, setScenarioContentWidth] = React.useState(0);

  // 获取IP属地
  React.useEffect(() => {
    const fetchIpLocation = async () => {
      try {
        const response = await fetch('http://ip-api.com/json?lang=zh-CN');
        const data = await response.json();
        if (data.status === 'success') {
          const loc = data.countryCode === 'CN' ? data.regionName : data.country;
          if (loc) {
            setIpLocation(loc);
          }
        }
      } catch {
      }
    };
    fetchIpLocation();
  }, []);

  // 填充已有日记数据
  React.useEffect(() => {
    if (isEditMode && existingDiary) {
      setScenario(existingDiary.scenario);
      setDate(new Date(existingDiary.date || existingDiary.createdAt));
      setLocation(existingDiary.location || '');
      setMood(existingDiary.mood);
      setWeather(existingDiary.weather);
      setTitle(existingDiary.title || '');
      setContent(existingDiary.content || '');
      setMedia(existingDiary.media || []);
      setIsPublic(!!existingDiary.isPublic);
    }
  }, [isEditMode, existingDiary]);

  const template = SCENARIO_TEMPLATES[scenario];

  // 使用 useCreateDiary/useUpdateDiary 处理日记保存
  const createDiaryMutation = useCreateDiary();
  const updateDiaryMutation = useUpdateDiary();
  const user = useAuthStore((state) => state.user);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);
  const currentNotebook = user ? getCurrentNotebook(user._id) : null;
  const { checkVipPermission } = useVipGuard();

  const handleSave = async () => {
    // 防止重复点击
    if (isSaving) return;

    // 立即设置 loading 状态
    setIsSaving(true);

    try {
      if (!title.trim() && !content.trim()) {
        Alert.alert('提示', '请至少填写标题或内容哦～');
        return;
      }

      if (!checkVipPermission('writeDiary')) {
        return;
      }

      // --- 内容安全检测拦截 ---
      if (isPublic) {
        // 只有当用户选择公开分享时，才进行严格检测
        const isSafe = await textSafetyService.checkContentSafety(
          title.trim() + ' ' + content.trim()
        );
        if (!isSafe) {
          Alert.alert(
            '发布失败',
            '日记内容包含敏感词汇（如涉政、色情、暴恐等）。为了维护阳光健康的社区环境，请修改后再尝试发布哦～'
          );
          return;
        }
      }

      // 过滤掉未上传成功和仅在本地使用的状态字段
      // 尤其是兜底删除那些因为违规等原因上传失败，且用户没有主动删除的媒体
      // 注意：已有的媒体可能没有 uploadStatus，需要保留 (m.uploadStatus === undefined)
      const cleanMedia = media
        .filter((m) => m.uploadStatus === 'success' || m.uploadStatus === undefined)
        .map(({ uploadStatus, subUploadStatus, uploadError, ...rest }) => rest);

      if (!currentNotebook) {
        Alert.alert('提示', '未找到当前日记本');
        return;
      }

      const payload = {
        userId: user!._id,
        notebookId: currentNotebook._id,
        title: title.trim(),
        content: content.trim(),
        date: date.toISOString(), // 保存用户选择的日期
        scenario,
        mood: mood || 'normal',
        weather: weather || 'sunny',
        location: location.trim(),
        ipLocation,
        media: cleanMedia, // 总是发送 cleanMedia（包括空数组），确保删除所有媒体时能更新后端
        isPublic,
        authorInfo: {
          nickname: user?.nickname,
          avatar: user?.avatar,
        },
      };

      if (isEditMode) {
        updateDiaryMutation.mutate(
          {
            id: diaryId,
            ...payload,
          },
          {
            onSuccess: () => {
              toast.success('日记更新成功～');
              setTimeout(() => {
                navigation.goBack();
              }, 500);
            },
            onError: (error) => {
              console.error('Update diary error:', error);
              Alert.alert('更新失败', '请检查网络连接后重试', [{ text: '确定' }]);
            },
            onSettled: () => {
              setIsSaving(false);
            },
          }
        );
      } else {
        // 调用 mutation 保存日记
        createDiaryMutation.mutate(payload, {
          onSuccess: () => {
            toast.success('日记已保存到云端，继续记录美好时光吧～');
            setTimeout(() => {
              navigation.goBack();
            }, 500);
          },
          onError: (error) => {
            console.error('Save diary error:', error);
            Alert.alert('保存失败', '请检查网络连接后重试', [{ text: '确定' }]);
          },
          onSettled: () => {
            setIsSaving(false);
          },
        });
      }
    } catch (error) {
      console.error('Save diary error:', error);
      Alert.alert('保存失败', '请检查网络连接后重试', [{ text: '确定' }]);
      setIsSaving(false);
    }
  };

  const template1 = SCENARIO_TEMPLATES[scenario];

  // 处理拖动时的滚动禁用
  const [scrollEnabled, setScrollEnabled] = React.useState(true);

  const centerScenarioChip = React.useCallback((targetScenario: ScenarioType) => {
    const layout = scenarioLayoutsRef.current[targetScenario];
    if (!layout || scenarioViewportWidth <= 0) {
      return;
    }

    const targetX = layout.x + layout.width / 2 - scenarioViewportWidth / 2;
    const maxScrollX = Math.max(0, scenarioContentWidth - scenarioViewportWidth);
    const clampedX = Math.max(0, Math.min(targetX, maxScrollX));

    scenarioScrollRef.current?.scrollTo({ x: clampedX, animated: true });
  }, [scenarioContentWidth, scenarioViewportWidth]);

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      centerScenarioChip(scenario);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [centerScenarioChip, scenario]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F7F8FA' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
      >
        {/* 场景选择 */}
        <View
          style={styles.scenarioWrapper}
          onLayout={(event) => {
            setScenarioViewportWidth(event.nativeEvent.layout.width);
          }}
        >
          <ScrollView
            ref={scenarioScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scenarioScrollContainer}
            onContentSizeChange={(width) => {
              setScenarioContentWidth(width);
            }}
          >
            {(Object.keys(SCENARIO_TEMPLATES) as ScenarioType[]).map((type, index, array) => {
              const template = SCENARIO_TEMPLATES[type];
              const isSelected = type === scenario;
              // 简短的名称，去掉"记录"或"时刻"以节省空间
              const shortName = template.name.replace('记录', '').replace('时刻', '');

              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.compactChip, index !== array.length - 1 && styles.compactChipSpacing]}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    scenarioLayoutsRef.current[type] = { x, width };
                  }}
                  onPress={() => {
                    setScenario(type);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.compactIconWrapper,
                      { backgroundColor: isDark ? '#1E1E1E' : '#F0F0F0' },
                      isSelected && {
                        backgroundColor: template.color,
                        shadowColor: template.color,
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 4,
                      },
                    ]}
                  >
                    <Text style={styles.compactIcon}>{template.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.compactName,
                      { color: isDark ? '#AAA' : '#666' },
                      isSelected && { color: template.color, fontWeight: 'bold' },
                    ]}
                  >
                    {shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 编辑器卡片 */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <TextInput
            style={[styles.titleInput, { color: isDark ? '#FFF' : '#333' }]}
            placeholder={template1.placeholder}
            placeholderTextColor={isDark ? '#888' : '#CCC'}
            value={title}
            onChangeText={setTitle}
          />
          <View style={[styles.divider, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} />
          <TextInput
            style={[styles.contentInput, { color: isDark ? '#FFF' : '#444' }]}
            placeholder="记录今天的故事..."
            placeholderTextColor={isDark ? '#888' : '#CCC'}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={3000}
          />
          <Text style={[styles.charCount, { color: isDark ? '#888' : '#CCC' }]}>
            {content.length}/3000
          </Text>
        </View>

        {/* 媒体附件模块 */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
            styles.mediaCard,
          ]}
        >
          <MediaSelector
            media={media}
            onMediaChange={setMedia}
            maxCount={user?.isVip?.value ? 9 : 3}
            isVip={!!user?.isVip?.value}
            draggable
            onDragStart={() => {
              setScrollEnabled(false);
            }}
            onDragEnd={() => {
              setScrollEnabled(true);
            }}
          />
          {!user?.isVip?.value && (
            <Text style={[styles.vipHintText, { color: isDark ? '#888' : '#999' }]}>
              开通 VIP 可上传最多 9 张图片/视频
            </Text>
          )}
        </View>

        {/* 属性卡片 (日期、地点、心情、天气) */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <DatePicker selectedDate={date} onDateChange={setDate} label="日期" />
          <View
            style={[
              styles.divider,
              { borderBottomColor: isDark ? '#333' : '#F0F0F0', marginVertical: 8 },
            ]}
          />

          <View style={styles.locationRow}>
            <Text style={[styles.metadataLabel, { color: isDark ? '#AAA' : '#666' }]}>地点</Text>
            <TextInput
              style={[styles.locationInput, { color: isDark ? '#FFF' : '#333' }]}
              placeholder="📍 添加地点（选填）"
              placeholderTextColor={isDark ? '#888' : '#CCC'}
              value={location}
              onChangeText={setLocation}
            />
          </View>
          <View
            style={[
              styles.divider,
              { borderBottomColor: isDark ? '#333' : '#F0F0F0', marginVertical: 8 },
            ]}
          />

          <MoodTabSelector selectedMood={mood} onSelectMood={setMood} />
          <View
            style={[
              styles.divider,
              { borderBottomColor: isDark ? '#333' : '#F0F0F0', marginVertical: 8 },
            ]}
          />

          <WeatherTabSelector selectedWeather={weather} onSelectWeather={setWeather} />
        </View>

        {/* 权限设置卡片 */}
        <View
          style={[
            styles.card,
            styles.switchCard,
            { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
          ]}
        >
          <View style={styles.switchInfo}>
            <Text style={[styles.switchTitle, { color: isDark ? '#FFF' : '#333' }]}>
              🌍 分享到圈子
            </Text>
            <Text style={[styles.switchSubtitle, { color: isDark ? '#AAA' : '#999' }]}>
              让所有人都能看到这篇美好的日记
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: isDark ? '#555' : '#E5E5E5', true: HEALING_COLORS.pink[400] }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 保存按钮 */}
        <View style={styles.saveButtonContainer}>
          <HandDrawnButton
            title={isEditMode ? '更新日记' : '保存日记'}
            size="large"
            onPress={handleSave}
            color={HEALING_COLORS.pink[500]}
            buttonStyle={styles.fullWidthButton}
            isLoading={isSaving}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  scenarioWrapper: {
    marginBottom: 16,
  },
  scenarioScrollContainer: {
    paddingHorizontal: 20,
    paddingRight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 55,
  },
  compactChipSpacing: {
    marginRight: 14,
  },
  compactIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactIcon: {
    fontSize: 20,
  },
  compactName: {
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: 1,
  },
  contentInput: {
    fontSize: 17,
    minHeight: 200,
    lineHeight: 28,
    paddingVertical: 20,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  mediaCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  vipHintText: {
    fontSize: 12,
    textAlign: 'left',
    marginTop: 12,
  },
  metadataLabel: {
    fontSize: 15,
    fontWeight: '600',
    width: 60,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  switchInfo: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  switchSubtitle: {
    fontSize: 13,
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
});

export default EditDiaryScreen;
