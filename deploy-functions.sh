#!/bin/bash

echo "🚀 开始部署云函数到腾讯云..."
echo "环境 ID: maoqiu-diary-app-2fpzvwp2e01dbaf"
echo ""

# 检查是否已安装 CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ CloudBase CLI 未安装，请先安装："
    echo "   npm install -g @cloudbase/cli"
    exit 1
fi

# 检查是否已登录
if ! tcb status &> /dev/null; then
    echo "⚠️  未登录腾讯云，请先登录："
    echo "   tcb login"
    exit 1
fi

cd cloudfunctions

# 部署所有云函数
for func in diary user sendCode verifyCode login validateToken; do
    echo "📦 部署 $func ..."
    tcb fn deploy $func --force
    if [ $? -eq 0 ]; then
        echo "✅ $func 部署成功"
    else
        echo "❌ $func 部署失败"
    fi
    echo ""
done

echo "🎉 部署完成！"
echo ""
echo "💡 提示：可以在腾讯云控制台查看云函数状态："
echo "   https://console.cloud.tencent.com/tcb"
