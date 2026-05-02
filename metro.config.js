const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 用于支持 TensorFlow.js 需要的特殊文件格式（如 .bin 等量化模型文件）
config.resolver.assetExts.push('bin');

module.exports = config;