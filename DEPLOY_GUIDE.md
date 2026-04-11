# 腾讯云云开发部署指南

## 环境信息

- **环境 ID**: `maoqiu-diary-app-2fpzvwp2e01dbaf`
- **区域**: 广州（ap-guangzhou）
- **SDK**: `@cloudbase/node-sdk`

## 云函数列表

所有云函数都已配置使用 `@cloudbase/node-sdk`：

| 函数名称 | 说明 | SDK |
|---------|------|-----|
| `diary` | 日记管理（增删改查） | ✅ @cloudbase/node-sdk |
| `user` | 用户管理 | ✅ @cloudbase/node-sdk |
| `sendCode` | 发送短信验证码 | ✅ @cloudbase/node-sdk |
| `verifyCode` | 验证短信验证码 | ✅ @cloudbase/node-sdk |
| `login` | 用户登录 | ✅ @cloudbase/node-sdk |
| `validateToken` | 验证用户 Token | ✅ @cloudbase/node-sdk |

## 部署方式

### 方式一：使用 CloudBase CLI（推荐）

```bash
# 1. 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 2. 登录腾讯云
tcb login

# 3. 部署所有云函数
cd cloudfunctions

# 部署单个函数
tcb fn deploy diary --force
tcb fn deploy user --force
tcb fn deploy sendCode --force
tcb fn deploy verifyCode --force
tcb fn deploy login --force
tcb fn deploy validateToken --force

# 或使用批量部署脚本（见下方）
```

### 方式二：使用腾讯云控制台

1. 访问 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境：`maoqiu-diary-app-2fpzvwp2e01dbaf`
3. 进入"云函数"页面
4. 点击"新建"或选择现有函数
5. 上传对应云函数目录的代码

## 批量部署脚本

创建 `deploy.sh` 脚本：

```bash
#!/bin/bash

echo "🚀 开始部署云函数..."

cd cloudfunctions

# 部署所有云函数
for func in diary user sendCode verifyCode login validateToken; do
  echo "📦 部署 $func ..."
  tcb fn deploy $func --force
  echo "✅ $func 部署完成"
done

echo "🎉 所有云函数部署完成！"
```

使用：
```bash
chmod +x deploy.sh
./deploy.sh
```

## 验证部署

### 1. 检查云函数状态

```bash
tcb fn list
```

### 2. 测试云函数调用

在应用前端测试：
```typescript
import { callFunction } from './src/services/tcb';

// 测试 diary 云函数
const result = await callFunction('diary', {
  action: 'create',
  data: {
    title: '测试日记',
    content: '这是一条测试记录',
    scenario: 'daily',
    mood: 'happy',
    weather: 'sunny',
  },
});

console.log('测试结果:', result);
```

### 3. 查看云函数日志

在腾讯云控制台：
- 云函数 → 选择函数 → 日志查询

## 常见问题

### Q1: 部署失败 "Function not found"
**解决**: 确保云函数目录包含 `index.js` 和 `package.json`

### Q2: 调用失败 "Functions is not a function"
**解决**: 检查前端 SDK 是否正确配置，确保使用 `app.callFunction()`

### Q3: 数据库权限错误
**解决**: 在腾讯云控制台配置数据库权限，确保云函数有读写权限

### Q4: 依赖安装失败
**解决**: 
```bash
# 清理缓存
npm cache clean --force

# 重新安装依赖
cd cloudfunctions/diary
npm install

# 重新部署
tcb fn deploy diary --force
```

## 环境变量配置

云函数默认使用 `cloud.SYMBOL_CURRENT_ENV`，会自动使用部署时的环境 ID。

如需指定环境：
```javascript
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: 'maoqiu-diary-app-2fpzvwp2e01dbaf',
  credentials: {
    private_key_path: '/path/to/private_key',
    private_key_id: 'your_private_key_id',
  }
});
```

## 数据库集合

云函数会自动创建以下集合：

- `users` - 用户信息
- `diaries` - 日记数据
- `sms_codes` - 短信验证码（如使用）

## 更新日志

- **2024-01-XX**: 所有云函数统一使用 `@cloudbase/node-sdk`
- 前端 SDK 使用 `@cloudbase/js-sdk` + `@cloudbase/adapter-rn`

## 相关文档

- [腾讯云云开发文档](https://docs.cloudbase.net/)
- [Node.js SDK 文档](https://docs.cloudbase.net/api-reference/server/node-sdk/functions.html)
- [CloudBase CLI 文档](https://docs.cloudbase.net/cli-v1/intro.html)
