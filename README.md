# 毛球日记 (MaoQiu Diary) 🐱

一款以**治愈系萌宠手绘风格**为核心视觉语言的生活事项记录工具，专注于帮助用户按时间轴梳理旅行、观影、出行、体验等各类生活场景，通过轻量化录入、可视化归类、温暖化交互，让记录成为一种放松身心的治愈过程，打造"随身携带的生活纪念册"。

[![Expo](https://img.shields.io/badge/Expo-54.0-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ 核心价值

### 🎯 产品特色

- **治愈陪伴** 🐱 - 萌宠 IP 全程陪伴记录，弱化工具属性，强化情感连接，缓解记录压力
- **高效梳理** 📊 - 支持多维度分类与时间轴回溯，让零散事项形成有序记忆
- **轻量化体验** ⚡ - 极简录入流程 + 丰富模板，兼顾便捷性与个性化
- **温暖沉淀** 🎨 - 手绘风格视觉呈现，让每一条记录都成为值得回味的"生活碎片"

### 🎨 视觉风格

- 手绘风格 UI 组件库
- 治愈系配色方案（粉色/蓝色/黄色/绿色系）
- 场景化配色（旅行/观影/出行/美食/日常/特别）
- 动态萌宠角色交互

## 📱 功能特性

### 已实现功能

#### 1. 萌宠 IP 系统 🐱
- **毛球家族**: 粉粉球 (🐱)、蓝蓝球 (🐶)、黄黄球 (🐰)
- 多种表情状态：开心/兴奋/平静/关心/庆祝/鼓励
- 动态动画效果：弹跳/摇晃/脉冲/旋转
- 时段化问候：早/中/晚/夜间
- 情感化交互：鼓励/安慰/提醒/庆祝

#### 2. 日记记录 ✍️
- **记录字段**: 标题、时间、地点、心情、天气、想法、标签
- **场景分类**: 旅行✈️、观影🎬、出行🌳、美食🍔、日常📝、特别时刻🎉
- **心情选择**: 7 种心情表情可视化选择
- **天气选择**: 多种天气图标快速选择
- **标签管理**: 日常/工作/学习/旅游/运动/美食/心情/家庭/朋友/购物

#### 3. 手绘风格组件库 🎨
- HandDrawnButton - 手绘风格按钮
- HandDrawnCard - 手绘风格卡片
- ScenarioChip - 场景标签
- MoodSelector - 心情选择器
- WeatherSelector - 天气选择器
- MascotCharacter - 萌宠角色
- TimelineView - 时间轴视图
- PhotoWall - 照片墙
- CategoryFilter - 分类筛选器
- DatePicker - iOS 风格日期选择器

#### 4. 云端同步 ☁️
- 腾讯云开发 (TCB) 后端支持
- 日记数据云端存储
- 用户认证系统
- 实时数据同步

#### 5. 用户体验 🌟
- iOS 风格滚动日期选择器
- 可拖动悬浮按钮
- 场景化模板引导
- 时间轴视图展示
- 分类筛选功能
- 国际化支持 (中英文)

## 🚀 快速开始

### 环境准备

```bash
# 安装 Node.js (v20+)
# 安装 Expo CLI
npm install -g expo-cli

# 安装 EAS CLI
npm install -g eas-cli
```

### 安装和配置

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd maoqiu-diary-app

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 TCB 环境 ID

# 4. 启动开发服务器
npm start

# 5. 在设备上运行
# - 扫码在真机测试
# - 按 i 在 iOS 模拟器运行
# - 按 a 在 Android 模拟器运行
```

### 构建应用

```bash
# 开发版本
eas build --profile development --platform all

# 预览版本
eas build --profile preview --platform all

# 生产版本
eas build --profile production --platform all
```

## 📁 项目结构

```
maoqiu-diary-app/
├── src/
│   ├── components/         # React 组件
│   │   └── handDrawn/      # 手绘风格组件
│   ├── config/            # 配置文件
│   │   ├── mascot.ts      # 萌宠 IP 配置
│   │   ├── handDrawnTheme.ts  # 手绘主题配置
│   │   ├── scenarioTemplates.ts  # 场景模板配置
│   │   ├── tcb.ts         # TCB 配置
│   │   └── queryClient.ts # React Query 配置
│   ├── hooks/             # 自定义 Hooks
│   ├── navigation/        # 导航配置
│   ├── screens/           # 页面组件
│   │   ├── home/          # 首页
│   │   ├── edit/          # 编辑页
│   │   ├── category/      # 分类页
│   │   ├── mine/          # 我的页面
│   │   └── auth/          # 认证页面
│   ├── services/          # API 服务
│   │   ├── diaryService.ts # 日记服务
│   │   ├── tcb.ts         # TCB 服务
│   │   └── auth.ts        # 认证服务
│   ├── store/             # Zustand 状态管理
│   ├── types/             # TypeScript 类型
│   ├── utils/             # 工具函数
│   └── i18n/              # 国际化
├── cloudfunctions/        # 腾讯云函数
│   ├── diary/            # 日记管理云函数
│   ├── user/             # 用户管理云函数
│   ├── sendCode/         # 发送验证码
│   ├── verifyCode/       # 验证验证码
│   ├── login/            # 登录云函数
│   └── validateToken/    # 验证 Token
├── assets/               # 静态资源
├── scripts/              # 脚本工具
└── docs/                 # 文档目录
```

## 🛠️ 技术栈

### 核心技术

- **React Native** 0.81.5 - 跨平台移动开发框架
- **Expo** SDK 54 - 现代化开发工具链
- **TypeScript** 5.9 - 类型安全的 JavaScript 超集
- **React** 19 - UI 框架

### 状态管理

- **Zustand** 5.0 - 轻量级客户端状态管理
- **TanStack Query (React Query)** 5.6 - 服务端状态管理
- **React Hook Form** 7.54 - 表单处理
- **Zod** 3.23 - TypeScript 验证 schema

### UI 和性能

- **React Navigation** 7.x - 导航库
- **React Native Reanimated** 4.1 - 动画库
- **React Native Gesture Handler** 2.31 - 手势处理
- **Expo Image** 3.0 - 高性能图片组件
- **FlashList** 2.0 - 列表性能优化

### 后端和服务

- **腾讯云开发 (TCB)** - 云函数、数据库、认证
- **@cloudbase/node-sdk** - 云函数 SDK
- **@cloudbase/js-sdk** - 前端 SDK
- **@cloudbase/adapter-rn** - React Native 适配器

### 开发工具

- **ESLint** + **Prettier** - 代码质量和格式化
- **Husky** + **Commitlint** - Git Hooks 和提交规范
- **EAS Build** - 构建和发布
- **Sentry** - 错误追踪和监控

## 📚 文档导航

- **[开发指南](docs/DEVELOPMENT_GUIDE.md)** - 开发环境配置、代码规范、测试指南
- **[部署指南](docs/DEPLOYMENT_GUIDE.md)** - 云函数部署、应用发布、应用商店上架
- **[云函数文档](docs/CLOUD_FUNCTIONS.md)** - 云函数详解、API 接口、数据库结构
- **[组件文档](docs/COMPONENTS_GUIDE.md)** - 组件库使用、设计规范、最佳实践
- **[快速开始](docs/QUICK_START.md)** - 5 分钟快速上手指南

## 🎯 核心 API

### 日记服务

```typescript
import { diaryService } from '@/services/diaryService';

// 创建日记
const diary = await diaryService.createDiary({
  title: '我的旅行',
  content: '今天去了...',
  scenario: 'travel',
  mood: 'happy',
  weather: 'sunny',
  location: '北京',
  tags: ['旅行', '放松'],
});

// 获取日记列表
const diaries = await diaryService.getDiaries({
  scenario: 'all',
  limit: 20,
});

// 更新日记
await diaryService.updateDiary(diaryId, {
  title: '更新的标题',
});

// 删除日记
await diaryService.deleteDiary(diaryId);
```

### 用户认证

```typescript
import { authService } from '@/services/auth';

// 发送验证码
await authService.sendCode('13800138000');

// 验证验证码并登录
const user = await authService.verifyCodeAndLogin(
  '13800138000',
  '123456'
);

// 获取用户信息
const userInfo = await authService.getUserInfo();

// 登出
await authService.logout();
```

## 🧪 开发和测试

```bash
# 代码检查
npm run lint          # ESLint 检查
npm run lint:fix      # 自动修复
npm run format        # Prettier 格式化
npm run typecheck     # TypeScript 类型检查

# 测试
npm test              # 运行测试
npm run test:watch    # 监听模式
npm run test:coverage # 生成覆盖率

# 开发
npm start             # 启动开发服务器
npm run ios           # iOS 模拟器
npm run android       # Android 模拟器
```

## 📦 构建和发布

### 开发构建

```bash
# 开发版本（支持开发菜单）
eas build --profile development --platform all
```

### 预览构建

```bash
# 预览版本（内部测试）
eas build --profile preview --platform all
```

### 生产构建

```bash
# 生产版本（应用商店）
eas build --profile production --platform all

# 提交到应用商店
eas submit --platform all
```

## 🔐 安全性

### 环境变量管理

- 敏感信息存储在 `.env` 文件（不提交到 Git）
- 使用 `expo-constants` 读取环境变量
- 客户端不包含密钥（通过云函数中转）

### 安全存储

```typescript
import * as SecureStore from 'expo-secure-store';

// 存储敏感数据
await SecureStore.setItemAsync('token', token);

// 读取数据
const token = await SecureStore.getItemAsync('token');
```

### 错误监控

```typescript
import { captureException } from '@/config/sentry';

try {
  // 可能出错的代码
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { module: 'auth' },
  });
}
```

## 🤝 贡献指南

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 格式
<type>(<scope>): <subject>

# 示例
feat(diary): add weather selection support
fix(ui): resolve button alignment issue
docs(readme): update installation guide
```

