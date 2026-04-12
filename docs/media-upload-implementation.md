# 媒体上传功能实现总结

## 核心特性

✅ **自动上传**: 选择媒体后自动上传到云端，无需手动操作
✅ **重试机制**: 失败时自动重试（最多 3 次，指数退避）
✅ **组件闭环**: 所有上传逻辑封装在 MediaSelector 组件内部
✅ **零本地存储**: 绝不允许本地图片存在，全部上传到云端
✅ **失败处理**: 上传失败时从列表中移除，保证数据一致性

## 文件变更

### 1. 类型定义 - `src/types/index.ts`
```typescript
// 新增媒体资源类型
export type MediaType = 'image' | 'livePhoto' | 'video';

export interface MediaResource {
  type: MediaType;
  uri: string;           // 本地 URI 或云端 URL
  fileID?: string;       // 云存储文件 ID
  thumbnail?: string;    // 缩略图 URI
  duration?: number;     // 时长（秒）
  size?: number;         // 文件大小（字节）
  mimeType?: string;     // MIME 类型
}

// 更新 Diary 接口
export interface Diary {
  // ... 其他字段
  media?: MediaResource[];   // 新媒体资源（最多 9 个）
}
```

### 2. 媒体选择器组件 - `src/components/handDrawn/MediaSelector.tsx`

**新增功能**:
- `uriToBase64()`: 将本地 URI 转换为 base64
- `uploadMediaItem()`: 上传单个媒体（带重试）
- `uploadAllMedia()`: 批量上传媒体

**上传流程**:
```typescript
// 1. 选择媒体
const result = await ImagePicker.launchImageLibraryAsync(...);

// 2. 立即显示（本地 URI）
const allMedia = [...media, ...localMedia];
onMediaChange(allMedia);

// 3. 自动上传到云端
const uploadedMedia = await uploadAllMedia(localMedia);

// 4. 替换为云端 URL
const finalMedia = allMedia.map((m, idx) => {
  if (idx >= media.length) {
    const uploadedIdx = idx - media.length;
    return uploadedMedia[uploadedIdx] || m;
  }
  return m;
});
onMediaChange(finalMedia);
```

**重试策略**:
```typescript
for (let attempt = 1; attempt <= retryCount; attempt++) {
  try {
    // 上传逻辑
    const uploadResult = await uploadImage(base64, cloudPath);
    if (uploadResult.success) {
      return { ...item, fileID, uri: tempURL };
    }
  } catch (error) {
    if (attempt === retryCount) throw error;
    // 指数退避：1s, 2s, 3s
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
```

### 3. 编辑页面 - `src/screens/edit/EditDiaryScreen.tsx`

**简化处理**:
- 移除了所有上传逻辑
- 媒体数据由 MediaSelector 组件管理
- 保存时直接使用已上传的云端 URL

```typescript
const handleSave = () => {
  createDiaryMutation.mutate(
    {
      title: title.trim(),
      content: content.trim(),
      // ... 其他字段
      media: media.length > 0 ? media : undefined, // 已包含云端 URL
    },
    {
      onSuccess: () => {
        Alert.alert('✨ 太棒了！', '日记已保存到云端');
      },
    }
  );
};
```

### 4. 云函数 - `cloudfunctions/image/index.js`

**支持的操作**:
- `upload`: 上传图片到云存储
- `getURL`: 获取临时访问 URL
- `generatePath`: 生成唯一云存储路径
- `delete`: 删除云存储文件

### 5. 服务层 - `src/services/imageService.ts`

**API 函数**:
- `uploadImage()`: 上传图片
- `getTempFileURLs()`: 批量获取临时 URL
- `generateCloudPath()`: 生成云存储路径
- `deleteFiles()`: 删除文件

## 用户体验流程

### 图片上传流程
1. 用户点击"添加媒体" → "📷 照片"
2. 从相册选择 1-9 张图片
3. 图片立即显示在预览列表中（本地 URI）
4. 弹出提示："正在上传 X 张图片到云端..."
5. 后台自动上传，每张图最多重试 3 次
6. 上传成功：提示"图片已成功上传到云端"
7. 上传失败：提示失败原因，并从列表中移除

### 视频上传流程
1. 用户点击"添加媒体" → "🎬 视频"
2. 从相册选择 1 个视频
3. 视频立即显示在预览列表中（本地 URI）
4. 弹出提示："正在上传视频到云端..."
5. 后台自动上传，最多重试 3 次
6. 上传成功：提示"视频已成功上传到云端"
7. 上传失败：提示失败原因，并从列表中移除

## 技术亮点

### 1. 组件内部闭环
所有上传逻辑封装在 MediaSelector 组件内，父组件无需关心上传细节：
```typescript
<MediaSelector
  media={media}
  onMediaChange={setMedia}  // 直接获取已上传的云端 URL
  maxCount={9}
/>
```

### 2. 重试机制
- **最大重试次数**: 3 次
- **退避策略**: 指数退避（1s, 2s, 3s）
- **错误处理**: 失败后从列表中移除，保证数据一致性

### 3. 批量上传
- 支持同时上传多张图片
- 顺序上传，确保资源不冲突
- 任何一个失败都会抛出异常

### 4. 类型安全
完整的 TypeScript 类型定义，确保：
- 媒体类型正确（image/video）
- 数据字段完整（fileID, uri, mimeType 等）
- 编译时检查，减少运行时错误

## 依赖安装

```bash
npm install expo-image-picker expo-av --legacy-peer-deps
```

## 相关文件

- **组件**: `src/components/handDrawn/MediaSelector.tsx`
- **屏幕**: `src/screens/edit/EditDiaryScreen.tsx`
- **类型**: `src/types/index.ts`
- **服务**: `src/services/imageService.ts`
- **云函数**: `cloudfunctions/image/index.js`
- **文档**: `docs/media-upload.md`

## 测试建议

1. **正常流程测试**:
   - 选择 1 张图片，验证上传成功
   - 选择多张图片（如 5 张），验证批量上传
   - 选择 1 个视频，验证视频上传

2. **异常场景测试**:
   - 断网情况下选择图片，验证重试和失败处理
   - 上传大文件，验证超时处理
   - 上传过程中退出页面，验证资源清理

3. **边界条件测试**:
   - 达到 9 个媒体上限，验证添加按钮禁用
   - 混合选择图片和视频，验证类型标识
   - 删除已上传的媒体，验证状态更新

## 后续优化建议

1. **进度显示**: 显示每个文件的上传进度百分比
2. **并发上传**: 支持同时上传多个文件（如 3 个并发）
3. **压缩优化**: 上传前压缩图片，减少流量消耗
4. **断点续传**: 大文件支持断点续传
5. **缓存策略**: 已上传的文件缓存 fileID，避免重复上传
