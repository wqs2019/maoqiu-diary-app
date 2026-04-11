# 毛球日记 - 快速启动指南 🚀

## 📦 项目说明

已成功实现"毛球日记"应用的核心功能，包括：
- ✅ 萌宠 IP 系统（粉粉球/蓝蓝球/黄黄球）
- ✅ 手绘风格 UI 组件库
- ✅ 场景化记录模板（旅行/观影/出行/美食/日常/特别）
- ✅ 时间轴视图
- ✅ 心情/天气选择器
- ✅ 照片墙功能
- ✅ 分类筛选
- ✅ 日记编辑功能

## 🔧 启动步骤

### 1. 安装依赖

```bash
cd /Users/wuqingshi/Documents/maoqiu-diary-app
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm start
```

### 3. 运行平台

**iOS 模拟器:**
```bash
pnpm ios
```

**Android 模拟器:**
```bash
pnpm android
```

**真机调试:**
- 下载 Expo Go App
- 扫描终端二维码

## 📱 功能演示

### 首页功能
- **时段问候**: 根据时间显示不同问候语
- **萌宠陪伴**: 粉粉球动画陪伴
- **快捷操作**: 一键写日记
- **场景筛选**: 按类型筛选记录
- **时间轴**: 按时间展示生活记录

### 写日记
1. 点击首页"写日记"按钮或悬浮按钮
2. 选择场景（旅行/观影/出行等）
3. 填写标题和内容
4. 选择心情和天气
5. 添加地点和标签
6. 点击保存

### 场景模板
每种场景都有专属字段：
- **旅行**: 目的地、同行人、亮点
- **观影**: 电影名、观后感、评分
- **美食**: 餐厅、口味、推荐度
- **日常**: 今日故事、心情
- **特别**: 主题、场合、故事

## 🎨 组件使用示例

### 手绘按钮
```typescript
import { HandDrawnButton } from '@/components/handDrawn';

<HandDrawnButton
  title="写日记"
  icon="📝"
  onPress={handleCreate}
  style="soft"
  size="medium"
/>
```

### 萌宠角色
```typescript
import { MascotCharacter } from '@/components/handDrawn';
import { MAOQIU_MASCOTS } from '@/config/mascot';

<MascotCharacter
  mascot={MAOQIU_MASCOTS[0]}
  expression="happy"
  size="medium"
  animated
/>
```

### 心情选择器
```typescript
import { MoodSelector } from '@/components/handDrawn';

<MoodSelector
  selectedMood={mood}
  onSelectMood={setMood}
/>
```

### 时间轴视图
```typescript
import { TimelineView } from '@/components/handDrawn';

<TimelineView
  items={timelineItems}
  onItemPress={handleItemPress}
/>
```

## 📂 核心文件结构

```
src/
├── config/
│   ├── mascot.ts              # 萌宠 IP 配置
│   ├── handDrawnTheme.ts      # 手绘主题配置
│   └── scenarioTemplates.ts   # 场景模板配置
├── components/handDrawn/      # 手绘组件库
│   ├── HandDrawnButton.tsx
│   ├── HandDrawnCard.tsx
│   ├── ScenarioChip.tsx
│   ├── MoodSelector.tsx
│   ├── MascotCharacter.tsx
│   ├── TimelineView.tsx
│   ├── PhotoWall.tsx
│   └── CategoryFilter.tsx
├── screens/
│   ├── home/HomeScreen.tsx    # 首页
│   └── edit/EditDiaryScreen.tsx # 编辑页
├── types/index.ts             # 类型定义
└── navigation/RootNavigator.tsx # 导航配置
```

## 🎯 核心配置

### 萌宠配置
位置：`src/config/mascot.ts`

```typescript
// 三只萌宠
- 粉粉球 (🐱) - 鼓励小能手
- 蓝蓝球 (🐶) - 贴心提醒
- 黄黄球 (🐰) - 庆祝专家
```

### 主题配置
位置：`src/config/handDrawnTheme.ts`

```typescript
// 四种手绘风格
- soft (柔和) - 粉色系
- warm (温暖) - 暖黄色系
- dreamy (梦幻) - 蓝色系
- natural (自然) - 绿色系
```

### 场景模板
位置：`src/config/scenarioTemplates.ts`

```typescript
// 六种场景
- travel (旅行 ✈️)
- movie (观影 🎬)
- outing (出行 🌳)
- food (美食 🍔)
- daily (日常 📝)
- special (特别 🎉)
```

## ✅ 代码质量

已通过 TypeScript 类型检查：
```bash
pnpm typecheck  # ✓ 通过
```

## 🚧 待开发功能

### 短期
- [ ] 日记详情页
- [ ] 图片上传功能
- [ ] 数据持久化
- [ ] 萌宠成长系统

### 中期
- [ ] AI 辅助写作
- [ ] 数据统计图表
- [ ] 分享功能
- [ ] 主题商店

### 长期
- [ ] 社交功能
- [ ] 回忆推送
- [ ] 导出 PDF
- [ ] 多端同步

## 🎨 设计特色

1. **治愈系配色**: 粉色系为主，温暖柔和
2. **手绘风格**: 圆角、阴影、边框
3. **萌宠陪伴**: 情感化交互
4. **场景引导**: 降低记录门槛
5. **时间轴**: 有序记忆

## 📖 相关文档

- [实现总结](./IMPLEMENTATION_SUMMARY.md) - 详细功能说明
- [README](./README.md) - 项目介绍
- [QUICK_START](./QUICK_START.md) - 快速开始

## 💡 使用技巧

### 1. 快速记录
- 点击悬浮按钮快速写日记
- 使用场景模板快速录入

### 2. 筛选查找
- 点击场景标签筛选
- 展开筛选栏按心情过滤

### 3. 萌宠互动
- 不同时段有不同问候
- 完成记录时萌宠会鼓励

## 🔧 常见问题

### Q: 如何添加新场景？
A: 在 `src/config/scenarioTemplates.ts` 中添加新的场景模板

### Q: 如何修改萌宠表情？
A: 在 `src/config/mascot.ts` 中修改 `expressions` 数组

### Q: 如何更换主题颜色？
A: 在 `src/config/handDrawnTheme.ts` 中修改 `HEALING_COLORS`

## 📞 技术支持

如遇问题，请检查：
1. 依赖是否安装完整
2. Expo 版本是否兼容
3. TypeScript 类型错误

---

**毛球日记** - 让每一条记录都成为值得回味的生活碎片 ✨

开始记录你的美好生活吧！🎉
