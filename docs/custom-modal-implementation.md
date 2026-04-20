# 自定义 Modal 组件实现原理

## 概述

本项目实现了一套基于 React Native 的自定义 Modal 系统，包括三个核心组件：
- **Portal**: 门户组件，用于将组件渲染到组件树的其他位置
- **Modal**: 模态框组件，基于 Portal 实现
- **Toast**: 提示组件，基于 Portal 实现

## 架构设计

### 1. Portal 组件 (`src/components/common/Portal.tsx`)

#### 核心概念

Portal（门户）是 React 的一个特性，允许子组件渲染到父组件 DOM 层次结构之外的 DOM 节点中。在 React Native 中，我们需要自己实现这个模式。

#### 实现原理

```typescript
class PortalManager {
  private portals: Map<string, ReactNode> = new Map();
  private listeners: Set<() => void> = new Set();
}
```

**PortalManager** 类负责管理所有 Portal 的状态：
- 使用 `Map` 存储所有 portal 节点，key 为唯一 ID，value 为 ReactNode
- 使用 `Set` 存储监听器，当 portals 变化时通知所有订阅者

#### 为什么使用监听器模式？

**问题场景：避免无限循环**

如果直接使用 React State 来管理 portals，当 Portal 消费者（如 Modal）deeply nested 时，会导致无限循环：

```typescript
// ❌ 错误的实现方式
const [portals, setPortals] = useState<Map<string, ReactNode>>(new Map());

const mount = (id: string, content: ReactNode) => {
  const newMap = new Map(portals);
  newMap.set(id, content);
  setPortals(newMap); // 触发重新渲染
};

// 在 Portal 组件中
useEffect(() => {
  manager.mount(id, children); // 每次 children 变化都会触发 mount
}, [children, id]);
```

**问题链**：
1. Portal 的 `children` 变化 → 触发 `mount()`
2. `mount()` 调用 `setPortals()` → PortalProvider 重新渲染
3. PortalProvider 重新渲染 → 所有 Portal 子组件重新渲染
4. Portal 子组件重新渲染 → `children` 变化
5. 回到步骤 1，形成**无限循环** ♾️

**解决方案：使用监听器（观察者模式）**

```typescript
// ✅ 正确的实现方式
class PortalManager {
  private portals: Map<string, ReactNode> = new Map();
  private listeners: Set<() => void> = new Set();

  mount(id: string, content: ReactNode) {
    this.portals.set(id, content);
    this.notify(); // 通知监听器
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
```

**监听器模式的优势**：

| 优势 | 说明 |
|------|------|
| **控制更新时机** | 只有在 `notify()` 被调用时才更新 state，避免连锁反应 |
| **解耦** | PortalManager 不直接依赖 React 的 state 机制，可独立管理 |
| **性能优化** | 可批量处理多个 mount/unmount 操作，只在必要时通知一次 |
| **清理订阅** | `useEffect` 返回的清理函数会自动调用 `unsubscribe`，避免内存泄漏 |

**实际工作流程**：
```
1. Modal 渲染
   ↓
2. <Portal> 组件挂载
   ↓
3. useEffect 调用 manager.mount(id, children)
   ↓
4. PortalManager 更新 portals Map
   ↓
5. PortalManager 调用 notify()
   ↓
6. 所有订阅者（PortalProvider）收到通知
   ↓
7. PortalProvider 调用 setPortals() 触发渲染
   ↓
8. PortalProvider 渲染所有 portals
   ↓
9. Modal 内容出现在屏幕顶层
```

**关键方法**：
- `mount(id, content)`: 注册一个新的 portal
- `unmount(id)`: 移除一个 portal
- `subscribe(listener)`: 订阅 portal 变化事件
- `getPortals()`: 获取所有 portals
- `notify()`: 通知所有订阅者更新

#### PortalProvider 组件

```typescript
export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const managerRef = useRef(new PortalManager());
  const [portals, setPortals] = useState<[string, ReactNode][]>([]);

  useEffect(() => {
    return manager.subscribe(() => {
      setPortals(manager.getPortals());
    });
  }, [manager]);

  return (
    <PortalContext.Provider value={manager}>
      <View style={styles.container}>
        {children}
      </View>
      {portals.map(([id, content]) => (
        <View key={id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {content}
        </View>
      ))}
    </PortalContext.Provider>
  );
};
```

