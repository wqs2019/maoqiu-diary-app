# 毛球日记项目概览

## 📊 项目信息

- **项目名称**: 毛球日记 (MaoQiu Diary)
- **版本**: 1.0.0
- **描述**: 治愈系萌宠手绘风格生活事项记录工具
- **开发语言**: TypeScript 100%
- **支持平台**: iOS, Android
- **后端服务**: 腾讯云开发 (TCB)

## 🎯 产品定位

一款以「治愈系萌宠手绘风格」为核心视觉语言的生活事项记录工具，专注于帮助用户按时间轴梳理旅行、观影、出行、体验等各类生活场景，通过轻量化录入、可视化归类、温暖化交互，让记录成为一种放松身心的治愈过程，打造"随身携带的生活纪念册"。

## ✨ 核心价值

- **治愈陪伴** 🐱 - 萌宠 IP 全程陪伴，情感化交互
- **高效梳理** 📊 - 多维度分类，时间轴回溯
- **轻量化体验** ⚡ - 极简录入，丰富模板
- **温暖沉淀** 🎨 - 手绘风格，治愈配色

## 📁 项目结构

```
maoqiu-diary-app/
├── 📄 配置文件
│   ├── package.json           # 依赖配置
│   ├── tsconfig.json          # TypeScript 配置
│   ├── eas.json               # EAS Build 配置
│   ├── app.json               # Expo 配置
│   └── .env                   # 环境变量
│
├── 📂 源代码 (src/)
│   ├── components/            # UI 组件 (11 个手绘组件)
│   │   └── handDrawn/         # 手绘风格组件
│   ├── config/                # 配置文件 (6 个)
│   │   ├── mascot.ts          # 萌宠 IP 配置
│   │   ├── handDrawnTheme.ts  # 主题配置
│   │   └── scenarioTemplates.ts # 模板配置
│   ├── hooks/                 # 自定义 Hooks (3 个)
│   ├── navigation/            # 导航配置
│   ├── screens/               # 页面组件 (8 个)
│   ├── services/              # API 服务 (3 个)
│   ├── store/                 # Zustand 状态管理 (2 个)
│   ├── types/                 # TypeScript 类型
│   ├── utils/                 # 工具函数 (4 个)
│   └── i18n/                  # 国际化
│
├── ☁️ 云函数 (cloudfunctions/)
│   ├── diary/                 # 日记管理
│   ├── user/                  # 用户管理
│   ├── sendCode/              # 发送验证码
│   ├── verifyCode/            # 验证验证码
│   ├── login/                 # 用户登录
│   └── validateToken/         # 验证 Token
│
├── 📚 文档 (docs/)
│   ├── README.md              # 文档索引
│   ├── QUICK_START.md         # 快速开始
│   ├── DEVELOPMENT_GUIDE.md   # 开发指南
│   ├── DEPLOYMENT_GUIDE.md    # 部署指南
│   ├── CLOUD_FUNCTIONS.md     # 云函数文档
│   └── COMPONENTS_GUIDE.md    # 组件文档
│
└── 🎨 资源文件 (assets/)
    ├── logo.jpg               # 应用图标
    └── logo.jpg               # Logo
```

## 🛠️ 技术栈

### 前端技术

| 技术 | 版本 | 用途 |
|-----|------|------|
| React Native | 0.81.5 | 跨平台框架 |
| Expo | SDK 54 | 开发工具链 |
| TypeScript | 5.9 | 类型安全 |
| React | 19 | UI 框架 |
| React Navigation | 7.x | 导航库 |

### 状态管理

| 技术 | 版本 | 用途 |
|-----|------|------|
| Zustand | 5.0 | 全局状态 |
| TanStack Query | 5.6 | 服务端状态 |
| React Hook Form | 7.54 | 表单处理 |
| Zod | 3.23 | 数据验证 |

### UI 和性能

| 技术 | 版本 | 用途 |
|-----|------|------|
| Reanimated | 4.1 | 动画库 |
| Gesture Handler | 2.31 | 手势处理 |
| Expo Image | 3.0 | 图片组件 |
| FlashList | 2.0 | 列表优化 |

### 后端服务

| 技术 | 版本 | 用途 |
|-----|------|------|
| 腾讯云开发 | latest | 云函数/数据库 |
| @cloudbase/node-sdk | latest | 云函数 SDK |
| @cloudbase/js-sdk | latest | 前端 SDK |

### 开发工具

