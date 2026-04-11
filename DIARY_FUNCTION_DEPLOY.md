# 日记云函数部署说明

## 云函数信息

- **函数名称**: diary
- **环境 ID**: maoqiu-diary-app-2fpzvwp2e01dbaf
- **运行环境**: Node.js 16
- **目录**: `cloudfunctions/diary/`

## 部署方式

### 方式一：使用 CloudBase CLI（推荐）

```bash
# 1. 安装 CloudBase CLI（如果未安装）
npm install -g @cloudbase/cli

# 2. 登录腾讯云
tcb login

# 3. 进入云函数目录
cd cloudfunctions/diary

# 4. 部署云函数
tcb fn deploy diary --force
```

### 方式二：使用腾讯云控制台

1. 访问 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境：`maoqiu-diary-app-2fpzvwp2e01dbaf`
3. 进入"云函数"页面
4. 点击"新建"
5. 函数名称：`diary`
6. 上传方式：本地上传
7. 上传目录：`cloudfunctions/diary`
8. 点击"确定"

## 功能说明

### 支持的操作

| 操作 | action 参数 | 说明 |
|------|-----------|------|
| 创建日记 | `create` | 创建新的日记记录 |
| 更新日记 | `update` | 更新现有日记 |
| 获取详情 | `get` | 获取单篇日记详情 |
| 获取列表 | `list` | 获取日记列表（支持分页和筛选） |
| 删除日记 | `delete` | 删除日记 |

### 创建日记

**调用示例**:
```javascript
import { createDiary } from './api/diaryApi';

await createDiary({
  title: '周末的咖啡馆时光',
  content: '发现了一家超级温馨的咖啡馆...',
  scenario: 'daily',
  mood: 'relaxed',
  weather: 'sunny',
  location: '街角咖啡馆',
  tags: ['daily', 'mood'],
  images: [],
});
```

**参数说明**:
- `title`: 标题（可选，但 title 和 content 不能同时为空）
- `content`: 内容（可选，但 title 和 content 不能同时为空）
- `scenario`: 场景类型（必填）
- `mood`: 心情类型（必填）
- `weather`: 天气类型（必填）
- `location`: 地点（可选）
- `tags`: 标签数组（可选）
- `images`: 图片数组（可选）

### 获取日记列表

**调用示例**:
```javascript
import { getDiaryList } from './api/diaryApi';

const result = await getDiaryList({
  page: 1,
  pageSize: 10,
  scenario: 'daily',
  mood: 'relaxed',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

### 更新日记

**调用示例**:
```javascript
import { updateDiary } from './api/diaryApi';

await updateDiary('diary_id', {
  title: '新的标题',
  content: '更新后的内容',
  mood: 'happy',
});
```

### 删除日记

**调用示例**:
```javascript
import { deleteDiary } from './api/diaryApi';

await deleteDiary('diary_id');
```

## 数据库集合

云函数会在以下集合中操作数据：

- **diaries**: 日记数据集合
  - 字段：`_id`, `title`, `content`, `scenario`, `mood`, `weather`, `location`, `tags`, `images`, `createdAt`, `updatedAt`, `isFavorite`, `isPrivate`

## 注意事项

1. **首次使用**: 首次调用云函数时，会自动创建 `diaries` 集合
2. **权限控制**: 云函数默认有完整的数据库读写权限
3. **数据验证**: 创建日记时，title 和 content 不能同时为空
4. **时间格式**: createdAt 和 updatedAt 使用 ISO 8601 格式
5. **分页**: 默认每页 10 条数据

## 常见问题

### Q: 部署失败怎么办？
A: 检查以下几点：
- 确保已安装 CloudBase CLI
- 确保已登录腾讯云
- 检查网络连接
- 查看错误日志

### Q: 调用云函数返回"函数不存在"？
A: 确保云函数已正确部署到腾讯云环境

### Q: 如何查看云函数日志？
A: 在腾讯云控制台 -> 云函数 -> 日志查询中查看

## 相关文件

- 云函数代码：`cloudfunctions/diary/index.js`
- 依赖配置：`cloudfunctions/diary/package.json`
- API 封装：`src/api/diaryApi.ts`
- 编辑页面：`src/screens/edit/EditDiaryScreen.tsx`