**工作流程**：
1. 使用 `useRef` 创建单例的 `PortalManager` 实例
2. 订阅 portal 变化事件，当有变化时更新 state 触发重新渲染
3. 渲染所有注册的 portals，使用 `StyleSheet.absoluteFill` 使其覆盖整个屏幕
4. `pointerEvents="box-none"` 确保 portal 内容可以接收触摸事件

#### Portal 组件

```typescript
export const Portal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const manager = useContext(PortalContext);
  const [id] = useState(() => Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (manager) {
      manager.mount(id, children);
    }
  }, [children, manager, id]);

  useEffect(() => {
    return () => {
      if (manager) {
        manager.unmount(id);
      }
    };
  }, [manager, id]);

  return null;
};
```

**工作流程**：
1. 从 Context 获取 `PortalManager` 实例
2. 生成唯一 ID 作为 portal 的标识
3. 挂载时调用 `manager.mount()` 注册到管理器
4. 卸载时调用 `manager.unmount()` 从管理器移除
5. 自身不渲染任何内容（返回 null），内容会被渲染到 PortalProvider 的顶层

### 2. Modal 组件 (`src/components/common/Modal.tsx`)

#### 实现原理

```typescript
export const Modal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  children,
  animationDuration = 200,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible, opacity, shouldRender, animationDuration]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayContainer}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.animatedWrapper, { opacity }]}>
                {children}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Portal>
  );
};
```

#### 关键特性

**1. 渲染控制**
- 使用 `shouldRender` state 控制组件是否渲染
- 即使 `visible=false`，也会先执行关闭动画，动画完成后再移除组件

**2. 淡入淡出动画**
- 使用 `Animated.Value` 控制透明度
- `Animated.timing` 创建平滑的过渡动画
- `useNativeDriver: true` 启用原生驱动提升性能

**3. 关闭动画流程**
```
visible: true → false
  ↓
opacity: 1 → 0 (动画)
  ↓
动画完成回调 → setShouldRender(false)
  ↓
组件从 DOM 移除
```

**4. 键盘处理**
- 使用 `KeyboardAvoidingView` 避免键盘遮挡
- iOS 使用 `padding` 行为，Android 不处理

**5. 背景遮罩**
- 外层 `TouchableWithoutFeedback` 处理背景点击关闭
- 内层 `TouchableWithoutFeedback` 阻止内容区域点击冒泡

#### 样式设计

```typescript
const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    zIndex: 1000,        // iOS 层级控制
    elevation: 1000,     // Android 层级控制
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedWrapper: {
    flex: 1,
  },
});
```

### 3. Toast 组件 (`src/components/common/Toast.tsx`)

#### 实现原理

Toast 组件使用 Context + 单例模式实现全局提示功能。

**Context 设计**

```typescript
interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => void;
  hide: () => void;
}
```

**动画控制**

```typescript
const opacity = useRef(new Animated.Value(0)).current;
const translateY = useRef(new Animated.Value(-20)).current;
```

- `opacity`: 控制淡入淡出
- `translateY`: 控制从顶部滑入的效果（初始位置 -20，最终位置 0）

**显示逻辑**

```typescript
const showToast = useCallback((opts: ToastOptions | string) => {
  // 清除之前的定时器
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  // 设置内容和类型
  setOptions({ ...toastOptions, type });
  setVisible(true);

  // 执行进入动画
  Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true })
  ]).start();

  // 设置自动隐藏定时器
  if (duration > 0) {
    timerRef.current = setTimeout(() => {
      hide();
    }, duration);
  }
}, [opacity, translateY, hide]);
```

**隐藏逻辑**

```typescript
const hide = useCallback(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  
  // 执行退出动画
  Animated.parallel([
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true })
  ]).start(() => {
    setVisible(false);
  });
}, [opacity, translateY]);
```

**图标系统**

```typescript
const getIcon = () => {
  switch (options.type) {
    case 'success':
      return <Ionicons name="checkmark-circle" size={24} color="#10B981" />;
    case 'error':
      return <Ionicons name="close-circle" size={24} color="#EF4444" />;
    case 'loading':
      return <Ionicons name="sync" size={24} color="#3B82F6" />;
    case 'info':
      return <Ionicons name="information-circle" size={24} color="#3B82F6" />;
  }
};
```

## 使用示例

### 1. 在应用根组件中设置 Provider

```typescript
// App.tsx
import { PortalProvider } from '@/components/common/Portal';
import { ToastProvider } from '@/components/common/Toast';

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <PortalProvider>
          <Navigation />
        </PortalProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
```

### 2. 使用 Modal

