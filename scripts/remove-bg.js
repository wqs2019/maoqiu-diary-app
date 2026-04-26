#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// 显示帮助信息
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🌟 毛球日记 - 图片背景去除及水印处理工具 🌟

这个工具可以自动识别图片的背景（基于图片的四个角落颜色），并将相似颜色的背景抠成透明。
支持单个文件或整个文件夹的批量处理，并自动去除右下角的水印。

【使用方法】:
node scripts/remove-bg.js <输入路径> [输出路径] [容差值%]

【参数说明】:
1. 输入路径 : 必填，文件或文件夹路径，比如 assets/logo.png 或 assets/mimi
2. 输出路径 : 选填，如果不填，将默认覆盖原图！
3. 容差值(%)   : 选填，默认 3。如果没抠干净可以调大(如 5)，如果把主体抠坏了可以调小(如 1)
  `);
  process.exit(0);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath; // 如果没有指定输出路径，则覆盖原图
const fuzz = args[2] || '3'; // 默认 3% 容差

if (!fs.existsSync(inputPath)) {
  console.error(`❌ 错误: 找不到文件或目录 ${inputPath}`);
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

  function processImage(inFile, outFile) {
    console.log(`⏳ 正在获取图片尺寸: ${inFile}...`);
    // 2. 动态获取图片宽高，以便准确找到右下角等边缘坐标
    const dimensions = execSync(`magick identify -format "%w %h" "${inFile}"`).toString().trim().split(' ');
    const width = parseInt(dimensions[0], 10);
    const height = parseInt(dimensions[1], 10);
    
    const maxX = width - 1;
    const maxY = height - 1;
    
    // 水印一般在右下角，扩大去除区域（宽20%，高10%）确保完全去除
    const wmWidth = Math.floor(width * 0.20);
    const wmHeight = Math.floor(height * 0.10);

    console.log(`📏 图片尺寸: ${width}x${height}，使用容差: ${fuzz}%`);
    console.log(`🧹 正在处理并移除纯色背景及右下角水印...`);

    // 3. 抠图命令：先用 region 将右下角区域设为透明，然后其余三个角泛滥填充
    // 兼容 ImageMagick 7 的透明化语法
    const cmd = `magick "${inFile}" ` +
                `-alpha set -region ${wmWidth}x${wmHeight}+${width - wmWidth}+${height - wmHeight} -channel A -evaluate set 0 +channel +region ` +
                `-fuzz ${fuzz}% -fill none ` +
                `-draw "color 0,0 floodfill" ` +          // 左上角
                `-draw "color ${maxX},0 floodfill" ` +    // 右上角
                `-draw "color 0,${maxY} floodfill" ` +    // 左下角
                `"${outFile}"`;

    execSync(cmd);
    console.log(`✅ 处理成功！已保存至: ${outFile}\n`);
  }

  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    // 批量处理目录
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    const files = fs.readdirSync(inputPath);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
        const inFile = path.join(inputPath, file);
        const outFile = path.join(outputPath, file);
        processImage(inFile, outFile);
      }
    }
  } else {
    // 处理单个文件
    processImage(inputPath, outputPath);
  }

} catch (error) {
  console.error('❌ 处理图片时发生错误:');
  console.error(error.message);
  process.exit(1);
}
