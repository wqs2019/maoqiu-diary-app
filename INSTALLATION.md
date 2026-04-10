# 🚀 安装指南

## 系统要求

### 必需
- **Node.js**: v20 或更高版本
- **npm**: v8 或更高版本
- **Git**: 最新版本

### 推荐
- **Watchman**: 文件监听（macOS）
- **Yarn**: 可选的包管理器

## 快速安装

### 1. 检查环境

```bash
# 检查 Node.js 版本
node -v  # 应该 >= v20

# 检查 npm 版本
npm -v

# 检查 Git
git --version
```

如果 Node.js 版本过低，请升级：
```bash
# 使用 nvm (Node Version Manager)
nvm install 20
nvm use 20
```

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd rn-tcb-life-record-ts-zustand-template
```

### 3. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 4. 运行安装脚本

```bash
# 给脚本执行权限
chmod +x scripts/setup.sh

# 运行安装脚本
./scripts/setup.sh
```

安装脚本会自动：
- ✅ 检查 Node.js 版本
- ✅ 安装所有依赖
- ✅ 配置 Git Hooks
- ✅ 创建 .env 文件
- ✅ 验证安装

### 5. 配置环境变量

编辑 `.env` 文件：

```bash
# TCB 配置
TCB_ENV_ID=your-env-id-here        # 替换为你的 TCB 环境 ID
TCB_REGION=ap-guangzhou            # 腾讯云区域

# API 配置
API_BASE_URL=https://api.example.com

# Sentry（可选）
SENTRY_DSN=
```

### 6. 启动开发服务器

```bash
# 方法 1: 使用脚本
./scripts/start.sh

# 方法 2: 直接启动
npm start
```

## 手动安装步骤

如果自动安装失败，可以手动执行：

### 步骤 1: 安装依赖

```bash
npm install
```

### 步骤 2: 配置 Git Hooks

```bash
npx husky install
```

### 步骤 3: 创建环境变量

```bash
cp .env.example .env
# 然后编辑 .env 文件
```

### 步骤 4: 验证安装

```bash
# 代码检查
npm run lint

# 类型检查
npm run typecheck

# 测试
npm test
```

## 平台特定配置

### macOS

```bash
# 安装 Watchman（推荐）
brew install watchman

# 安装 CocoaPods（iOS 开发）
sudo gem install cocoapods
```

### Windows

```bash
# 安装 Windows 版本的 watchman
choco install watchman

# 或使用 WSL2
```

### Linux

```bash
# 安装依赖
sudo apt-get update
sudo apt-get install -y watchman
```

## 常见问题

### ❌ 问题 1: Node.js 版本过低

**错误信息**:
```
Error: Node.js version must be >= 20
```

**解决方案**:
```bash
# 使用 nvm 升级
nvm install 20
nvm use 20

# 或使用官方安装包
# https://nodejs.org/
```

### ❌ 问题 2: 依赖安装失败

**错误信息**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### ❌ 问题 3: Git Hooks 配置失败

**错误信息**:
```
husky - install command is deprecated
```

**解决方案**:
```bash
# 手动初始化
npx husky init
```

### ❌ 问题 4: ESLint 报错

**错误信息**:
```
ESLint 检查有大量警告
```

**解决方案**:
```bash
# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### ❌ 问题 5: TypeScript 类型错误

**错误信息**:
```
TypeScript 类型检查失败
```

**解决方案**:
```bash
# 这些是类型声明文件的警告，可以忽略
# 或者安装缺失的类型定义
npm install --save-dev @types/<package-name>
```

## 验证安装

运行以下命令验证安装是否成功：

```bash
# 1. 检查依赖
npm ls --depth=0

# 2. 运行 Lint
npm run lint

# 3. 运行类型检查
npm run typecheck

# 4. 运行测试
npm test

# 5. 启动开发服务器
npm start
```

如果所有命令都成功执行，说明安装完成！✅

## 下一步

安装完成后，请查看：

1. **[QUICK_START.md](./QUICK_START.md)** - 快速开始开发
2. **[README.md](./README.md)** - 项目文档
3. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - 部署清单

## 获取帮助

如果遇到问题：

- 📖 查看文档
- 🔍 搜索 Issue
- 💬 联系维护者

---

**提示**: 建议使用自动安装脚本，可以节省时间并避免错误。
