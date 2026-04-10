# 快速配置指南

## 🚀 5 分钟快速开始

### 步骤 1: 安装依赖

```bash
npm install
```

### 步骤 2: 配置环境变量

编辑 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env
TCB_ENV_ID=your-env-id          # 替换为你的 TCB 环境 ID
TCB_REGION=ap-guangzhou         # 腾讯云区域
API_BASE_URL=https://api.example.com
SENTRY_DSN=https://your-sentry-dsn
```

### 步骤 3: 配置 TCB 云函数

#### 3.1 登录腾讯云开发控制台

访问：https://console.cloud.tencent.com/tcb

#### 3.2 创建云环境

- 选择「云开发」
- 点击「创建环境」
- 选择环境类型（推荐：按量计费）
- 记录环境 ID

#### 3.3 上传云函数

```bash
cd cloudfunctions

# 上传登录云函数
tcb fn deploy login --envId YOUR_ENV_ID

# 上传发送验证码云函数
tcb fn deploy sendCode --envId YOUR_ENV_ID

# 上传验证验证码云函数
tcb fn deploy verifyCode --envId YOUR_ENV_ID
```

或者在控制台手动上传：
1. 进入「云函数」页面
2. 点击「新建」
3. 上传对应文件夹的代码
4. 配置函数名称（与代码中调用一致）

#### 3.4 创建数据库集合

在控制台进入「数据库」：

**创建 users 集合**
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

**创建 verification_codes 集合**
```json
{
  "_id": "auto",
  "phone": "13800138000",
  "code": "123456",
  "expiresAt": "timestamp",
  "createdAt": "timestamp"
}
```

### 步骤 4: 启动开发服务器

```bash
npm start
```

扫码在真机上测试，或按 `i` / `a` 在模拟器上运行。

## 📱 构建应用

### 配置 EAS

```bash
# 登录 Expo
npx eas login

# 配置 EAS
npx eas build:configure
```

### 构建开发版本

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### 构建生产版本

```bash
# 所有平台
eas build --profile production --platform all
```

## 🔧 可选配置

### Sentry 错误追踪

1. 访问 https://sentry.io 创建账号
2. 创建新项目（选择 React Native）
3. 复制 DSN 到 `.env`

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 短信服务（生产环境）

如果使用阿里云短信：

1. 登录阿里云控制台
2. 开通短信服务
3. 创建签名和模板
4. 获取 AccessKey

在云函数 `sendCode/index.js` 中配置：

```javascript
const ALIYUN_CONFIG = {
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
  signName: '你的签名',
  templateCode: '你的模板 CODE',
};
```

### iOS 发布配置

1. 申请 Apple Developer 账号
2. 在 App Store Connect 创建应用
3. 配置证书和 Provisioning Profile
4. 更新 `eas.json` 中的 `ascAppId`

### Android 发布配置

1. 注册 Google Play Console 账号
2. 创建应用
3. 生成 Keystore
4. 配置 Service Account

## 🧪 测试

### 单元测试

```bash
npm test
```

### 真机测试

1. 安装 Expo Go App
2. 扫描终端二维码
3. 在手机上测试

### 构建测试

```bash
# 构建预览版本
eas build --profile preview --platform all

# 下载并安装测试
```

## 🐛 常见问题

### 1. 无法连接 TCB

**症状**: 登录失败，提示网络错误

**解决**:
- 检查 `TCB_ENV_ID` 是否正确
- 确认云函数已上传
- 检查云函数权限

### 2. 构建失败

**症状**: EAS Build 报错

**解决**:
- 检查 `eas.json` 配置
- 确认已登录 Expo 账号
- 查看构建日志

### 3. 验证码收不到

**症状**: 点击发送验证码无响应

**解决**:
- 开发环境：使用测试码 `123456`
- 生产环境：配置短信服务

### 4. TypeScript 报错

**症状**: `npm run typecheck` 失败

**解决**:
```bash
# 重新安装依赖
rm -rf node_modules
npm install

# 清除缓存
npm start -- --clear
```

## 📚 下一步

配置完成后，你可以：

1. ✅ 开始开发你的功能
2. ✅ 自定义 UI 和主题
3. ✅ 添加更多页面
4. ✅ 集成第三方服务
5. ✅ 准备上架应用商店

## 🆘 获取帮助

- 📖 查看 [README.md](./README.md)
- 🔍 查看 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- 🐛 提交 Issue
- 💬 联系维护者

---

**提示**: 这是模板项目，根据实际需求调整配置。