```typescript
import { Modal } from '@/components/common/Modal';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onPress={() => setVisible(true)} title="打开 Modal" />
      
      <Modal
        visible={visible}
        onClose={() => setVisible(false)}
        animationDuration={300}
      >
        <View style={styles.modalContent}>
          <Text>这是 Modal 内容</Text>
        </View>
      </Modal>
    </>
  );
}
```

### 3. 使用 Toast

```typescript
import { useToast } from '@/components/common/Toast';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('操作成功！');
  };

  const handleError = () => {
    toast.error('操作失败！');
  };

  const handleLoading = () => {
    toast.loading('加载中...');
    // 手动隐藏
    setTimeout(() => toast.hide(), 3000);
  };

  return (
    <View>
      <Button onPress={handleSuccess} title="成功提示" />
      <Button onPress={handleError} title="错误提示" />
      <Button onPress={handleLoading} title="加载提示" />
    </View>
  );
}
```

## 性能优化

### 1. 使用 `useNativeDriver`

所有动画都使用 `useNativeDriver: true`，将动画运行在原生线程，避免 JS 线程阻塞导致的卡顿。

### 2. Portal 渲染优化

```typescript
{portals.map(([id, content]) => (
  <View key={id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
    {content}
  </View>
))}
```

- 使用 `pointerEvents="box-none"` 避免不必要的触摸事件处理
- 使用唯一 ID 作为 key，避免不必要的重渲染

### 3. Modal 渲染控制

```typescript
const [shouldRender, setShouldRender] = useState(visible);

// 动画完成后再移除组件
Animated.timing(opacity, {
  toValue: 0,
  duration: animationDuration,
  useNativeDriver: true,
}).start(() => setShouldRender(false));
```

避免组件频繁挂载/卸载，只在必要时渲染。

### 4. Toast 定时器管理

```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);

// 清除之前的定时器，避免内存泄漏
if (timerRef.current) {
  clearTimeout(timerRef.current);
}
```

## 设计模式

### 1. 观察者模式（Portal）

```typescript
class PortalManager {
  private listeners: Set<() => void> = new Set();
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
```

### 2. 单例模式（PortalManager）

```typescript
const managerRef = useRef(new PortalManager());
```

使用 `useRef` 确保整个应用生命周期内只有一个 PortalManager 实例。

### 3. Context 模式（Toast）

```typescript
const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ToastContext.Provider value={...}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
```

## 与 React Native 原生 Modal 的对比

| 特性 | 自定义 Modal | 原生 Modal |
|------|------------|-----------|
| 渲染位置 | Portal 顶层 | 原生视图层级 |
| 动画控制 | 完全自定义 | 有限（slide/fade/none） |
| 样式定制 | 完全可控 | 部分受限 |
| 键盘处理 | KeyboardAvoidingView | 需要额外配置 |
| 性能 | JS 驱动（使用 nativeDriver） | 原生驱动 |
| 平台一致性 | 高 | 可能有平台差异 |

## 注意事项

### 1. Portal 必须在 PortalProvider 内使用

```typescript
// ❌ 错误
<Modal visible={true}>Content</Modal>
<PortalProvider>...</PortalProvider>

// ✅ 正确
<PortalProvider>
  <Modal visible={true}>Content</Modal>
</PortalProvider>
```

### 2. Toast 必须在 ToastProvider 内使用

```typescript
// ❌ 错误
function MyComponent() {
  const toast = useToast(); // 会抛出错误
  return <View />;
}
<ToastProvider />

// ✅ 正确
<ToastProvider>
  <MyComponent />
</ToastProvider>
```

### 3. Modal 关闭回调

确保传入 `onClose` 回调，否则用户无法通过点击背景关闭 Modal：

```typescript
<Modal visible={visible} onClose={() => setVisible(false)}>
  <Content />
</Modal>
```

### 4. Toast 类型选择

根据场景选择合适的 Toast 类型：
- `success`: 操作成功
- `error`: 操作失败
- `info`: 一般提示
- `loading`: 加载状态（需要手动调用 `hide()`）

## 总结

这套自定义 Modal 系统通过 Portal 模式实现了组件的灵活渲染，配合 React Native 的 Animated API 提供了流畅的动画效果。核心优势包括：

1. **灵活性**: 完全可控的样式和动画
2. **性能**: 使用原生驱动优化动画性能
3. **可维护性**: 清晰的分层和职责划分
4. **易用性**: 简洁的 API 设计
5. **平台一致性**: 跨平台行为一致

通过合理的设计模式和性能优化，这套系统能够满足应用中各种模态框和提示的需求。
