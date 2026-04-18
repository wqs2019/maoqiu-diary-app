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
} from 'react-native';

import { DatePicker } from '../../components/handDrawn/DatePicker';
import { HandDrawnButton } from '../../components/handDrawn/HandDrawnButton';
import { MediaSelector } from '../../components/handDrawn/MediaSelector';
import { MoodTabSelector } from '../../components/handDrawn/MoodTabSelector';
import { ScenarioChip } from '../../components/handDrawn/ScenarioChip';
import { WeatherTabSelector } from '../../components/handDrawn/WeatherTabSelector';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { useCreateDiary, useUpdateDiary, useDiaryDetail } from '../../hooks/useDiaryQuery';
import { useQueryClient } from '../../hooks/useQuery';
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

  // 填充已有日记数据
  React.useEffect(() => {
    if (isEditMode && existingDiary) {
      setScenario(existingDiary.scenario);
      setDate(new Date(existingDiary.date || existingDiary.createdAt));
      setLocation(existingDiary.location || '');
      setMood(existingDiary.mood);
      setWeather(existingDiary.weather);
      setTitle(existingDiary.title);
      setContent(existingDiary.content);
      setMedia(existingDiary.media || []);
    }
  }, [isEditMode, existingDiary]);

  const template = SCENARIO_TEMPLATES[scenario];

  // 使用 useCreateDiary/useUpdateDiary 处理日记保存
  const createDiaryMutation = useCreateDiary();
  const updateDiaryMutation = useUpdateDiary();
  const user = useAuthStore((state) => state.user);
  const getCurrentNotebook = useNotebookStore((state) => state.getCurrentNotebook);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('提示', '请至少填写标题或内容哦～');
      return;
    }

    if (!user?._id) {
      Alert.alert('提示', '用户未登录，请重新登录');
      return;
    }

    // 过滤掉仅在本地使用的状态字段
    const cleanMedia = media.map(({ uploadStatus, uploadError, ...rest }) => rest);

    const currentNotebook = getCurrentNotebook(user._id);

    const payload = {
      userId: user._id,
      notebookId: currentNotebook._id,
      title: title.trim(),
      content: content.trim(),
      date: date.toISOString(), // 保存用户选择的日期
      scenario,
      mood: mood || 'normal',
      weather: weather || 'sunny',
      location: location.trim(),
      media: cleanMedia.length > 0 ? cleanMedia : undefined,
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 场景选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择场景</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(Object.keys(SCENARIO_TEMPLATES) as ScenarioType[]).map((type) => (
              <ScenarioChip
                key={type}
                type={type}
                selected={type === scenario}
                onPress={() => {
                  setScenario(type);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* 标题 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>标题</Text>
          <TextInput
            style={[styles.input, styles.titleInput]}
            placeholder={template1.placeholder}
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* 日期选择 */}
        <View style={styles.section}>
          <DatePicker selectedDate={date} onDateChange={setDate} label="日期" />
        </View>

        {/* 地点 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>地点</Text>
          <TextInput
            style={styles.input}
            placeholder="📍 添加地点（选填）"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* 心情选择 */}
        <View style={styles.section}>
          <MoodTabSelector selectedMood={mood} onSelectMood={setMood} />
        </View>

        {/* 天气选择 */}
        <View style={styles.section}>
          <WeatherTabSelector selectedWeather={weather} onSelectWeather={setWeather} />
        </View>

        {/* 内容 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>想法</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            placeholder="记录今天的故事..."
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 媒体附件选择 */}
        <MediaSelector media={media} onMediaChange={setMedia} maxCount={9} draggable />

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#666',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  titleInput: {
    fontWeight: '600',
  },
  contentInput: {
    minHeight: 150,
    lineHeight: 24,
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
});

export default EditDiaryScreen;
