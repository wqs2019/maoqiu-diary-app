# React Native + TCB 脚手架模板

🚀 一个现代化的 React Native + Expo + TypeScript 移动应用脚手架，集成腾讯云开发 (TCB) 后端服务。

## ✨ 特性

### 🎯 核心技术栈
- **React Native 0.81.5** - 最新版本，支持新架构
- **Expo SDK 54** - 现代化开发工具链
- **TypeScript 5.9** - 完整的类型支持
- **React 19** - 最新 React 特性

### 📦 状态管理
- **Zustand** - 轻量级客户端状态管理
- **React Query (TanStack Query)** - 服务端状态管理
- **react-hook-form + Zod** - 表单处理和验证

### 🎨 UI 和性能
- **expo-image** - 高性能图片组件
- **react-native-flash-list** - 列表性能优化
- **react-native-reanimated** - 流畅动画
- **react-native-gesture-handler** - 手势处理

### ☁️ 后端集成
- **腾讯云开发 (TCB)** - 云函数、数据库、认证
- **云函数** - 无服务器后端逻辑
- **云数据库** - MongoDB 兼容

### 🛠️ 开发工具
- **ESLint + Prettier** - 代码质量和格式化
- **Jest + Testing Library** - 单元测试
- **Husky + Commitlint** - Git Hooks 和提交规范
- **GitHub Actions** - CI/CD 自动化
- **EAS Build** - 构建和发布

### 🔒 安全和监控
- **Sentry** - 错误追踪和监控
- **expo-secure-store** - 安全存储
- **环境变量管理** - 敏感信息保护

## 📋 目录结构

```
rn-tcb-life-record-ts-zustand-template/
├── .github/workflows/       # GitHub Actions CI/CD
├── .husky/                  # Git Hooks
├── cloudfunctions/          # TCB 云函数
│   ├── login/              # 登录云函数
│   ├── sendCode/           # 发送验证码
│   └── verifyCode/         # 验证验证码
├── src/
│   ├── components/         # React 组件
│   ├── config/            # 配置文件
│   │   ├── env.ts         # 环境变量
│   │   ├── tcb.ts         # TCB 配置
│   │   ├── theme.ts       # 主题配置
│   │   └── queryClient.ts # React Query 配置
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useQuery.ts    # React Query Hooks
│   │   └── useZodForm.ts  # 表单 Hook
│   ├── navigation/        # 导航配置
│   ├── providers/         # Context Providers
│   ├── screens/           # 页面组件
│   ├── services/          # API 服务
│   ├── store/             # Zustand Stores
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── __tests__/             # 测试文件
├── assets/                # 静态资源
├── .env                   # 环境变量（不提交）
├── .env.example          # 环境变量示例
├── eas.json              # EAS Build 配置
├── package.json          # 依赖配置
└── tsconfig.json         # TypeScript 配置
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Node.js (v20+)
# 安装 Expo CLI
npm install -g expo-cli

# 安装 EAS CLI
npm install -g eas-cli
```

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd rn-tcb-life-record-ts-zustand-template
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# - TCB 环境 ID
# - TCB 区域
# - Sentry DSN（可选）
```

### 5. 配置 TCB 云函数

```bash
# 登录腾讯云开发控制台
# 创建云环境
# 上传 cloudfunctions/ 目录下的云函数
# 配置云函数环境变量
```

### 6. 启动开发服务器

```bash
# 启动 Expo
npm start

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android

# 真机调试（扫码）
npm start
```

## 📱 构建和发布

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
```

### 提交到应用商店

```bash
# 提交到 App Store 和 Google Play
eas submit --platform all
```

## 🧪 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 🔍 代码检查

```bash
# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix

# Prettier 格式化
npm run format

# TypeScript 类型检查
npm run typecheck
```

## 📚 技术文档

### 状态管理

#### Zustand Store

```typescript
// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  login: async (phone, code) => {
    // 登录逻辑
  },
  logout: () => {
    // 登出逻辑
  },
}));
```

#### React Query

```typescript
// 使用示例
import { useAppQuery, useAppMutation } from '@/hooks/useQuery';

// 查询
const { data, isLoading, error } = useAppQuery(
  ['userData', userId],
  async () => fetchUser(userId)
);

// 突变
const mutation = useAppMutation(
  ['updateUser'],
  async (data) => updateUser(data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['userData']);
    }
  }
);
```

### 表单处理

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { loginFormSchema } from '@/utils/validators';

const { control, handleSubmit, formState: { errors } } = useZodForm(
  loginFormSchema,
  { phone: '', code: '' }
);
```

### 环境变量

```typescript
import env from '@/config/env';

// 使用示例
const tcbEnv = env.tcbEnvId;
const isDev = env.isDev;
const apiBaseUrl = env.apiBaseUrl;
```

## 🔐 安全性

### 环境变量

- ✅ 敏感信息存储在 `.env` 文件（不提交到 Git）
- ✅ 使用 `expo-constants` 读取环境变量
- ✅ 客户端不包含密钥（通过云函数中转）

### 安全存储

```typescript
import * as SecureStore from 'expo-secure-store';

// 存储敏感数据
await SecureStore.setItemAsync('token', token);

// 读取数据
const token = await SecureStore.getItemAsync('token');
```

## 🎨 主题系统

```typescript
import { useAppStore } from '@/store/appStore';

const { theme, setTheme } = useAppStore();

// 切换主题
setTheme('dark'); // 或 'light'
```

## 🌐 国际化

```typescript
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();

// 使用翻译
t('common.loading');

// 切换语言
i18n.changeLanguage('en-US');
```

## 📊 错误监控

### Sentry 集成

```typescript
import { captureException, setUser } from '@/config/sentry';

// 捕获异常
try {
  // 可能出错的代码
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { module: 'auth' },
  });
}

// 设置用户
setUser({
  id: user.id,
  username: user.nickname,
});
```

## 🤝 贡献指南

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 格式
<type>(<scope>): <subject>

# 示例
feat(auth): add phone login support
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

## 📄 许可证

MIT License

## 🙏 致谢

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Tencent Cloud Base](https://cloud.tencent.com/product/tcb)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query)

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系维护者。