| 技术 | 用途 |
|-----|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Husky | Git Hooks |
| EAS Build | 构建发布 |
| Sentry | 错误监控 |

## 📱 功能模块

### 1. 萌宠 IP 系统 🐱

**角色**:
- 粉粉球 (🐱) - 鼓励小能手
- 蓝蓝球 (🐶) - 贴心提醒
- 黄黄球 (🐰) - 庆祝专家

**特性**:
- 6 种表情状态
- 4 种动画效果
- 时段化问候
- 情感化交互

### 2. 日记记录 ✍️

**字段**:
- 标题、时间、地点
- 心情（7 种）
- 天气（5 种）
- 想法、标签（10 个）

**场景**:
- 旅行✈️、观影🎬、出行🌳
- 美食🍔、日常📝、特别时刻🎉

### 3. 手绘 UI 组件 🎨

**组件库** (11 个):
- HandDrawnButton - 手绘按钮
- HandDrawnCard - 手绘卡片
- ScenarioChip - 场景标签
- MoodSelector - 心情选择器
- WeatherTabSelector - 天气选择器
- TagTabSelector - 标签选择器
- MascotCharacter - 萌宠角色
- TimelineView - 时间轴
- PhotoWall - 照片墙
- CategoryFilter - 分类筛选
- DatePicker - 日期选择器

### 4. 云端同步 ☁️

**云函数** (6 个):
- diary - 日记管理
- user - 用户管理
- sendCode - 发送验证码
- verifyCode - 验证验证码
- login - 用户登录
- validateToken - 验证 Token

**数据库集合** (3 个):
- users - 用户信息
- diaries - 日记数据
- verification_codes - 验证码

## 📊 项目统计

- **代码行数**: ~5,000+ 行
- **组件数量**: 11 个手绘组件
- **页面数量**: 8 个
- **云函数数量**: 6 个
- **数据库集合**: 3 个
- **TypeScript 覆盖率**: 100%

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env

# 3. 启动开发服务器
npm start

# 4. 在设备上运行
# - 扫码真机测试
# - 按 i 运行 iOS
# - 按 a 运行 Android
```

## 📚 文档导航

- **[快速开始](./docs/QUICK_START.md)** - 5 分钟上手
- **[开发指南](./docs/DEVELOPMENT_GUIDE.md)** - 开发规范
- **[部署指南](./docs/DEPLOYMENT_GUIDE.md)** - 构建发布
- **[云函数文档](./docs/CLOUD_FUNCTIONS.md)** - API 接口
- **[组件文档](./docs/COMPONENTS_GUIDE.md)** - 组件使用

## 🎯 开发流程

### 1. 开发新功能

```bash
# 1. 创建组件/页面
# 2. 编写业务逻辑
# 3. 添加云函数（如需要）
# 4. 测试功能
# 5. 代码审查
```

### 2. 测试

```bash
# 运行测试
npm test

# 代码检查
npm run lint
npm run typecheck
```

### 3. 构建发布

```bash
# 开发版本
eas build --profile development

# 生产版本
eas build --profile production
```

## 🔐 安全措施

- ✅ HTTPS 通信
- ✅ Token 认证（JWT）
- ✅ 数据加密存储
- ✅ 环境变量隔离
- ✅ 数据库权限控制
- ✅ 频率限制

## 📈 性能优化

- ✅ 列表虚拟化（FlashList）
- ✅ 图片优化（Expo Image）
- ✅ 动画优化（Reanimated）
- ✅ 状态管理优化（Zustand）
- ✅ 查询缓存（React Query）

## 🗺️ 路线图

### 短期 (v1.1 - v1.3)
- [ ] 图片上传功能
- [ ] 萌宠成长系统
- [ ] 日记详情页面
- [ ] 数据统计图表

### 中期 (v1.4 - v2.0)
- [ ] AI 辅助写作
- [ ] 分享功能（精美卡片）
- [ ] 主题商店
- [ ] 回忆推送

### 长期 (v2.0+)
- [ ] 社交功能
- [ ] 多用户互动
- [ ] PDF/长图导出
- [ ] Web 版本

## 📞 联系方式

- 📧 Email: [你的邮箱]
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/maoqiu-diary-app/issues)
- 📖 文档: [完整文档](docs/)

## 📄 许可证

MIT License

---

**毛球日记** - 让每一条记录都成为值得回味的生活碎片 ✨

*Last Updated: 2026-04-11*
