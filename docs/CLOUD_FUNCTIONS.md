# 毛球日记 - 云函数文档

## 📋 目录

1. [云函数概览](#云函数概览)
2. [API 接口文档](#api-接口文档)
3. [数据库结构](#数据库结构)
4. [错误码](#错误码)
5. [安全认证](#安全认证)
6. [最佳实践](#最佳实践)

## 云函数概览

### 环境信息

- **环境 ID**: `maoqiu-diary-app-2fpzvwp2e01dbaf`
- **区域**: 广州（ap-guangzhou）
- **SDK**: `@cloudbase/node-sdk` v2.27.2+

### 云函数列表

| 函数名 | 功能 | 调用方式 | 说明 |
|-------|------|---------|------|
| `diary` | 日记管理 | POST | 增删改查日记记录 |
| `user` | 用户管理 | POST | 用户信息管理 |
| `sendCode` | 发送验证码 | POST | 发送短信验证码 |
| `verifyCode` | 验证验证码 | POST | 验证短信验证码 |
| `login` | 用户登录 | POST | 用户认证登录 |
| `validateToken` | 验证 Token | POST | 验证用户 Token 有效性 |

## API 接口文档

### 1. diary - 日记管理

**云函数名称**: `diary`

#### 1.1 创建日记

```javascript
// 调用参数
{
  "action": "create",
  "data": {
    "title": "我的旅行",
    "content": "今天去了...",
    "scenario": "travel",
    "mood": "happy",
    "weather": "sunny",
    "location": "北京",
    "tags": ["旅行", "放松"]
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "diary_id",
    "title": "我的旅行",
    "content": "今天去了...",
    "scenario": "travel",
    "mood": "happy",
    "weather": "sunny",
    "location": "北京",
    "tags": ["旅行", "放松"],
    "isFavorite": false,
    "isPrivate": false,
    "createdAt": 1234567890000,
    "updatedAt": 1234567890000
  }
}
```

**数据验证**:
- `title`: 可选，最大长度 200 字符
- `content`: 可选，最大长度 10000 字符
- `scenario`: 必需，枚举值：`travel`, `movie`, `outdoor`, `food`, `daily`, `special`
- `mood`: 可选，枚举值：`happy`, `sad`, `normal`, `excited`, `tired`, `relaxed`
- `weather`: 可选，枚举值：`sunny`, `cloudy`, `rainy`, `snowy`, `windy`
- `location`: 可选，最大长度 200 字符
- `tags`: 可选，字符串数组，最多 10 个标签

#### 1.2 更新日记

```javascript
// 调用参数
{
  "action": "update",
  "data": {
    "_id": "diary_id",
    "title": "更新的标题",
    "content": "更新的内容",
    "mood": "excited"
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "diary_id",
    "title": "更新的标题",
    // ... 其他字段
  }
}
```

**注意**:
- 只能更新自己的日记
- `_id` 必需
- 至少提供一个要更新的字段

#### 1.3 删除日记

```javascript
// 调用参数
{
  "action": "delete",
  "data": {
    "_id": "diary_id"
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "message": "删除成功"
}
```

**注意**:
- 只能删除自己的日记
- 物理删除，不可恢复

#### 1.4 获取单篇日记

```javascript
// 调用参数
{
  "action": "get",
  "data": {
    "_id": "diary_id"
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "diary_id",
    "title": "日记标题",
    // ... 其他字段
  }
}
```

#### 1.5 获取日记列表

```javascript
// 调用参数
{
  "action": "list",
  "data": {
    "scenario": "all",  // 或具体场景：travel, movie, etc.
    "mood": "all",      // 或具体心情：happy, sad, etc.
    "limit": 20,
    "offset": 0
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "list": [
      {
        "_id": "diary_id_1",
        "title": "日记 1",
        // ... 其他字段
      }
    ],
    "total": 100,
    "hasMore": true
  }
}
```

**筛选参数**:
- `scenario`: 场景筛选，`all` 表示全部
- `mood`: 心情筛选，`all` 表示全部
- `limit`: 每页数量，默认 20，最大 100
- `offset`: 偏移量，用于分页

### 2. user - 用户管理

**云函数名称**: `user`

#### 2.1 获取用户信息

```javascript
// 调用参数
{
  "action": "get"
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "user_id",
    "phone": "138****1234",
    "nickname": "用户昵称",
    "avatar": "头像 URL",
    "createdAt": 1234567890000,
    "updatedAt": 1234567890000
  }
}
```

#### 2.2 创建用户

```javascript
// 调用参数
{
  "action": "add",
  "data": {
    "phone": "13800138000",
    "nickname": "昵称",
    "avatar": "头像 URL"
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "user_id",
    "phone": "13800138000",
    "nickname": "昵称",
    "avatar": "头像 URL"
  }
}
```

**注意**:
- `phone` 必需且唯一
- `nickname` 可选，默认 "毛球用户"
- `avatar` 可选，默认头像

#### 2.3 更新用户信息

```javascript
// 调用参数
{
  "action": "update",
  "data": {
    "nickname": "新昵称",
    "avatar": "新头像 URL"
  }
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "_id": "user_id",
    "nickname": "新昵称",
    "avatar": "新头像 URL"
  }
}
```

**注意**:
- 只能更新自己的信息
- `phone` 不可修改

### 3. sendCode - 发送验证码

**云函数名称**: `sendCode`

```javascript
// 调用参数
{
  "phone": "13800138000"
}

// 返回结果
{
  "code": "SUCCESS",
  "message": "验证码已发送"
}
```

**说明**:
- 开发环境：统一返回测试码 `123456`
- 生产环境：调用阿里云短信服务
- 验证码有效期：5 分钟
- 发送频率限制：同一手机号 60 秒内只能发送一次

**错误处理**:
```javascript
// 发送过于频繁
{
  "code": "CODE_SENT_RECENTLY",
  "message": "验证码已发送，请稍后再试"
}

// 手机号格式错误
{
  "code": "INVALID_PHONE",
  "message": "手机号格式错误"
}
```

### 4. verifyCode - 验证验证码

**云函数名称**: `verifyCode`

```javascript
// 调用参数
{
  "phone": "13800138000",
  "code": "123456"
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "verified": true,
    "token": "user_token"
  }
}
```

**说明**:
- 验证码错误返回错误
- 验证码过期返回错误
- 验证成功返回 token

**错误处理**:
```javascript
// 验证码错误
{
  "code": "CODE_INVALID",
  "message": "验证码错误"
}

// 验证码过期
{
  "code": "CODE_EXPIRED",
  "message": "验证码已过期"
}

// 验证码不存在
{
  "code": "CODE_NOT_FOUND",
  "message": "验证码不存在"
}
```

### 5. login - 用户登录

**云函数名称**: `login`

```javascript
// 调用参数
{
  "phone": "13800138000",
  "code": "123456"
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "user": {
      "_id": "user_id",
      "phone": "138****1234",
      "nickname": "用户昵称",
      "avatar": "头像 URL"
    },
    "token": "user_token"
  }
}
```

**说明**:
- 首次登录自动创建用户
- 返回用户信息和 token
- token 用于后续请求认证

### 6. validateToken - 验证 Token

**云函数名称**: `validateToken`

```javascript
// 调用参数
{
  "token": "user_token"
}

// 返回结果
{
  "code": "SUCCESS",
  "data": {
    "valid": true,
    "user": {
      "_id": "user_id",
      "phone": "138****1234",
      "nickname": "用户昵称"
    }
  }
}
```

**错误处理**:
```javascript
// Token 无效
{
  "code": "TOKEN_INVALID",
  "message": "Token 无效"
}

// Token 过期
{
  "code": "TOKEN_EXPIRED",
  "message": "Token 已过期"
}
```

## 数据库结构

### 1. users 集合

**描述**: 存储用户信息

**字段说明**:
```typescript
interface User {
  _id: string;           // 自动生成的唯一 ID
  phone: string;         // 手机号（加密存储）
  nickname: string;      // 昵称
  avatar?: string;       // 头像 URL
  createdAt: number;     // 创建时间戳
  updatedAt: number;     // 更新时间戳
}
```

**索引**:
- `phone`: 唯一索引
- `createdAt`: 普通索引

**权限**:
```javascript
// 读写规则
{
  "read": "auth.openid == doc.openid",  // 只能读自己的数据
  "write": false  // 只能通过云函数写入
}
```

### 2. diaries 集合

**描述**: 存储日记记录

**字段说明**:
```typescript
interface Diary {
  _id: string;           // 自动生成的唯一 ID
  userId: string;        // 用户 ID
  title: string;         // 标题（最大 200 字符）
  content?: string;      // 内容（最大 10000 字符）
  scenario: string;      // 场景：travel/movie/outdoor/food/daily/special
  mood?: string;         // 心情：happy/sad/normal/excited/tired/relaxed
  weather?: string;      // 天气：sunny/cloudy/rainy/snowy/windy
  location?: string;     // 地点（最大 200 字符）
  tags?: string[];       // 标签数组（最多 10 个）
  images?: string[];     // 图片 URL 数组（预留）
  isFavorite: boolean;   // 是否收藏（预留）
  isPrivate: boolean;    // 是否私密（预留）
  createdAt: number;     // 创建时间戳
  updatedAt: number;     // 更新时间戳
}
```

**索引**:
- `userId`: 普通索引
- `createdAt`: 普通索引
- `scenario`: 普通索引
- `mood`: 普通索引
- `userId + createdAt`: 复合索引（降序）

**权限**:
```javascript
// 读写规则
{
  "read": "auth.openid == doc.openid",  // 只能读自己的数据
  "write": false  // 只能通过云函数写入
}
```

### 3. verification_codes 集合

**描述**: 存储短信验证码

**字段说明**:
```typescript
interface VerificationCode {
  _id: string;           // 自动生成的唯一 ID
  phone: string;         // 手机号
  code: string;          // 验证码（6 位数字）
  expiresAt: number;     // 过期时间戳
  createdAt: number;     // 创建时间戳
}
```

**索引**:
- `phone`: 普通索引
- `expiresAt`: 普通索引（用于清理过期数据）

**权限**:
```javascript
// 读写规则
{
  "read": false,  // 不允许直接读取
  "write": false  // 只能通过云函数写入
}
```

**自动清理**:
- 验证码有效期：5 分钟
- 定时任务：每小时清理过期数据

## 错误码

### 通用错误码

| 错误码 | 说明 | HTTP 状态码 |
|-------|------|-----------|
| `SUCCESS` | 成功 | 200 |
| `ERROR` | 系统错误 | 500 |
| `INVALID_PARAMS` | 参数错误 | 400 |
| `UNAUTHORIZED` | 未授权 | 401 |
| `FORBIDDEN` | 禁止访问 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |

### 业务错误码

#### 用户相关

| 错误码 | 说明 |
|-------|------|
| `USER_NOT_FOUND` | 用户不存在 |
| `USER_ALREADY_EXISTS` | 用户已存在 |
| `INVALID_PHONE` | 手机号格式错误 |
| `INVALID_NICKNAME` | 昵称格式错误 |

#### 验证码相关

| 错误码 | 说明 |
|-------|------|
| `CODE_INVALID` | 验证码错误 |
| `CODE_EXPIRED` | 验证码过期 |
| `CODE_NOT_FOUND` | 验证码不存在 |
| `CODE_SENT_RECENTLY` | 验证码已发送，请稍后再试 |

#### Token 相关

| 错误码 | 说明 |
|-------|------|
| `TOKEN_INVALID` | Token 无效 |
| `TOKEN_EXPIRED` | Token 过期 |
| `TOKEN_REQUIRED` | 缺少 Token |

#### 日记相关

| 错误码 | 说明 |
|-------|------|
| `DIARY_NOT_FOUND` | 日记不存在 |
| `DIARY_CREATE_FAILED` | 日记创建失败 |
| `DIARY_UPDATE_FAILED` | 日记更新失败 |
| `DIARY_DELETE_FAILED` | 日记删除失败 |

## 安全认证

### 认证流程

```
1. 用户请求发送验证码
   ↓
2. sendCode 云函数发送验证码
   ↓
3. 用户输入验证码
   ↓
4. verifyCode 云函数验证
   ↓
5. login 云函数登录，返回 token
   ↓
6. 前端存储 token
   ↓
7. 后续请求携带 token
   ↓
8. validateToken 云函数验证 token
```

### Token 机制

```javascript
// Token 生成（在 login 云函数中）
const token = jwt.sign(
  { userId: user._id, phone: user.phone },
  SECRET_KEY,
  { expiresIn: '30d' }
);

// Token 验证（在 validateToken 云函数中）
const decoded = jwt.verify(token, SECRET_KEY);
const user = await db.collection('users').doc(decoded.userId).get();
```

### 安全措施

1. **HTTPS 传输**
   - 所有请求使用 HTTPS
   - 防止中间人攻击

2. **Token 加密**
   - 使用 JWT 加密
   - 设置过期时间

3. **数据验证**
   - 所有输入参数严格验证
   - 防止 SQL 注入

4. **权限控制**
   - 数据库权限最小化
   - 只能访问自己的数据

5. **频率限制**
   - 验证码发送频率限制
   - API 调用频率限制

## 最佳实践

### 性能优化

#### 1. 数据库查询优化

```javascript
// ✅ 好的做法：使用索引
const diaries = await db.collection('diaries')
  .where({ userId })
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// ❌ 避免：全表扫描
const diaries = await db.collection('diaries')
  .where({ mood: 'happy' })
  .get();
```

#### 2. 分页查询

```javascript
// 使用 offset 分页
const diaries = await db.collection('diaries')
  .where({ userId })
  .orderBy('createdAt', 'desc')
  .skip(offset)
  .limit(limit)
  .get();

// 或使用游标分页（推荐）
const diaries = await db.collection('diaries')
  .where({ userId })
  .where({ createdAt: db.command.lt(lastCreatedAt) })
  .orderBy('createdAt', 'desc')
  .limit(limit)
  .get();
```

#### 3. 批量操作

```javascript
// ✅ 使用批量操作
const batch = db.batch();
diaries.forEach(diary => {
  batch.update(db.collection('diaries').doc(diary._id), {
    isFavorite: true
  });
});
await batch.commit();

// ❌ 避免：循环单条操作
diaries.forEach(async diary => {
  await db.collection('diaries').doc(diary._id).update({
    isFavorite: true
  });
});
```

### 错误处理

```javascript
// ✅ 完整的错误处理
exports.main = async (event, context) => {
  try {
    const { action, data } = event;
    
    if (!action) {
      return { code: 'INVALID_PARAMS', message: '缺少 action 参数' };
    }
    
    const actions = {
      create: createDiary,
      update: updateDiary,
      delete: deleteDiary,
      get: getDiary,
      list: listDiaries,
    };
    
    if (!actions[action]) {
      return { code: 'INVALID_PARAMS', message: '不支持的操作' };
    }
    
    const result = await actions[action](data);
    return { code: 'SUCCESS', data: result };
    
  } catch (error) {
    console.error('Cloud function error:', error);
    return { 
      code: 'ERROR', 
      message: error.message || '操作失败' 
    };
  }
};
```

### 日志记录

```javascript
// ✅ 详细的日志记录
const createDiary = async (data) => {
  console.log('[createDiary] Start:', { data });
  
  const result = await db.collection('diaries').add({
    ...data,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  });
  
  console.log('[createDiary] Success:', { result });
  return result;
};
```

### 数据验证

```javascript
// ✅ 严格的数据验证
const validateDiaryData = (data) => {
  const errors = [];
  
  if (data.title && data.title.length > 200) {
    errors.push('标题长度不能超过 200 字符');
  }
  
  if (data.content && data.content.length > 10000) {
    errors.push('内容长度不能超过 10000 字符');
  }
  
  const validScenarios = ['travel', 'movie', 'outdoor', 'food', 'daily', 'special'];
  if (data.scenario && !validScenarios.includes(data.scenario)) {
    errors.push('无效的场景类型');
  }
  
  if (data.tags && data.tags.length > 10) {
    errors.push('最多只能添加 10 个标签');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
};
```

### 缓存策略

```javascript
// ✅ 使用缓存减少数据库查询
const getDiary = async (diaryId) => {
  // 尝试从缓存获取
  const cached = await cache.get(`diary:${diaryId}`);
  if (cached) {
    return cached;
  }
  
  // 从数据库获取
  const diary = await db.collection('diaries').doc(diaryId).get();
  
  // 写入缓存（5 分钟）
  await cache.set(`diary:${diaryId}`, diary, 300);
  
  return diary;
};
```

---

**提示**: 云函数代码已部署到腾讯云开发环境，修改后需要重新部署才能生效。
