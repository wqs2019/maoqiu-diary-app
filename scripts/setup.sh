#!/usr/bin/env sh
echo "🚀 开始配置 React Native + TCB 脚手架..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请安装 Node.js v20 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 1 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ 错误：Node.js 版本过低"
    echo "当前版本：$(node -v)，需要 v20 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本检查通过：$(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 配置 Git Hooks
echo "🔧 配置 Git Hooks..."
if command -v npx &> /dev/null; then
    npx husky install
else
    echo "⚠️  跳过 Husky 配置（需要 npx）"
fi

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量配置..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据实际需求修改配置"
fi

# 验证安装
echo "🔍 验证安装..."
npm run lint -- --max-warnings=0 || echo "⚠️  ESLint 检查有警告（可忽略）"
npm run typecheck || echo "⚠️  TypeScript 类型检查有警告（可忽略）"

echo ""
echo "✨ 配置完成！"
echo ""
echo "下一步："
echo "1. 编辑 .env 文件，填入你的 TCB 环境 ID 和其他配置"
echo "2. 配置 TCB 云函数（参考 README.md）"
echo "3. 运行 npm start 启动开发服务器"
echo ""
echo "📚 更多信息请查看 README.md"
