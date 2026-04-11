# 毛球日记 - 开发指南

## 📋 目录

1. [开发环境配置](#开发环境配置)
2. [代码规范](#代码规范)
3. [项目架构](#项目架构)
4. [状态管理](#状态管理)
5. [组件开发](#组件开发)
6. [测试指南](#测试指南)
7. [调试技巧](#调试技巧)
8. [常见问题](#常见问题)

## 开发环境配置

### 系统要求

- **Node.js**: v20 或更高版本
- **npm**: v9 或更高版本
- **Expo CLI**: 最新版本
- **EAS CLI**: 最新版本

### 安装步骤

```bash
# 1. 安装 Node.js (推荐使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 2. 安装 Expo CLI
npm install -g expo-cli

# 3. 安装 EAS CLI
npm install -g eas-cli

# 4. 克隆项目
git clone <your-repo-url>
cd maoqiu-diary-app

# 5. 安装依赖
npm install

# 6. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 腾讯云开发环境 ID
TCB_ENV_ID=maoqiu-diary-app-2fpzvwp2e01dbaf

# 腾讯云区域
TCB_REGION=ap-guangzhou

# API 基础 URL（如有）
API_BASE_URL=https://api.example.com

# Sentry DSN（可选）
SENTRY_DSN=https://your-sentry-dsn@xxx.ingest.sentry.io/xxx
```

### 启动开发服务器

```bash
# 启动 Expo 开发服务器
npm start

# 清除缓存启动
npm start -- --clear

# 在 iOS 模拟器运行
npm run ios

# 在 Android 模拟器运行
npm run android
```

## 代码规范

### TypeScript 规范

#### 类型定义

```typescript
// ✅ 好的做法：使用接口定义类型
interface Diary {
  _id: string;
  title: string;
  content: string;
  scenario: ScenarioType;
  mood: MoodType;
  weather: WeatherType;
  location?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ✅ 使用类型别名
type ScenarioType = 'travel' | 'movie' | 'outdoor' | 'food' | 'daily' | 'special';

// ❌ 避免使用 any
const data: any; // 不推荐
const data: unknown; // 推荐
```

#### 泛型使用

```typescript
// ✅ 泛型函数
async function callFunction<T>(name: string, data: any): Promise<T> {
  const result = await tcb.callFunction({ name, data });
  return result.result as T;
}

// 使用
const diaries = await callFunction<Diary[]>('diary', { action: 'list' });
```

### 组件规范

#### 函数组件

```typescript
import React, { memo, useCallback } from 'react';
import { View, Text } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
}

// ✅ 使用 memo 优化
export const HandDrawnButton = memo(({ title, onPress }: Props) => {
  // ✅ 使用 useCallback 缓存回调
  const handleClick = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <View>
      <Text onPress={handleClick}>{title}</Text>
    </View>
  );
});

HandDrawnButton.displayName = 'HandDrawnButton';
```

#### Props 类型

```typescript
// ✅ 明确定义 Props 类型
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

// ✅ 使用解构和默认值
export const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
}: ButtonProps) => {
  // 组件实现
};
```

### 命名规范

#### 文件和目录

```
src/
├── components/          # 组件（PascalCase）
│   └── HandDrawnButton.tsx
├── screens/            # 页面（PascalCase）
│   └── HomeScreen.tsx
├── hooks/              # Hooks（camelCase，使用 use 前缀）
│   └── useDiaryQuery.ts
├── services/           # 服务（camelCase）
│   └── diaryService.ts
├── store/              # 状态管理（camelCase）
│   └── authStore.ts
└── utils/              # 工具函数（camelCase）
    └── format.ts
```

#### 变量和函数

```typescript
// ✅ 变量：camelCase
const userName = 'John';
const diaryList = [];

// ✅ 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ 组件：PascalCase
const HandDrawnButton = () => {};

// ✅ 函数：camelCase
const fetchDiaries = async () => {};
const handlePress = () => {};

// ✅ 类型：PascalCase
interface UserInfo { }
type ScenarioType = 'travel' | 'daily';
```

### 注释规范

```typescript
/**
 * 创建日记记录
 * @param data - 日记数据
 * @returns 创建的日记对象
 * @throws Error 当创建失败时
 */
export const createDiary = async (data: DiaryCreateInput): Promise<Diary> => {
  // 函数实现
};

// ✅ 单行注释
// 检查用户是否已登录
if (!isLoggedIn) {
  return;
}

// ✅ 区块注释
/*
 * 日期格式化规则：
 * - 今天：显示"今天 HH:mm"
 * - 本周：显示"周几 HH:mm"
 * - 其他：显示"YYYY-MM-DD"
 */
```

## 项目架构

### 目录结构

```
maoqiu-diary-app/
├── src/
│   ├── components/         # 可复用 UI 组件
│   │   └── handDrawn/      # 手绘风格组件
│   ├── config/            # 配置文件
│   │   ├── mascot.ts      # 萌宠配置
│   │   ├── handDrawnTheme.ts  # 主题配置
│   │   ├── scenarioTemplates.ts  # 模板配置
│   │   ├── tcb.ts         # TCB 配置
│   │   └── queryClient.ts # React Query 配置
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useDiaryQuery.ts  # 日记查询 Hook
│   │   ├── useQuery.ts       # React Query Hook
│   │   └── useZodForm.ts     # 表单 Hook
│   ├── navigation/        # 导航配置
│   ├── screens/           # 页面组件
│   ├── services/          # API 服务层
│   │   ├── diaryService.ts   # 日记服务
│   │   ├── tcb.ts            # TCB 服务
│   │   └── auth.ts           # 认证服务
│   ├── store/             # Zustand 状态管理
│   │   ├── appStore.ts       # 应用状态
│   │   └── authStore.ts      # 认证状态
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── i18n/              # 国际化
├── cloudfunctions/        # 云函数
├── assets/               # 静态资源
└── docs/                 # 文档
```

### 分层架构

```
┌─────────────────┐
│   Screens       │  ← 页面层（UI 展示）
├─────────────────┤
│   Components    │  ← 组件层（可复用 UI）
├─────────────────┤
│   Hooks         │  ← 逻辑层（业务逻辑）
├─────────────────┤
│   Services      │  ← 服务层（API 调用）
├─────────────────┤
│   Store         │  ← 状态层（全局状态）
└─────────────────┘
```

### 数据流

```
用户交互 → Screen → Hook → Service → Cloud Function → Database
                ↓
            Store (全局状态)
                ↓
          Components (UI 更新)
```

## 状态管理

### Zustand Store

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { authService } from '@/services/auth';

interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<UserInfo>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  
  login: async (phone, code) => {
    const user = await authService.verifyCodeAndLogin(phone, code);
    set({ isLoggedIn: true, user });
  },
  
  logout: () => {
    authService.logout();
    set({ isLoggedIn: false, user: null });
  },
  
  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },
}));

// 使用
const { isLoggedIn, user, login } = useAuthStore();
```

### React Query

```typescript
// src/hooks/useDiaryQuery.ts
import { useAppQuery, useAppMutation } from '@/hooks/useQuery';
import { diaryService } from '@/services/diaryService';

// 查询日记列表
export const useDiaries = (scenario?: string) => {
  return useAppQuery(
    ['diaries', { scenario }],
    () => diaryService.getDiaries({ scenario }),
    {
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: 2,
    }
  );
};

// 创建日记
export const useCreateDiary = () => {
  return useAppMutation(
    ['createDiary'],
    (data: DiaryCreateInput) => diaryService.createDiary(data),
    {
      onSuccess: () => {
        // 刷新日记列表
        queryClient.invalidateQueries(['diaries']);
      },
    }
  );
};

// 使用
const { data: diaries, isLoading } = useDiaries('all');
const createDiaryMutation = useCreateDiary();

createDiaryMutation.mutate({
  title: '新日记',
  content: '内容',
  scenario: 'daily',
});
```

### 表单管理

```typescript
// src/hooks/useZodForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 定义 schema
const diarySchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().optional(),
  scenario: z.enum(['travel', 'movie', 'outdoor', 'food', 'daily', 'special']),
  mood: z.enum(['happy', 'sad', 'normal', 'excited', 'tired', 'relaxed']),
  weather: z.enum(['sunny', 'cloudy', 'rainy', 'snowy', 'windy']),
});

type DiaryFormInput = z.infer<typeof diarySchema>;

// 使用 Hook
const { control, handleSubmit, formState: { errors } } = useZodForm(
  diarySchema,
  {
    title: '',
    content: '',
    scenario: 'daily',
  }
);
```

## 组件开发

### 组件开发流程

1. **确定组件职责**
   - 单一职责原则
   - 可复用性
   - 可测试性

2. **定义 Props 接口**

```typescript
interface Props {
  // 必需属性
  title: string;
  onPress: () => void;
  
  // 可选属性
  disabled?: boolean;
  loading?: boolean;
  
  // 样式属性
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  
  // 子元素
  children?: React.ReactNode;
}
```

3. **实现组件**

```typescript
export const HandDrawnButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
}: Props) => {
  // 组件逻辑
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, style]}
    >
      {loading ? <ActivityIndicator /> : (
        <>
          <Text style={[styles.text, textStyle]}>{title}</Text>
          {children}
        </>
      )}
    </TouchableOpacity>
  );
};
```

4. **导出组件**

```typescript
// src/components/handDrawn/index.ts
export { HandDrawnButton } from './HandDrawnButton';
export { HandDrawnCard } from './HandDrawnCard';
export { MoodSelector } from './MoodSelector';
// ... 其他组件
```

### 组件最佳实践

#### 性能优化

```typescript
// ✅ 使用 React.memo
export const ScenarioChip = memo(({ scenario, selected, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{scenario}</Text>
    </TouchableOpacity>
  );
});

