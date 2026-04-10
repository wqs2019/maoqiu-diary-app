#!/usr/bin/env sh

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    echo "正在从 .env.example 创建..."
    cp .env.example .env
    echo ""
    echo "❗ 请编辑 .env 文件，填入你的配置信息"
    echo "   至少需要配置 TCB_ENV_ID"
    echo ""
    read -p "按回车键继续..." 
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  依赖未安装，正在安装..."
    npm install
fi

# 启动 Expo
echo "🚀 启动 Expo 开发服务器..."
npm start
