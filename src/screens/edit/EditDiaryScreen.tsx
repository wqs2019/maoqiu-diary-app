import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { HEALING_COLORS } from '../../config/handDrawnTheme';
import { SCENARIO_TEMPLATES } from '../../config/scenarioTemplates';
import { ScenarioType, MoodType, WeatherType, TagType } from '../../types';
import { HandDrawnButton } from '../../components/handDrawn/HandDrawnButton';
import { DatePicker } from '../../components/handDrawn/DatePicker';
import { MoodTabSelector } from '../../components/handDrawn/MoodTabSelector';
import { WeatherTabSelector } from '../../components/handDrawn/WeatherTabSelector';
import { TagTabSelector } from '../../components/handDrawn/TagTabSelector';
import { ScenarioChip } from '../../components/handDrawn/ScenarioChip';
import { createDiary } from '../../services/diaryService';

type EditDiaryRouteProp = RouteProp<{ params: { scenario?: ScenarioType; diaryId?: string } }, 'params'>;

const EditDiaryScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<EditDiaryRouteProp>();
    const initialScenario = route.params?.scenario || 'daily';

    const [scenario, setScenario] = React.useState<ScenarioType>(initialScenario);
    const [date, setDate] = React.useState(new Date());
    const [location, setLocation] = React.useState('');
    const [mood, setMood] = React.useState<MoodType | undefined>();
    const [weather, setWeather] = React.useState<WeatherType | undefined>();
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState('');
    const [tags, setTags] = React.useState<TagType[]>([]);

    const template = SCENARIO_TEMPLATES[scenario];

    // 使用 useMutation 处理日记保存
    const createDiaryMutation = useMutation({
        mutationFn: createDiary,
        onSuccess: () => {
            Alert.alert('✨ 太棒了！', '日记已保存到云端，继续记录美好时光吧～', [
                { text: '好的', onPress: () => navigation.goBack() },
            ]);
        },
        onError: (error) => {
            console.error('Save diary error:', error);
            Alert.alert('保存失败', '请检查网络连接后重试', [
                { text: '确定' },
            ]);
        },
    });

    const handleSave = () => {
        if (!title.trim() && !content.trim()) {
            Alert.alert('提示', '请至少填写标题或内容哦～');
            return;
        }

        // 调用 mutation 保存日记
        createDiaryMutation.mutate({
            title: title.trim(),
            content: content.trim(),
            scenario,
            mood: mood || 'normal',
            weather: weather || 'sunny',
            location: location.trim(),
            tags,
            images: [],
        });
    };

    const handleToggleTag = (tag: TagType) => {
        setTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const template1 = SCENARIO_TEMPLATES[scenario];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>记录{template1.name}</Text>
                {createDiaryMutation.isPending ? (
                    <ActivityIndicator size="small" color={HEALING_COLORS.pink[500]} />
                ) : (
                    <HandDrawnButton
                        title="保存"
                        size="small"
                        onPress={handleSave}
                    />
                )}
            </View>

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
                                onPress={() => setScenario(type)}
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
                    <DatePicker
                        selectedDate={date}
                        onDateChange={setDate}
                        label="日期"
                    />
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
                    <MoodTabSelector
                        selectedMood={mood}
                        onSelectMood={setMood}
                    />
                </View>

                {/* 天气选择 */}
                <View style={styles.section}>
                    <WeatherTabSelector
                        selectedWeather={weather}
                        onSelectWeather={setWeather}
                    />
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

                {/* 标签选择 */}
                <View style={styles.section}>
                    <TagTabSelector
                        selectedTags={tags}
                        onToggleTag={handleToggleTag}
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
});

export default EditDiaryScreen;
