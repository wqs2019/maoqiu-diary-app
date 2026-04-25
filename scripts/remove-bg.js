#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const args = process.argv.slice(2);

// 显示帮助信息
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🌟 毛球日记 - 图片背景去除工具 🌟

这个工具可以自动识别图片的背景（基于图片的四个角落颜色），并将相似颜色的背景抠成透明。

【使用方法】:
node scripts/remove-bg.js <输入图片路径> [输出图片路径] [容差值%]

【参数说明】:
1. 输入图片路径 : 必填，比如 assets/logo.png
2. 输出图片路径 : 选填，如果不填，将默认覆盖原图！
3. 容差值(%)   : 选填，默认 3。如果没抠干净可以调大(如 5)，如果把主体抠坏了可以调小(如 1)

【使用示例】:
1. 直接覆盖原图，使用默认 3% 容差：
   node scripts/remove-bg.js assets/logo.png

2. 另存为新文件，并使用 5% 容差：
   node scripts/remove-bg.js assets/logo.png assets/logo_transparent.png 5
  `);
  process.exit(0);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath; // 如果没有指定输出路径，则覆盖原图
const fuzz = args[2] || '3'; // 默认 3% 容差

if (!fs.existsSync(inputPath)) {
  console.error(`❌ 错误: 找不到文件 ${inputPath}`);
  process.exit(1);
}

try {
  // 1. 检查是否安装了 ImageMagick
  try {
    execSync('magick -version', { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ 错误: 请先安装 ImageMagick (https://imagemagick.org/)');
    console.error('👉 Mac 用户可以使用: brew install imagemagick');
    process.exit(1);
  }

  console.log(`⏳ 正在获取图片尺寸: ${inputPath}...`);
  // 2. 动态获取图片宽高，以便准确找到右下角等边缘坐标
  const dimensions = execSync(`magick identify -format "%w %h" "${inputPath}"`).toString().trim().split(' ');
  const width = parseInt(dimensions[0], 10);
  const height = parseInt(dimensions[1], 10);
  
  const maxX = width - 1;
  const maxY = height - 1;

  console.log(`📏 图片尺寸: ${width}x${height}，使用容差: ${fuzz}%`);
  console.log(`🧹 正在处理并移除纯色背景...`);

  // 3. 从四个角落进行泛滥填充（Floodfill）将背景变为透明
  // 这里通过 -fuzz 参数来控制对噪点的容忍度
  const cmd = `magick "${inputPath}" -fuzz ${fuzz}% -fill none ` +
              `-draw "color 0,0 floodfill" ` +          // 左上角
              `-draw "color ${maxX},0 floodfill" ` +    // 右上角
              `-draw "color 0,${maxY} floodfill" ` +    // 左下角
              `-draw "color ${maxX},${maxY} floodfill" ` + // 右下角
              `"${outputPath}"`;

  execSync(cmd);
  console.log(`✅ 处理成功！已保存至: ${outputPath}\n`);

} catch (error) {
  console.error('❌ 处理图片时发生错误:');
  console.error(error.message);
  process.exit(1);
}
