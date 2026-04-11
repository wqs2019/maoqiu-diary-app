# 日记录入功能说明 📝

## 功能概述

日记编辑界面已全面升级，提供完整的结构化录入体验，包含以下字段：

### 必填字段
- **标题** - 日记的标题
- **想法** - 日记的主要内容

### 选填字段
- **日期** - 时间选择器（年月日）
- **地点** - 文本输入
- **心情** - Tab 选择（7 种心情）
- **天气** - Tab 选择（6 种天气）
- **标签** - Tab 选择（10 个预设标签）

## 组件说明

### 1. 日期选择器 📅
**组件**: `DatePicker`

**功能**:
- 年/月/日滚动选择
- iOS 风格：上下按钮切换
- Android 风格：滚动选择
- 格式化显示：YYYY-MM-DD

**使用示例**:
```typescript
import { DatePicker } from '@/components/handDrawn';

<DatePicker
  selectedDate={date}
  onDateChange={setDate}
  label="日期"
/>
```

### 2. 心情选择器 😊
**组件**: `MoodTabSelector`

**7 种心情**:
- 😊 开心 (黄色)
- 🤩 兴奋 (粉色)
- 😌 轻松 (绿色)
- 🥺 感动 (紫色)
- 😐 平静 (灰色)
- 😢 难过 (蓝色)
- 😠 生气 (红色)

**使用示例**:
```typescript
import { MoodTabSelector } from '@/components/handDrawn';

<MoodTabSelector
  selectedMood={mood}
  onSelectMood={setMood}
/>
```

### 3. 天气选择器 ☀️
**组件**: `WeatherTabSelector`

**6 种天气**:
- ☀️ 晴 (黄色)
- ☁️ 阴 (灰色)
- 🌧️ 雨 (蓝色)
- ❄️ 雪 (浅蓝)
- 💨 风 (绿色)
- 🌫️ 雾 (淡绿)

**使用示例**:
```typescript
import { WeatherTabSelector } from '@/components/handDrawn';

<WeatherTabSelector
  selectedWeather={weather}
  onSelectWeather={setWeather}
/>
```

### 4. 标签选择器 🏷️
**组件**: `TagTabSelector`

**10 个预设标签**:
1. 📝 日常 (粉色)
2. 💼 工作 (蓝色)
3. 📚 学习 (黄色)
4. ✈️ 旅游 (绿色)
5. ⚽ 运动 (橙色)
6. 🍔 美食 (粉色)
7. 💭 心情 (紫色)
8. 👨‍👩‍👧 家庭 (粉色)
9. 👯 朋友 (浅蓝)
10. 🛍️ 购物 (粉色)

**使用示例**:
```typescript
import { TagTabSelector } from '@/components/handDrawn';

<TagTabSelector
  selectedTags={tags}
  onToggleTag={handleToggleTag}
/>
```

## 界面布局

```
┌─────────────────────────────────┐
│  ←  记录日常        [保存]      │
├─────────────────────────────────┤
│ 选择场景                         │
│ [日常] [旅行] [观影]...         │
├─────────────────────────────────┤
│ 日期                             │
│ 📅 2024-04-11                   │
├─────────────────────────────────┤
│ 地点                             │
│ 📍 添加地点（选填）             │
├─────────────────────────────────┤
│ 心情                             │
│ 😊 🤩 😌 🥺 😐 😢 😠           │
├─────────────────────────────────┤
│ 天气                             │
│ ☀️ ☁️ 🌧️ ❄️ 💨 🌫️             │
├─────────────────────────────────┤
│ 标题                             │
│ [输入标题...]                   │
├─────────────────────────────────┤
│ 想法                             │
│ [                             ] │
│ [  多文本输入区域              ] │
│ [                             ] │
├─────────────────────────────────┤
│ 标签                             │
│ 📝日常 💼工作 📚学习 ✈️旅游...  │
└─────────────────────────────────┘
```

## 交互流程

### 1. 选择场景
- 横向滚动选择场景类型
- 选中高亮显示

### 2. 选择日期
- 点击日期按钮打开日期选择器
- 滚动选择年/月/日
- 点击"确定"保存选择

### 3. 输入地点
- 直接文本输入
- 支持 emoji

### 4. 选择心情
- 横向滚动选择
- 点击选中/取消
- 选中时显示边框高亮

### 5. 选择天气
- 横向滚动选择
- 点击选中/取消
- 选中时显示边框高亮

### 6. 输入标题
- 单行文本输入
- 根据场景显示提示文案

### 7. 输入想法
- 多行文本输入
- 自动调整高度
- 支持换行

### 8. 选择标签
- 横向滚动选择
- 支持多选
- 点击切换选中状态
- 选中时显示背景色

## 数据结构

```typescript
interface DiaryEntry {
  id: string;
  scenario: ScenarioType;      // 场景
  date: Date;                   // 日期
  location?: string;            // 地点
  mood?: MoodType;              // 心情
  weather?: WeatherType;        // 天气
  title: string;                // 标题
  content: string;              // 想法
  tags: TagType[];              // 标签（多选）
  createdAt: string;
  updatedAt: string;
}
```

## 类型定义

```typescript
// 场景类型
type ScenarioType = 'travel' | 'movie' | 'outing' | 'food' | 'daily' | 'special';

// 心情类型
type MoodType = 'happy' | 'sad' | 'normal' | 'excited' | 'angry' | 'relaxed' | 'touched';

// 天气类型
type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy';

// 标签类型
type TagType = 
  | 'daily'      // 日常
  | 'work'       // 工作
  | 'study'      // 学习
  | 'travel'     // 旅游
  | 'sports'     // 运动
  | 'food'       // 美食
  | 'mood'       // 心情
  | 'family'     // 家庭
  | 'friends'    // 朋友
  | 'shopping';  // 购物
```

## 设计特色

### 1. 手绘风格 🎨
- 圆角边框
- 柔和阴影
- 温暖配色
- 手绘质感

### 2. 情感化设计 💕
- emoji 表情丰富
- 颜色编码清晰
- 选中状态明显
- 交互反馈友好

### 3. 用户体验优化 ✨
- 横向滚动节省空间
- Tab 选择直观便捷
- 分组清晰有序
- 输入提示友好

### 4. 平台适配 📱
- iOS/Android 样式适配
- 键盘避让
- 触摸优化
- 响应式布局

## 使用技巧

### 快速操作
1. **快速选择**: 点击 Tab 即可快速选择心情/天气/标签
2. **多选标签**: 支持同时选择多个标签
3. **日期快捷**: 默认当天，可手动调整

### 输入建议
1. **标题**: 简洁明了，概括主题
2. **想法**: 自由记录，无需拘束
3. **标签**: 精准分类，便于检索

### 场景搭配
- **旅行**: 📝日常 + ✈️旅游 + 😊开心
- **观影**: 📝日常 + 🤩兴奋 + 🍔美食
- **日常**: 📝日常 + 😐平静

## 后续优化

### 短期
- [ ] 图片上传功能
- [ ] 地点自动补全
- [ ] 标签自定义
- [ ] 语音输入

### 中期
- [ ] AI 智能标签
- [ ] 心情统计
- [ ] 天气自动获取
- [ ] 模板快速填充

### 长期
- [ ] 智能推荐标签
- [ ] 历史今日对比
- [ ] 心情曲线分析
- [ ] 数据导出

---

**毛球日记** - 让记录成为一种享受 ✨
