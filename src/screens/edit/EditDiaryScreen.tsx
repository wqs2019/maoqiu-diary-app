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
  ActivityIndicator,
  Switch,
  TouchableOpacity,
} from 'react-native';

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
  const { checkVipPermission } = useVipGuard();

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('提示', '请至少填写标题或内容哦～');
      return;
    }

    if (!checkVipPermission('writeDiary')) {
      return;
    }

    // 过滤掉仅在本地使用的状态字段
    const cleanMedia = media.map(({ uploadStatus, uploadError, ...rest }) => rest);

    const currentNotebook = getCurrentNotebook(user!._id);

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
      media: cleanMedia.length > 0 ? cleanMedia : undefined,
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
            Alert.alert('✨ 太棒了！', '日记更新成功～', [
              {
                text: '好的',
                onPress: () => {
                  navigation.goBack();
                },
              },
            ]);
          },
          onError: (error) => {
            console.error('Update diary error:', error);
            Alert.alert('更新失败', '请检查网络连接后重试', [{ text: '确定' }]);
          },
        }
      );
    } else {
      // 调用 mutation 保存日记
      createDiaryMutation.mutate(payload, {
        onSuccess: () => {
          Alert.alert('✨ 太棒了！', '日记已保存到云端，继续记录美好时光吧～', [
            {
              text: '好的',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]);
        },
        onError: (error) => {
          console.error('Save diary error:', error);
          Alert.alert('保存失败', '请检查网络连接后重试', [{ text: '确定' }]);
        },
      });
    }
  };

  const template1 = SCENARIO_TEMPLATES[scenario];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F7F8FA' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 场景选择 */}
        <View style={styles.scenarioWrapper}>
          <View style={styles.scenarioGrid}>
            {(Object.keys(SCENARIO_TEMPLATES) as ScenarioType[]).map((type) => {
              const template = SCENARIO_TEMPLATES[type];
              const isSelected = type === scenario;
              // 简短的名称，去掉"记录"或"时刻"以节省空间
              const shortName = template.name.replace('记录', '').replace('时刻', '');

              return (
                <TouchableOpacity
                  key={type}
                  style={styles.compactChip}
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
          </View>
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
          <MediaSelector media={media} onMediaChange={setMedia} maxCount={9} draggable />
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
          {createDiaryMutation.isPending || updateDiaryMutation.isPending ? (
            <ActivityIndicator size="large" color={HEALING_COLORS.pink[500]} />
          ) : (
            <HandDrawnButton
              title={isEditMode ? '更新日记' : '保存日记'}
              size="large"
              onPress={handleSave}
              color={HEALING_COLORS.pink[500]}
              buttonStyle={styles.fullWidthButton}
            />
          )}
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
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  scenarioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  compactChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
  },
  compactIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
