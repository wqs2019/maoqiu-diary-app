# React Query 服务端状态管理使用指南

本示例展示了如何使用 React Query (TanStack Query) 在 React Native 应用中进行服务端状态管理。

## 📁 文件结构

```
src/
├── api/                    # API 接口定义层
│   └── diaryApi.ts        # 日记相关的 API 接口
├── hooks/                  # 自定义 Hooks
│   ├── useQuery.ts        # React Query 基础封装
│   └── useDiaryQuery.ts   # 日记相关的业务 Hooks
├── screens/                # 页面组件
│   └── DiaryListScreen.tsx # 日记列表示例页面
└── services/               # 服务层
    └── tcb.ts             # TCB 云服务封装
```

## 🚀 核心概念

### 1. **API 接口层** (`src/api/diaryApi.ts`)

定义所有与服务器的交互接口：

```typescript
export const getDiaryList = async (params: DiaryListParams): Promise<DiaryListResponse> => {
  const result = await callFunction<DiaryListResponse>('getDiaryList', params);
  return result.data;
};
```

### 2. **自定义 Hooks 层** (`src/hooks/useDiaryQuery.ts`)

使用 React Query 封装业务逻辑：

```typescript
export const useDiaryList = (params: DiaryListParams = {}) => {
  return useAppQuery(
    ['diaryList', params],  // 查询键
    () => diaryApi.getDiaryList(params),  // 查询函数
    {
      staleTime: 1000 * 60 * 5,  // 5 分钟内数据不失效
      retry: 2,  // 失败重试 2 次
    }
  );
};
```

### 3. **UI 组件层** (`src/screens/DiaryListScreen.tsx`)

在组件中使用 Hooks：

```typescript
const { data, isLoading, error, refetch } = useDiaryList({ page: 1, pageSize: 10 });
```

## 💡 主要特性

### ✅ 自动缓存
- 查询结果自动缓存
- 基于查询键的智能缓存管理
- 可配置的缓存过期时间

### ✅ 背景刷新
- 数据过期后自动后台刷新
- 保持 UI 数据最新
- 无感知的数据更新

### ✅ 加载状态管理
- `isLoading` - 首次加载状态
- `isFetching` - 任何加载状态
- `isRefetching` - 刷新状态

### ✅ 错误处理
- 自动错误捕获
- 重试机制
- 错误状态管理

### ✅ 缓存更新
- `invalidateQueries` - 失效查询
- `setQueryData` - 直接更新缓存
- `removeQueries` - 移除缓存

## 📖 使用示例

### 查询数据

```typescript
// 基础查询
const { data, isLoading, error } = useDiaryList({ page: 1, pageSize: 10 });

// 带配置的查询
const { data, refetch, isFetching } = useDiaryDetail(id, {
  staleTime: 1000 * 60 * 10,  // 10 分钟
  retry: 1,
});
```

### 突变数据

```typescript
// 创建
const createMutation = useCreateDiary();
createMutation.mutate({
  title: '新日记',
  content: '内容...',
  mood: 'happy',
  weather: 'sunny',
});

// 更新
const updateMutation = useUpdateDiary();
updateMutation.mutate({
  id: 'diary-id',
  title: '更新后的标题',
});

// 删除
const deleteMutation = useDeleteDiary();
deleteMutation.mutate('diary-id');
```

### 下拉刷新

```typescript
const { refetch, isFetching } = useDiaryList();

<RefreshControl
  refreshing={isFetching}
  onRefresh={() => refetch()}
/>
```

### 分页加载

```typescript
const [page, setPage] = useState(1);
const { data, isFetching } = useDiaryList({ page, pageSize: 10 });

// 加载更多
const handleLoadMore = () => {
  if (!isFetching && data && data.list.length < data.total) {
    setPage(prev => prev + 1);
  }
};
```

## 🔑 查询键最佳实践

```typescript
// 基础键
['diaryList']

// 带参数
['diaryList', { page: 1, pageSize: 10 }]

// 嵌套键
['diary', 'detail', id]
['diary', 'create']
['diary', 'update', id]

// 使用 JSON 序列化对象参数
const queryKey = JSON.stringify(['diaryList', params]);
[queryKey]
```

## 🎯 缓存更新策略

### 1. 失效并重新获取

```typescript
const queryClient = useQueryClient();

onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['diaryList'] });
}
```

### 2. 乐观更新

```typescript
onMutate: async (newDiary) => {
  // 取消正在进行的查询
  await queryClient.cancelQueries({ queryKey: ['diaryList'] });
  
  // 保存当前数据用于回滚
  const previousData = queryClient.getQueryData(['diaryList']);
  
  // 乐观更新
  queryClient.setQueryData(['diaryList'], (old) => ({
    ...old,
    list: [...old.list, newDiary],
  }));
  
  return { previousData };
},

onError: (err, variables, context) => {
  // 错误时回滚
  queryClient.setQueryData(['diaryList'], context.previousData);
}
```

### 3. 直接更新

```typescript
onSuccess: (updatedDiary, variables) => {
  queryClient.setQueryData(['diaryDetail', variables.id], updatedDiary);
}
```

## ⚙️ 配置选项

```typescript
useAppQuery(queryKey, queryFn, {
  // 数据过期时间
  staleTime: 1000 * 60 * 5,
  
  // 失败重试次数
  retry: 2,
  
  // 重试延迟（指数退避）
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  
  // 窗口聚焦时是否刷新
  refetchOnWindowFocus: false,
  
  // 网络重连时是否刷新
  refetchOnReconnect: true,
  
  // 是否启用查询
  enabled: true,
  
  // 保持上次数据
  keepPreviousData: true,
});
```

## 🎨 完整示例

查看 `src/screens/DiaryListScreen.tsx` 获取完整的实现示例，包括：

- ✅ 列表展示
- ✅ 下拉刷新
- ✅ 分页加载
- ✅ 创建/删除操作
- ✅ 加载状态
- ✅ 错误处理
- ✅ 空状态处理

## 📚 更多资源

- [React Query 官方文档](https://tanstack.com/query/latest)
- [React Query 最佳实践](https://tkdodo.eu/blog/practical-react-query)
- [TanStack Query Devtools](https://tanstack.com/query/latest/docs/react/devtools)

## 🎯 总结

使用 React Query 管理服务端状态的优势：

1. **减少样板代码** - 无需手动管理 loading、error、data 状态
2. **自动缓存** - 智能的缓存策略和背景刷新
3. **性能优化** - 避免不必要的网络请求
4. **开发体验** - 简洁的 API 和强大的 Devtools
5. **类型安全** - 完整的 TypeScript 支持
