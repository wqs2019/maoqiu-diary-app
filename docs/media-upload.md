# 媒体上传功能使用指南

## 功能概述

EditDiaryScreen 现已支持上传图片和视频附件，最多可添加 9 个媒体文件。

## 支持的媒体类型

1. **图片 (image)**: 支持所有常见图片格式（JPEG, PNG, HEIC 等）
2. **视频 (video)**: 支持常见视频格式（MP4, MOV 等）

## 主要特性

### 1. 媒体选择器组件

位置：`src/components/handDrawn/MediaSelector.tsx`

**功能**:
- ✅ 支持从相册选择图片和视频
- ✅ 混合选择：可同时选择图片和视频
- ✅ 数量限制：最多 9 个媒体文件
- ✅ 实时预览：显示缩略图和视频时长
- ✅ 删除功能：可移除已选择的媒体
- ✅ 类型标识：清晰标识每个媒体的类型

**使用示例**:
```typescript
import { MediaSelector } from '@/components/handDrawn/MediaSelector';
import { MediaResource } from '@/types';

const [media, setMedia] = React.useState<MediaResource[]>([]);

<MediaSelector
  media={media}
  onMediaChange={setMedia}
  maxCount={9}
/>
```

### 2. 数据结构

**MediaResource 接口**:
```typescript
export type MediaType = 'image' | 'livePhoto' | 'video';

export interface MediaResource {
  type: MediaType;        // 媒体类型
  uri: string;            // 本地 URI 或云端 URL
  fileID?: string;        // 云存储文件 ID（上传后）
  thumbnail?: string;     // 缩略图 URI（视频用）
  duration?: number;      // 时长（秒，视频用）
  size?: number;          // 文件大小（字节）
  mimeType?: string;      // MIME 类型
}
```

**Diary 接口更新**:
```typescript
export interface Diary {
  // ... 其他字段
  images?: string[];         // 兼容旧字段（图片 URL 数组）
  media?: MediaResource[];   // 新媒体资源（最多 9 个）
}
```

## 使用流程

### 1. 选择媒体

点击"添加媒体"按钮，弹出选项：
- 📷 **照片**: 打开相册选择图片（支持多选）
- 🎬 **视频**: 打开相册选择视频（单选）

### 2. 自动上传到云端（组件内部闭环）

**重要**: 选择媒体后，组件会自动将文件上传到云端，无需手动操作！

上传流程：
1. **选择媒体**: 从相册选择图片或视频
2. **立即显示**: 媒体会立即显示在预览列表中
3. **自动上传**: 组件自动开始上传到云端
4. **重试机制**: 如果上传失败，会自动重试（最多 3 次，指数退避）
5. **替换 URL**: 上传成功后，本地 URI 会被云端 URL 替换
6. **失败处理**: 如果所有重试都失败，会从列表中移除该媒体

**重试策略**:
- 第 1 次失败后：等待 1 秒
- 第 2 次失败后：等待 2 秒
- 第 3 次失败后：等待 3 秒，然后报错

### 3. 预览和管理

上传成功后，媒体会以网格形式展示：
- 图片：直接显示缩略图
- 视频：显示首帧 + 播放图标 + 时长
- 每个媒体右上角有删除按钮
- 左下角显示类型标识

### 4. 保存日记

点击保存时，媒体数据已经是云端 URL，直接提交：
```typescript
createDiaryMutation.mutate(
  {
    title: title.trim(),
    content: content.trim(),
    // ... 其他字段
    media: media.length > 0 ? media : undefined, // 已包含云端 URL
  },
  {
    onSuccess: () => {
      // 保存成功
    },
  }
);
```

## 上传机制详解

### 组件内部闭环上传

MediaSelector 组件内部实现了完整的上传逻辑：

```typescript
// 1. 选择媒体后立即添加到列表（显示本地 URI）
const allMedia = [...media, ...localMedia];
onMediaChange(allMedia);

// 2. 自动上传到云端
const uploadedMedia = await uploadAllMedia(localMedia);

// 3. 替换为云端 URL
const finalMedia = allMedia.map((m, idx) => {
  if (idx >= media.length) {
    const uploadedIdx = idx - media.length;
    return uploadedMedia[uploadedIdx] || m;
  }
  return m;
});
onMediaChange(finalMedia);
```

### 上传函数

**uploadMediaItem**: 上传单个媒体（带重试）
- 生成唯一云存储路径
- 转换为 base64
- 调用云函数上传
- 失败时自动重试（最多 3 次）
- 使用指数退避策略（1s, 2s, 3s）

**uploadAllMedia**: 批量上传
- 顺序上传每个媒体
- 任何一个失败都会抛出异常
- 返回所有上传成功的媒体

## 权限配置

### iOS (Info.plist)

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册以选择照片和视频</string>
<key>NSCameraUsageDescription</key>
<string>需要使用相机拍摄照片</string>
<key>NSMicrophoneUsageDescription</key>
<string>需要访问麦克风以录制视频声音</string>
```

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

## 注意事项

1. **数量限制**: 最多 9 个媒体文件，达到上限后添加按钮会禁用
2. **文件大小**: 建议限制上传文件大小（可在云函数中实现）
3. **视频时长**: 长视频会显示时长标识
4. **性能优化**: 使用缩略图避免大图加载缓慢
5. **错误处理**: 选择失败或上传失败时显示友好提示

## 技术依赖

- `expo-image-picker`: 图片和视频选择
- `expo-av`: 视频播放（可选，用于详情页播放）
- `@expo/vector-icons`: 图标显示

## 相关文件

- 组件：`src/components/handDrawn/MediaSelector.tsx`
- 屏幕：`src/screens/edit/EditDiaryScreen.tsx`
- 类型：`src/types/index.ts`
- 文档：`docs/media-upload.md`
- 云函数：`cloudfunctions/image/index.js`
- 服务：`src/services/imageService.ts`
