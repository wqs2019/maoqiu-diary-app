# 毛球日记 - 组件文档

## 📋 目录

1. [组件概览](#组件概览)
2. [基础组件](#基础组件)
3. [手绘风格组件](#手绘风格组件)
4. [使用指南](#使用指南)
5. [设计规范](#设计规范)
6. [最佳实践](#最佳实践)

## 组件概览

### 组件库结构

```
src/components/
├── handDrawn/           # 手绘风格组件
│   ├── HandDrawnButton.tsx
│   ├── HandDrawnCard.tsx
│   ├── ScenarioChip.tsx
│   ├── MoodSelector.tsx
│   ├── WeatherTabSelector.tsx
│   ├── TagTabSelector.tsx
│   ├── MascotCharacter.tsx
│   ├── TimelineView.tsx
│   ├── PhotoWall.tsx
│   ├── CategoryFilter.tsx
│   ├── DatePicker.tsx
│   └── index.ts
└── Button.tsx          # 基础按钮
```

### 组件分类

#### 基础组件
- `Button` - 基础按钮组件

#### 手绘风格组件
- `HandDrawnButton` - 手绘风格按钮
- `HandDrawnCard` - 手绘风格卡片
- `ScenarioChip` - 场景标签
- `MoodSelector` - 心情选择器
- `WeatherTabSelector` - 天气选择器
- `TagTabSelector` - 标签选择器
- `MascotCharacter` - 萌宠角色
- `TimelineView` - 时间轴视图
- `PhotoWall` - 照片墙
- `CategoryFilter` - 分类筛选器
- `DatePicker` - 日期选择器

## 基础组件

### Button

**文件位置**: `src/components/Button.tsx`

**说明**: 基础按钮组件，提供多种样式和尺寸选择。

**Props**:
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}
```

**使用示例**:
```typescript
import { Button } from '@/components/Button';

// 主要按钮
<Button
  title="提交"
  onPress={handleSubmit}
  variant="primary"
/>

// 带图标的按钮
<Button
  title="继续"
  onPress={handleContinue}
  icon="→"
  variant="secondary"
/>

// 禁用状态
<Button
  title="保存"
  onPress={handleSave}
  disabled={!isValid}
  loading={isSaving}
/>
```

## 手绘风格组件

### HandDrawnButton

**文件位置**: `src/components/handDrawn/HandDrawnButton.tsx`

**说明**: 手绘风格按钮，具有柔和的边框和阴影效果。

**Props**:
```typescript
interface HandDrawnButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: 'soft' | 'warm' | 'dreamy' | 'natural';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}
```

**使用示例**:
```typescript
import { HandDrawnButton } from '@/components/handDrawn';

// 主要按钮
<HandDrawnButton
  title="写日记"
  onPress={handleCreate}
  icon="📝"
  variant="primary"
  size="large"
  style="soft"
/>

// 次要按钮
<HandDrawnButton
  title="取消"
  onPress={handleCancel}
  variant="secondary"
  size="medium"
/>

// 轮廓按钮
<HandDrawnButton
  title="了解更多"
  onPress={handleLearnMore}
  variant="outline"
  size="small"
/>
```

### HandDrawnCard

**文件位置**: `src/components/handDrawn/HandDrawnCard.tsx`

**说明**: 手绘风格卡片，用于展示日记、内容等。

**Props**:
```typescript
interface HandDrawnCardProps {
  title?: string;
  subtitle?: string;
  style?: 'soft' | 'warm' | 'dreamy' | 'natural';
  image?: string;
  badge?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
```

**使用示例**:
```typescript
import { HandDrawnCard } from '@/components/handDrawn';

// 日记卡片
<HandDrawnCard
  title="我的旅行"
  subtitle="2024-01-01"
  style="soft"
  image={imageUrl}
  badge="✈️"
  onPress={() => handleView(diary)}
  footer={
    <View>
      <Text>北京 · 晴天 · 开心</Text>
    </View>
  }
>
  <Text>今天去了故宫...</Text>
</HandDrawnCard>

// 简单卡片
<HandDrawnCard
  title="温馨提示"
  style="warm"
>
  <Text>记得保持好心情哦～</Text>
</HandDrawnCard>
```

### ScenarioChip

**文件位置**: `src/components/handDrawn/ScenarioChip.tsx`

**说明**: 场景标签，用于筛选和展示场景分类。

**Props**:
```typescript
interface ScenarioChipProps {
  scenario: ScenarioType;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}
```

**使用示例**:
```typescript
import { ScenarioChip } from '@/components/handDrawn';

// 未选中状态
<ScenarioChip
  scenario="travel"
  onPress={() => setSelectedScenario('travel')}
/>

// 选中状态
<ScenarioChip
  scenario="daily"
  selected={true}
  onPress={() => setSelectedScenario('daily')}
/>

// 带数量徽章
<ScenarioChip
  scenario="movie"
  count={10}
  onPress={() => setSelectedScenario('movie')}
/>
```

**场景类型**:
- `travel` - 旅行 ✈️
- `movie` - 观影 🎬
- `outdoor` - 出行 🌳
- `food` - 美食 🍔
- `daily` - 日常 📝
- `special` - 特别时刻 🎉

### MoodSelector

**文件位置**: `src/components/handDrawn/MoodSelector.tsx`

**说明**: 心情选择器，可视化选择心情状态。

**Props**:
```typescript
interface MoodSelectorProps {
  value?: MoodType;
  onChange: (mood: MoodType) => void;
  size?: 'small' | 'medium' | 'large';
}
```

**使用示例**:
```typescript
import { MoodSelector } from '@/components/handDrawn';

// 心情选择
<MoodSelector
  value={mood}
  onChange={setMood}
  size="medium"
/>
```

**心情类型**:
- `happy` - 开心 😊
- `excited` - 兴奋 🤩
- `normal` - 平静 😐
- `sad` - 难过 😢
- `tired` - 疲惫 😫
- `relaxed` - 放松 😌

### WeatherTabSelector

**文件位置**: `src/components/handDrawn/WeatherTabSelector.tsx`

**说明**: 天气选择器，Tab 形式选择天气。

**Props**:
```typescript
interface WeatherTabSelectorProps {
  value?: WeatherType;
  onChange: (weather: WeatherType) => void;
}
```

**使用示例**:
```typescript
import { WeatherTabSelector } from '@/components/handDrawn';

// 天气选择
<WeatherTabSelector
  value={weather}
  onChange={setWeather}
/>
```

**天气类型**:
- `sunny` - 晴天 ☀️
- `cloudy` - 多云 ☁️
- `rainy` - 下雨 🌧️
- `snowy` - 下雪 ❄️
- `windy` - 刮风 💨

### TagTabSelector

**文件位置**: `src/components/handDrawn/TagTabSelector.tsx`

**说明**: 标签选择器，Tab 形式选择标签。

**Props**:
```typescript
interface TagTabSelectorProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  maxSelect?: number;
}
```

**使用示例**:
```typescript
import { TagTabSelector } from '@/components/handDrawn';

// 标签选择（最多 5 个）
<TagTabSelector
  value={tags}
  onChange={setTags}
  maxSelect={5}
/>
```

**预设标签**:
- 日常
- 工作
- 学习
- 旅游
- 运动
- 美食
- 心情
- 家庭
- 朋友
- 购物

### MascotCharacter

**文件位置**: `src/components/handDrawn/MascotCharacter.tsx`

**说明**: 萌宠角色组件，具有动画和表情。

**Props**:
```typescript
interface MascotCharacterProps {
  mascot: MascotConfig;
  expression?: 'happy' | 'excited' | 'normal' | 'sad' | 'concerned' | 'celebrating' | 'encouraging';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  animationType?: 'bounce' | 'wiggle' | 'pulse' | 'rotate';
  onPress?: () => void;
}
```

**使用示例**:
```typescript
import { MascotCharacter } from '@/components/handDrawn';
import { MAOQIU_MASCOTS } from '@/config/mascot';

// 粉粉球（开心）
<MascotCharacter
  mascot={MAOQIU_MASCOTS[0]}
  expression="happy"
  size="large"
  animated
  animationType="bounce"
/>

// 蓝蓝球（鼓励）
<MascotCharacter
  mascot={MAOQIU_MASCOTS[1]}
  expression="encouraging"
  size="medium"
  animated
  animationType="wiggle"
/>

// 黄黄球（庆祝）
<MascotCharacter
  mascot={MAOQIU_MASCOTS[2]}
  expression="celebrating"
  size="large"
  animated
  animationType="pulse"
/>
```

**萌宠角色**:
- **粉粉球** (🐱) - 鼓励小能手
- **蓝蓝球** (🐶) - 贴心提醒
- **黄黄球** (🐰) - 庆祝专家

### TimelineView

**文件位置**: `src/components/handDrawn/TimelineView.tsx`

**说明**: 时间轴视图，展示日记列表。

**Props**:
```typescript
interface TimelineViewProps {
  items: TimelineItem[];
  onItemPress: (item: TimelineItem) => void;
  emptyComponent?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}
```

**使用示例**:
```typescript
import { TimelineView } from '@/components/handDrawn';

// 时间轴
<TimelineView
  items={diaries}
  onItemPress={handleDiaryPress}
  emptyComponent={
    <EmptyScreen
      title="还没有日记"
      subtitle="开始记录第一条日记吧"
    />
  }
  refreshing={isRefreshing}
  onRefresh={handleRefresh}
/>
```

**数据格式**:
```typescript
interface TimelineItem {
  _id: string;
  title: string;
  content?: string;
  scenario: string;
  mood?: string;
  weather?: string;
  date: string;
  formattedDate: string;
  sectionHeader?: string;
}
```

### PhotoWall

**文件位置**: `src/components/handDrawn/PhotoWall.tsx`

**说明**: 照片墙组件，展示照片拼贴。

**Props**:
```typescript
interface PhotoWallProps {
  photos: string[];
  maxPhotos?: number;
  onPhotoPress?: (index: number) => void;
  showCount?: boolean;
}
```

**使用示例**:
```typescript
import { PhotoWall } from '@/components/handDrawn';

// 照片墙
<PhotoWall
  photos={diary.images}
  maxPhotos={9}
  onPhotoPress={handlePhotoPress}
  showCount
/>

// 回忆卡片
<PhotoWall
  photos={recentPhotos}
  maxPhotos={4}
  showCount={true}
/>
```

### CategoryFilter

**文件位置**: `src/components/handDrawn/CategoryFilter.tsx`

**说明**: 分类筛选器，支持场景和心情筛选。

**Props**:
```typescript
interface CategoryFilterProps {
  selectedScenario?: string;
  selectedMood?: string;
  onScenarioChange: (scenario: string) => void;
  onMoodChange: (mood: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}
```

**使用示例**:
```typescript
import { CategoryFilter } from '@/components/handDrawn';

// 分类筛选
<CategoryFilter
  selectedScenario={selectedScenario}
  selectedMood={selectedMood}
  onScenarioChange={setSelectedScenario}
  onMoodChange={setSelectedMood}
  expanded={isExpanded}
  onToggleExpand={toggleExpand}
/>
```

### DatePicker

**文件位置**: `src/components/handDrawn/DatePicker.tsx`

**说明**: iOS 风格日期选择器，支持滚动选择。

**Props**:
```typescript
interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}
```

**使用示例**:
```typescript
import { DatePicker } from '@/components/handDrawn';

// 日期选择器
<DatePicker
  value={selectedDate}
  onChange={setSelectedDate}
  visible={isDatePickerVisible}
  onDismiss={() => setIsDatePickerVisible(false)}
  onConfirm={(date) => {
    setSelectedDate(date);
    setIsDatePickerVisible(false);
  }}
  maximumDate={new Date()}
/>
```

## 使用指南

### 组件导入

```typescript
// 导入单个组件
import { HandDrawnButton } from '@/components/handDrawn';

// 导入多个组件
import {
  HandDrawnButton,
  HandDrawnCard,
  MoodSelector,
} from '@/components/handDrawn';

// 导入所有组件
import * as HandDrawnComponents from '@/components/handDrawn';
```

### 组件组合使用

```typescript
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  HandDrawnCard,
  HandDrawnButton,
  MoodSelector,
  WeatherTabSelector,
  ScenarioChip,
} from '@/components/handDrawn';

export const DiaryEditor = () => {
  const [mood, setMood] = useState('happy');
  const [weather, setWeather] = useState('sunny');
  const [scenario, setScenario] = useState('daily');

  return (
    <ScrollView>
      <HandDrawnCard
        title="写日记"
        style="soft"
      >
        {/* 场景选择 */}
        <View style={styles.section}>
          <ScenarioChip
            scenario={scenario}
            selected
            onPress={() => setScenario('daily')}
          />
        </View>

        {/* 心情选择 */}
        <View style={styles.section}>
          <Text>今天的心情：</Text>
          <MoodSelector
            value={mood}
            onChange={setMood}
          />
        </View>

        {/* 天气选择 */}
        <View style={styles.section}>
          <Text>今天的天气：</Text>
          <WeatherTabSelector
            value={weather}
            onChange={setWeather}
          />
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <HandDrawnButton
            title="保存"
            onPress={handleSave}
            variant="primary"
          />
          <HandDrawnButton
            title="取消"
            onPress={handleCancel}
            variant="secondary"
          />
        </View>
      </HandDrawnCard>
    </ScrollView>
  );
};
```

## 设计规范

### 颜色规范

#### 主题色系

```typescript
// 粉色系（主色调）
primary: '#FFB5C5'      // 柔和粉
primaryDark: '#FF9EB5'  // 深粉色
primaryLight: '#FFD5E0' // 浅粉色

// 蓝色系
secondary: '#A8D8EA'    // 天空蓝
secondaryDark: '#8BC5D9'
secondaryLight: '#C5E5F0'

// 黄色系
accent: '#F9E79F'       // 温暖黄
accentDark: '#F5D76E'
accentLight: '#FFF3CD'

// 绿色系
success: '#ABEBC6'      // 自然绿
successDark: '#88D9A9'
successLight: '#D5F5E3'

// 中性色
text: '#2C3E50'         // 深灰
textLight: '#7F8C8D'    // 浅灰
border: '#ECF0F1'       // 边框
background: '#FFFFFF'   // 背景
```

#### 场景配色

```typescript
const scenarioColors = {
  travel: { primary: '#A8D8EA', secondary: '#8BC5D9' },    // 旅行蓝
  movie: { primary: '#FFB5C5', secondary: '#FF9EB5' },     // 观影粉
  outdoor: { primary: '#ABEBC6', secondary: '#88D9A9' },   // 出行绿
  food: { primary: '#F9E79F', secondary: '#F5D76E' },      // 美食黄
  daily: { primary: '#FFB5C5', secondary: '#FF9EB5' },     // 日常粉
  special: { primary: '#D7BDE2', secondary: '#C39BD3' },   // 特别紫
};
```

### 字体规范

```typescript
// 字体大小
fontSize: {
  xs: 10,    // 超小
  sm: 12,    // 小
  md: 14,    // 中
  lg: 16,    // 大
  xl: 18,    // 超大
  '2xl': 24, // 特大
  '3xl': 32, // 巨大
}

// 字体粗细
fontWeight: {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

// 行高
lineHeight: {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
}
```

### 间距规范

```typescript
// 间距
spacing: {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
}

// 圆角
borderRadius: {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
}

// 阴影
shadow: {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  xl: '0 20px 25px rgba(0,0,0,0.15)',
}
```

### 动画规范

```typescript
// 动画时长
animationDuration: {
  fast: 150,
  normal: 250,
  slow: 350,
}

// 缓动函数
easing: {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
}
```

## 最佳实践

### 性能优化

#### 1. 使用 React.memo

```typescript
import { memo } from 'react';

export const ScenarioChip = memo(({ scenario, selected, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{scenario}</Text>
    </TouchableOpacity>
  );
});
```

#### 2. 使用 useCallback

```typescript
const handlePress = useCallback(() => {
  onPress(scenario);
}, [scenario, onPress]);
```

#### 3. 避免不必要的重渲染

```typescript
// ✅ 好的做法
const MemoizedComponent = memo(Component);

// ❌ 避免
const Component = (props) => {
  // 每次都会创建新对象
  const style = { color: 'red' };
  return <View style={style} />;
};

// ✅ 好的做法
const style = { color: 'red' };
const Component = () => <View style={style} />;
```

### 可访问性

```typescript
<TouchableOpacity
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="创建新日记"
  accessibilityHint="双击打开日记编辑页面"
  accessibilityState={{ disabled }}
>
  <Text>创建</Text>
</TouchableOpacity>
```

### 错误处理

```typescript
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallback={<ErrorScreen message="组件加载失败" />}
  onError={(error) => captureException(error)}
>
  <HandDrawnCard title="日记">
    {/* 内容 */}
  </HandDrawnCard>
</ErrorBoundary>
```

### 测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HandDrawnButton } from '@/components/handDrawn';

describe('HandDrawnButton', () => {
  it('renders correctly', () => {
    render(<HandDrawnButton title="Click" onPress={() => {}} />);
    expect(screen.getByText('Click')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockPress = jest.fn();
    render(<HandDrawnButton title="Click" onPress={mockPress} />);
    fireEvent.press(screen.getByText('Click'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
```

---

**提示**: 所有组件都支持 TypeScript，具有完整的类型定义。
