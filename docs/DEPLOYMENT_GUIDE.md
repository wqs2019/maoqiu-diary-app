# 毛球日记 - 部署指南

## 📋 目录

1. [云函数部署](#云函数部署)
2. [应用构建](#应用构建)
3. [应用商店发布](#应用商店发布)
4. [环境配置](#环境配置)
5. [监控和维护](#监控和维护)
6. [常见问题](#常见问题)

## 云函数部署

### 环境信息

- **环境 ID**: `maoqiu-diary-app-2fpzvwp2e01dbaf`
- **区域**: 广州（ap-guangzhou）
- **SDK**: `@cloudbase/node-sdk`

### 云函数列表

| 函数名称 | 说明 | 路径 |
|---------|------|------|
| `diary` | 日记管理（增删改查） | `cloudfunctions/diary/` |
| `user` | 用户管理 | `cloudfunctions/user/` |
| `sendCode` | 发送短信验证码 | `cloudfunctions/sendCode/` |
| `verifyCode` | 验证短信验证码 | `cloudfunctions/verifyCode/` |
| `login` | 用户登录 | `cloudfunctions/login/` |
| `validateToken` | 验证用户 Token | `cloudfunctions/validateToken/` |

### 部署方式一：CloudBase CLI（推荐）

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
```

### 部署方式二：批量部署脚本

创建 `deploy-functions.sh` 脚本：

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
chmod +x deploy-functions.sh
./deploy-functions.sh
```

### 部署方式三：腾讯云控制台

1. 访问 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境：`maoqiu-diary-app-2fpzvwp2e01dbaf`
3. 进入"云函数"页面
4. 点击"新建"或选择现有函数
5. 上传对应云函数目录的代码
6. 配置环境变量和触发器

### 验证部署

```bash
# 查看云函数列表
tcb fn list

# 查看云函数日志
tcb fn logs diary

# 测试云函数调用
tcb fn invoke diary --params '{"action":"list"}'
```

### 数据库集合

确保已创建以下集合：

#### 1. users 集合

```json
{
  "_id": "auto",
  "phone": "13800138000",
  "nickname": "用户昵称",
  "avatar": "头像 URL",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**权限配置**:
- 创建：仅云函数可写
- 查询：用户可查自己的数据
- 更新：仅云函数可写
- 删除：仅云函数可写

#### 2. diaries 集合

```json
{
  "_id": "auto",
  "title": "日记标题",
  "content": "日记内容",
  "scenario": "daily",
  "mood": "happy",
  "weather": "sunny",
  "location": "地点",
  "tags": ["标签 1", "标签 2"],
  "images": [],
  "isFavorite": false,
  "isPrivate": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**权限配置**:
- 创建：仅云函数可写
- 查询：用户可查自己的数据
- 更新：仅云函数可写
- 删除：仅云函数可写

#### 3. verification_codes 集合

```json
{
  "_id": "auto",
  "phone": "13800138000",
  "code": "123456",
  "expiresAt": "timestamp",
  "createdAt": "timestamp"
}
```

**权限配置**:
- 创建：仅云函数可写
- 查询：仅云函数可读
- 更新：仅云函数可写
- 删除：自动过期删除

## 应用构建

### 配置 EAS

```bash
# 1. 登录 Expo
npx eas login

# 2. 配置 EAS
npx eas build:configure
```

### eas.json 配置

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "TCB_ENV_ID": "maoqiu-diary-app-2fpzvwp2e01dbaf"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "your-app-store-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

### 构建开发版本

```bash
# 开发版本（支持开发菜单）
eas build --profile development --platform all

# 仅 iOS
eas build --profile development --platform ios

# 仅 Android
eas build --profile development --platform android
```

### 构建预览版本

```bash
# 预览版本（内部测试）
eas build --profile preview --platform all

# 生成 APK
eas build --profile preview --platform android --output app-preview.apk
```

### 构建生产版本

```bash
# 生产版本（应用商店）
eas build --profile production --platform all

# 查看构建状态
eas build:list

# 下载构建产物
eas build:download --platform ios
```

## 应用商店发布

### iOS App Store

#### 1. 准备工作

- [ ] Apple Developer 账号（$99/年）
- [ ] App Store Connect 账号
- [ ] 应用图标（1024x1024）
- [ ] 应用截图（6.7 寸和 5.5 寸）
- [ ] 应用描述和关键词
- [ ] 隐私政策 URL
- [ ] 支持 URL

#### 2. 配置证书

```bash
# 自动配置（推荐）
eas build --profile production --platform ios

# 手动配置
# 1. 在 App Store Connect 创建 App ID
# 2. 创建证书和 Provisioning Profile
# 3. 下载并安装证书
```

#### 3. 提交审核

```bash
# 构建并提
eas submit --platform ios

# 或手动提交
# 1. 在 App Store Connect 创建新版本
# 2. 上传构建产物
# 3. 填写版本信息
# 4. 提交审核
```

#### 4. 审核注意事项

- 确保功能完整且可正常使用
- 隐私政策必须有效
- 应用描述准确
- 截图与实际应用一致
- 无崩溃和严重 Bug

### Google Play

#### 1. 准备工作

- [ ] Google Play Console 账号（$25 一次性）
- [ ] 应用图标（512x512）
- [ ] 应用截图（至少 2 张）
- [ ] 应用描述
- [ ] 隐私政策 URL

#### 2. 配置签名

```bash
# 生成 Keystore
keytool -genkey -v -keystore maoqiu-diary.keystore -alias maoqiu-diary -keyalg RSA -keysize 2048 -validity 10000

# 配置到 eas.json
{
  "android": {
    "keystore": {
      "keystorePath": "maoqiu-diary.keystore",
      "keystorePassword": "your-password",
      "keyAlias": "maoqiu-diary",
      "keyPassword": "your-key-password"
    }
  }
}
```

#### 3. 构建和发布

```bash
# 构建 AAB（应用包）
eas build --profile production --platform android

# 提交到 Google Play
eas submit --platform android

# 或手动上传到 Google Play Console
```

#### 4. 发布流程

1. **内部测试** - 内部测试人员
2. **封闭测试** - 指定测试人员
3. **开放测试** - 公开测试
4. **生产发布** - 正式发布

## 环境配置

### 开发环境

```bash
# .env.development
TCB_ENV_ID=maoqiu-diary-app-2fpzvwp2e01dbaf
TCB_REGION=ap-guangzhou
API_BASE_URL=https://dev-api.example.com
SENTRY_DSN=https://dev-sentry-dsn
```

### 预览环境

```bash
# .env.preview
TCB_ENV_ID=maoqiu-diary-app-2fpzvwp2e01dbaf
TCB_REGION=ap-guangzhou
API_BASE_URL=https://preview-api.example.com
SENTRY_DSN=https://preview-sentry-dsn
```

### 生产环境

```bash
# .env.production
TCB_ENV_ID=maoqiu-diary-app-2fpzvwp2e01dbaf
TCB_REGION=ap-guangzhou
API_BASE_URL=https://api.example.com
SENTRY_DSN=https://prod-sentry-dsn
```

### 环境变量管理

```bash
# 使用 EAS 环境变量
eas env:push --profile production

# 拉取环境变量
eas env:pull --profile production

# 查看环境变量
eas env:list --profile production
```

## 监控和维护

### Sentry 错误监控

#### 1. 配置 Sentry

```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-sentry-dsn@xxx.ingest.sentry.io/xxx',
  environment: 'production',
  tracesSampleRate: 0.2,
});
```

#### 2. 捕获异常

```typescript
import { captureException, setUser } from '@sentry/react-native';

try {
  // 可能出错的代码
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { module: 'diary' },
  });
}

// 设置用户
setUser({
  id: user._id,
  username: user.nickname,
});
```

#### 3. 查看错误报告

访问 Sentry Dashboard:
- 错误列表
- 性能监控
- 用户反馈

### 性能监控

```typescript
// 性能追踪
import { startTransaction } from '@sentry/react-native';

const transaction = startTransaction({
  name: 'fetchDiaries',
  op: 'function',
});

try {
  const diaries = await diaryService.getDiaries();
  return diaries;
} finally {
  transaction.finish();
}
```

### 日志管理

```bash
# 查看云函数日志
tcb fn logs diary --limit 100

# 实时查看日志
tcb fn logs diary --follow

# 导出日志
tcb fn logs diary --output diary-logs.json
```

### 数据备份

```bash
# 导出数据库
tcb database:export diaries diaries-backup.json

# 导入数据库
tcb database:import diaries diaries-backup.json

# 定时备份（使用云函数定时触发器）
```

## 常见问题

### Q1: 云函数部署失败

**症状**: `tcb fn deploy` 报错

**解决**:
```bash
# 检查登录状态
tcb login

# 检查环境
tcb env:list

# 清理缓存
rm -rf node_modules
npm install

# 重新部署
tcb fn deploy diary --force
```

### Q2: 构建失败 "Credentials error"

**症状**: EAS Build 报错证书错误

**解决**:
```bash
# iOS
# 1. 检查 Apple Developer 账号
# 2. 重新创建证书和 Provisioning Profile
# 3. 清理缓存
eas build:cancel

# Android
# 1. 检查 Keystore 配置
# 2. 确认密码正确
```

### Q3: 应用商店审核被拒

**解决**:
- **隐私问题**: 完善隐私政策，说明数据收集和使用
- **功能问题**: 确保所有功能正常工作
- **崩溃问题**: 修复所有已知 Bug
- **元数据问题**: 更新应用描述和截图

### Q4: 云函数调用超时

**症状**: 云函数调用超过 3 秒

**解决**:
```javascript
// 优化云函数性能
// 1. 减少数据库查询
const diaries = await db.collection('diaries')
  .where({ userId })
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// 2. 使用索引
// 在腾讯云控制台为常用查询字段创建索引

// 3. 缓存数据
const cached = await cache.get('diaries');
if (cached) return cached;
```

### Q5: 用户登录失败

**症状**: 验证码发送失败或验证失败

**解决**:
```javascript
// 检查短信服务配置
// 1. 开发环境使用测试码：123456
// 2. 生产环境配置阿里云短信服务

// 检查云函数日志
tcb fn logs sendCode --limit 50

// 检查数据库权限
// 确保 verification_codes 集合权限正确
```

### Q6: 数据同步失败

**症状**: 前端数据与云端不一致

**解决**:
```typescript
// 1. 检查网络连接
import NetInfo from '@react-native-community/netinfo';

const state = await NetInfo.fetch();
console.log('Network:', state.isConnected);

// 2. 检查认证状态
const auth = await CloudService.ensureAuth();
console.log('Auth:', auth.hasLoginState?.());

// 3. 清除缓存
queryClient.clear();

// 4. 重新拉取数据
queryClient.invalidateQueries(['diaries']);
```

### Q7: 应用崩溃

**解决**:
```bash
# 查看崩溃日志
# iOS: Xcode → Devices and Simulators → View Device Logs
# Android: adb logcat

# 查看 Sentry 错误报告
# 访问 Sentry Dashboard 查看崩溃堆栈

# 本地调试
npm start -- --clear
```

## 发布清单

### 发布前检查

- [ ] 所有功能测试通过
- [ ] 无崩溃和严重 Bug
- [ ] 云函数部署成功
- [ ] 数据库权限配置正确
- [ ] 环境变量配置正确
- [ ] Sentry 监控正常
- [ ] 应用图标和截图更新
- [ ] 应用描述和关键词优化
- [ ] 隐私政策更新
- [ ] 版本号更新

### 发布流程

1. **构建生产版本**
   ```bash
   eas build --profile production --platform all
   ```

2. **提交应用商店**
   ```bash
   eas submit --platform all
   ```

3. **等待审核**
   - iOS: 通常 24-48 小时
   - Android: 通常 2-7 天

4. **监控发布**
   - 查看下载量
   - 监控崩溃率
   - 收集用户反馈

5. **迭代更新**
   - 根据反馈优化
   - 定期发布新版本

## 成本优化

### 腾讯云开发成本

- **云函数**: 按调用次数和运行时间计费
- **数据库**: 按存储量和读写次数计费
- **短信服务**: 按发送条数计费

### 优化建议

1. **云函数优化**
   - 减少不必要的调用
   - 优化函数性能
   - 使用缓存

2. **数据库优化**
   - 合理设计索引
   - 定期清理过期数据
   - 分页查询

3. **短信优化**
   - 开发环境使用测试码
   - 限制发送频率
   - 使用验证码缓存

---

**提示**: 部署前务必在测试环境充分测试，确保所有功能正常。
