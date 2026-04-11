# 🚀 云函数部署指南

## 当前状态

⚠️ **云函数尚未部署** - 这是保存失败的原因

## 快速部署

### 方式一：使用部署脚本（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x deploy-functions.sh

# 2. 登录腾讯云（首次需要）
tcb login

# 3. 运行部署脚本
./deploy-functions.sh
```

### 方式二：手动部署

```bash
# 1. 安装 CloudBase CLI（如果未安装）
npm install -g @cloudbase/cli

# 2. 登录腾讯云
tcb login

# 3. 部署所有云函数
cd cloudfunctions
tcb fn deploy diary --force
tcb fn deploy user --force
tcb fn deploy sendCode --force
tcb fn deploy verifyCode --force
tcb fn deploy login --force
tcb fn deploy validateToken --force
```

### 方式三：使用腾讯云控制台

1. 访问 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境：`maoqiu-diary-app-2fpzvwp2e01dbaf`
3. 进入"云函数"页面
4. 点击"新建"
5. 依次创建以下云函数：

| 函数名称 | 目录 | 运行环境 |
|---------|------|---------|
| `diary` | `cloudfunctions/diary` | Node.js 16 |
| `user` | `cloudfunctions/user` | Node.js 16 |
| `sendCode` | `cloudfunctions/sendCode` | Node.js 16 |
| `verifyCode` | `cloudfunctions/verifyCode` | Node.js 16 |
| `login` | `cloudfunctions/login` | Node.js 16 |
| `validateToken` | `cloudfunctions/validateToken` | Node.js 16 |

## 验证部署

### 1. 检查云函数列表

```bash
tcb fn list
```

应该能看到所有 6 个云函数。

### 2. 测试日记保存

在应用中：
1. 打开日记编辑页面
2. 填写标题和内容
3. 点击"保存"
4. 应该看到成功提示 ✨

### 3. 查看云函数日志

在腾讯云控制台：
- 云函数 → 选择 `diary` → 日志查询
- 可以看到每次调用的详细日志

## 常见错误

### ❌ "函数不存在"
**原因**：云函数未部署
**解决**：运行部署脚本

### ❌ "环境不存在"
**原因**：环境 ID 配置错误
**解决**：检查 `src/config/constant.ts` 中的 `TCB_CONFIG.env`

### ❌ "权限不足"
**原因**：云函数没有数据库权限
**解决**：在腾讯云控制台配置数据库权限

### ❌ "网络错误"
**原因**：设备不在同一网络
**解决**：确保手机/模拟器能访问开发服务器

## 部署后测试清单

- [ ] 创建日记 ✅
- [ ] 查看日记列表 ✅
- [ ] 更新日记 ✅
- [ ] 删除日记 ✅
- [ ] 用户登录 ✅
- [ ] 发送验证码 ✅
- [ ] 验证验证码 ✅

## 云函数说明

### diary - 日记管理
- `action: 'create'` - 创建日记
- `action: 'update'` - 更新日记
- `action: 'delete'` - 删除日记
- `action: 'get'` - 获取详情
- `action: 'list'` - 获取列表

### user - 用户管理
- `action: 'add'` - 创建用户
- `action: 'update'` - 更新用户
- `action: 'get'` - 获取用户
- `action: 'delete'` - 删除用户
- `action: 'list'` - 用户列表

### sendCode - 发送验证码
- 发送短信验证码

### verifyCode - 验证验证码
- 验证短信验证码

### login - 用户登录
- 用户登录逻辑

### validateToken - 验证 Token
- 验证用户 Token 有效性

## 数据库集合

云函数会自动创建以下集合：
- `diaries` - 日记数据
- `users` - 用户信息
- `sms_codes` - 验证码（如使用）

## 下一步

部署完成后，所有日记功能将正常工作：
1. ✅ 保存日记到云端
2. ✅ 查看日记列表
3. ✅ 编辑和删除日记
4. ✅ 用户登录和认证

---

**需要帮助？** 
- [腾讯云云开发文档](https://docs.cloudbase.net/)
- [CloudBase CLI 文档](https://docs.cloudbase.net/cli-v1/intro.html)
