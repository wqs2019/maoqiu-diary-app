# 配置检查清单

## 📋 部署前检查

### 环境变量 (.env)

- [ ] `TCB_ENV_ID` - 腾讯云开发环境 ID
- [ ] `TCB_REGION` - 腾讯云开发区域（默认：ap-guangzhou）
- [ ] `API_BASE_URL` - API 基础 URL（如有）
- [ ] `SENTRY_DSN` - Sentry 错误追踪 DSN（可选）

### TCB 云函数

确保已上传以下云函数到腾讯云开发：

- [ ] `login` - 用户登录
- [ ] `sendCode` - 发送验证码
- [ ] `verifyCode` - 验证验证码

### 云数据库集合

确保已创建以下集合：

- [ ] `users` - 用户信息
  - 字段：phone, nickname, avatar, createdAt, updatedAt
- [ ] `verification_codes` - 验证码
  - 字段：phone, code, expiresAt, createdAt

### 云开发权限

- [ ] 配置数据库读写权限
- [ ] 配置云函数调用权限
- [ ] 配置短信服务（如需）

### 应用配置 (app.json)

- [ ] `expo.name` - 应用名称
- [ ] `expo.slug` - 应用标识
- [ ] `expo.ios.bundleIdentifier` - iOS Bundle ID
- [ ] `expo.android.package` - Android 包名
- [ ] `expo.extra` - 额外配置（与环境变量一致）

### EAS Build 配置 (eas.json)

- [ ] 配置开发环境
- [ ] 配置预览环境
- [ ] 配置生产环境
- [ ] 配置 iOS 提交（App Store Connect App ID）
- [ ] 配置 Android 提交（Service Account）

### 证书和密钥

- [ ] iOS 开发证书
- [ ] iOS 发布证书
- [ ] iOS Provisioning Profile
- [ ] Android Keystore
- [ ] Google Play Service Account（Android 提交）

### 第三方服务

#### Sentry（错误追踪）

- [ ] 创建 Sentry 项目
- [ ] 获取 DSN
- [ ] 配置 DSN 到环境变量

#### 短信服务（可选）

- [ ] 阿里云短信服务 AccessKey
- [ ] 短信签名
- [ ] 短信模板

### Git 配置

- [ ] .gitignore 已配置（不包含敏感信息）
- [ ] .env 文件已添加到 .gitignore
- [ ] Husky Git Hooks 已安装

### 代码质量

- [ ] ESLint 检查通过
- [ ] Prettier 格式化完成
- [ ] TypeScript 类型检查通过
- [ ] 测试用例通过

### 构建检查

```bash
# 本地构建测试
npm run lint
npm run typecheck
npm test

# EAS 构建预览
eas build --profile preview --platform all
```

## 🚀 部署流程

### 1. 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 2. 构建开发版本

```bash
# 构建开发版本（支持开发菜单）
eas build --profile development --platform all

# 安装到设备测试
```

### 3. 构建预览版本

```bash
# 内部测试版本
eas build --profile preview --platform all
```

### 4. 构建生产版本

```bash
# 应用商店版本
eas build --profile production --platform all

# 提交到应用商店
eas submit --platform all
```

## 📱 应用商店上架

### iOS App Store

- [ ] App Store Connect 账号
- [ ] App 图标和截图
- [ ] 应用描述和关键词
- [ ] 隐私政策 URL
- [ ] 支持 URL
- [ ] 分类和年龄分级
- [ ] 内购项目（如有）

### Google Play

- [ ] Google Play Console 账号
- [ ] 应用图标和截图
- [ ] 应用描述
- [ ] 隐私政策
- [ ] 分类和内容分级
- [ ] 应用签名密钥

## 🔐 安全检查

- [ ] 无硬编码密钥
- [ ] 环境变量配置正确
- [ ] API 接口有认证
- [ ] 用户数据加密存储
- [ ] HTTPS 通信
- [ ] 权限最小化原则

## 📊 性能优化

- [ ] 图片使用 WebP 格式
- [ ] 列表使用 FlashList
- [ ] 动画使用 Reanimated
- [ ] 启用代码分割
- [ ] 启用缓存策略
- [ ] 监控应用性能

## 📝 文档完善

- [ ] README.md 更新
- [ ] API 文档
- [ ] 部署文档
- [ ] 用户手册
- [ ] 常见问题 FAQ

## ✅ 最终检查

在提交应用商店前，确保：

1. ✅ 所有功能正常工作
2. ✅ 无崩溃和严重 Bug
3. ✅ 性能指标达标
4. ✅ 符合应用商店规范
5. ✅ 隐私政策完善
6. ✅ 用户协议明确
7. ✅ 有完整的错误监控
8. ✅ 有数据备份方案

***

**提示**: 使用此清单作为部署指南，确保不遗漏任何重要步骤。