// ✅ 使用 useMemo 缓存计算结果
const filteredDiaries = useMemo(() => {
  return diaries.filter(d => d.scenario === selectedScenario);
}, [diaries, selectedScenario]);

// ✅ 使用 useCallback 缓存回调
const handlePress = useCallback(() => {
  // 处理逻辑
}, [dependency1, dependency2]);
```

#### 可访问性

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

## 测试指南

### 单元测试

```typescript
// __tests__/utils/format.test.ts
import { formatDate, formatMood } from '@/utils/format';

describe('format utilities', () => {
  describe('formatDate', () => {
    it('formats today correctly', () => {
      const today = new Date();
      expect(formatDate(today)).toContain('今天');
    });
    
    it('formats old dates correctly', () => {
      const oldDate = new Date('2024-01-01');
      expect(formatDate(oldDate)).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });
  
  describe('formatMood', () => {
    it('returns emoji for happy', () => {
      expect(formatMood('happy')).toBe('😊');
    });
  });
});
```

### 组件测试

```typescript
// __tests__/components/HandDrawnButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HandDrawnButton } from '@/components/handDrawn';

describe('HandDrawnButton', () => {
  it('renders correctly', () => {
    render(<HandDrawnButton title="Click me" onPress={() => {}} />);
    expect(screen.getByText('Click me')).toBeTruthy();
  });
  
  it('calls onPress when pressed', () => {
    const mockPress = jest.fn();
    render(<HandDrawnButton title="Click me" onPress={mockPress} />);
    
    fireEvent.press(screen.getByText('Click me'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
  
  it('is disabled when loading', () => {
    render(<HandDrawnButton title="Click me" onPress={() => {}} loading />);
    expect(screen.getByText('Click me').props.disabled).toBe(true);
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- format.test.ts
```

## 调试技巧

### 开发菜单

```bash
# iOS 模拟器
# 按 Cmd + D 打开开发菜单

# Android 模拟器
# 按 Cmd + M (Mac) 或 Ctrl + M (Windows/Linux)

# 真机
# 摇动设备
```

### 常用调试方法

```typescript
// 1. console.log
console.log('Debug:', data);

// 2. console.table（适合对象数组）
console.table(diaries);

// 3. 性能调试
console.time('fetchDiaries');
await fetchDiaries();
console.timeEnd('fetchDiaries');

// 4. 错误追踪
try {
  // 可能出错的代码
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    data,
  });
  captureException(error); // Sentry
}
```

### React DevTools

```bash
# 安装 React DevTools
npm install -g react-devtools

# 启动
react-devtools

# 在应用中启用
import { useDebugValue } from 'react';
```

### 网络调试

```typescript
// 使用 Flipper 进行网络调试
# 安装 Flipper
npm install -g flipper

# 在应用中查看网络请求
```

## 常见问题

### Q1: TypeScript 报错 "Module not found"

**解决**:
```bash
# 清除缓存
npm start -- --clear

# 重新生成类型声明
npm run typecheck

# 检查 tsconfig.json 路径配置
```

### Q2: 热更新不工作

**解决**:
```bash
# 清除缓存
rm -rf .expo
npm start -- --clear

# 重启开发服务器
```

### Q3: 依赖冲突

**解决**:
```bash
# 清理 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 使用 pnpm（推荐）
pnpm install
```

### Q4: iOS 构建失败

**解决**:
```bash
# 清理 iOS 构建
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..

# 重新构建
npm run ios
```

### Q5: Android 构建失败

**解决**:
```bash
# 清理 Android 构建
cd android
./gradlew clean
cd ..

# 重新构建
npm run android
```

### Q6: 云函数调用失败

**解决**:
```typescript
// 检查 TCB 配置
import { CloudService } from '@/services/tcb';

console.log('TCB configured:', CloudService.isConfigured());

// 检查认证状态
const auth = await CloudService.ensureAuth();
console.log('Auth state:', auth.hasLoginState?.());

// 检查云函数
try {
  const result = await CloudService.callFunction('diary', { action: 'list' });
  console.log('Result:', result);
} catch (error) {
  console.error('Cloud function error:', error);
}
```

### Q7: 状态管理问题

**解决**:
```typescript
// 检查 Zustand store
import { useAuthStore } from '@/store/authStore';

// 在组件中调试
const state = useAuthStore.getState();
console.log('Store state:', state);

// 订阅状态变化
useAuthStore.subscribe((state) => {
  console.log('State changed:', state);
});
```

## 性能优化

### 图片优化

```typescript
// 使用 Expo Image
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 列表优化

```typescript
// 使用 FlashList
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={diaries}
  renderItem={({ item }) => <DiaryCard diary={item} />}
  estimatedItemSize={100}
  keyExtractor={(item) => item._id}
/>
```

### 动画优化

```typescript
// 使用 Reanimated
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

const translateY = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
}));
```

## 安全最佳实践

### 环境变量

```typescript
// ✅ 正确：使用环境变量
import Constants from 'expo-constants';
const envId = Constants.expoConfig?.extra?.tcbEnvId;

// ❌ 错误：硬编码
const envId = 'maoqiu-diary-app-2fpzvwp2e01dbaf';
```

### 敏感数据

```typescript
// 使用 SecureStore
import * as SecureStore from 'expo-secure-store';

// 存储 token
await SecureStore.setItemAsync('user_token', token);

// 读取 token
const token = await SecureStore.getItemAsync('user_token');
```

### API 调用

```typescript
// 添加错误处理和重试
async function safeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureException(error);
    throw error;
  }
}
```

---

**提示**: 遵循这些指南可以保持代码质量和开发效率。如有问题，请查看文档或提交 Issue。