### 类型说明

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统
- `ci`: CI 配置
- `chore`: 其他改动

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📊 项目统计

- **代码行数**: ~5,000+ 行
- **组件数量**: 10+ 个手绘风格组件
- **云函数数量**: 6 个
- **支持平台**: iOS, Android
- **开发语言**: TypeScript 100%

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [腾讯云开发](https://cloud.tencent.com/product/tcb)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com/)

## 📞 联系方式

- 📧 Email: [你的邮箱]
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/maoqiu-diary-app/issues)
- 📖 文档: [完整文档](docs/)

## 🗺️ 路线图

### 短期 (v1.1 - v1.3)
- [ ] 图片上传功能
- [ ] 萌宠成长系统
- [ ] 日记详情页面
- [ ] 数据统计图表

### 中期 (v1.4 - v2.0)
- [ ] AI 辅助写作
- [ ] 分享功能（生成精美卡片）
- [ ] 主题商店（更多萌宠和主题）
- [ ] 回忆推送（历史上的今天）

### 长期 (v2.0+)
- [ ] 社交功能（关注/点赞/评论）
- [ ] 多用户萌宠互动
- [ ] PDF/长图导出
- [ ] Web 版本

---

**毛球日记** - 让每一条记录都成为值得回味的生活碎片 ✨

*Last Updated: 2026-04-11*
