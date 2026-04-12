# 媒体上传失败重试功能

## 功能概述

当媒体上传失败时，不再移除失败的媒体，而是在失败的媒体上显示重试按钮，用户可以手动重试上传。

## 核心特性

### 1. **失败媒体保留**
- ❌ 旧逻辑：上传失败后从列表中移除
- ✅ 新逻辑：保留失败的媒体，标记错误状态

### 2. **重试按钮**
- 位置：媒体缩略图中央
- 样式：红色圆形按钮，带刷新图标
- 交互：点击后重新尝试上传

### 3. **视觉反馈**
- 失败的媒体会有明显的视觉标识：
  - 红色边框（2px）
  - 降低透明度（opacity: 0.7）
  - 缩略图变暗（opacity: 0.5）
  - 底部显示"上传失败"提示

### 4. **错误状态管理**
```typescript
interface MediaResource {
  type: MediaType;
  uri: string;
  fileID?: string;
  // ... 其他字段
  uploadError?: string;  // 上传错误信息
}
```

## 实现细节

### 1. **类型定义更新** - `src/types/index.ts`
```typescript
export interface MediaResource {
  type: MediaType;
  uri: string;
  fileID?: string;
  // ...
  uploadError?: string;  // 新增：上传错误信息
}
```

### 2. **重试上传函数** - `MediaSelector.tsx`
```typescript
const retryUpload = async (index: number) => {
  const item = media[index];
  if (!item) return;

  try {
    // 生成云存储路径
    const extension = item.mimeType?.split('/')[1] || 'jpg';
    const pathResult = await generateCloudPath(extension);
    
    // 转换为 base64
    const base64 = await uriToBase64(item.uri);
    
    // 上传到云端
    const uploadResult = await uploadImage(base64, pathResult.data.cloudPath);
    
    if (uploadResult.success) {
      // 更新成功的媒体
      const updatedMedia = [...media];
      updatedMedia[index] = {
        ...item,
        fileID: uploadResult.data.fileID,
        uri: uploadResult.data.tempURL,
        uploadError: undefined, // 清除错误状态
      };
      onMediaChange(updatedMedia);
    }
  } catch (error: any) {
    // 更新错误信息
    const updatedMedia = [...media];
    updatedMedia[index] = {
      ...item,
      uploadError: error.message || '上传失败',
    };
    onMediaChange(updatedMedia);
  }
};
```

### 3. **上传逻辑优化**
```typescript
// 上传单个媒体（带重试）
const uploadMediaItem = async (item: MediaResource, retryCount = 3): Promise<MediaResource> => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // ... 上传逻辑
      if (uploadResult.success) {
        return {
          ...item,
          fileID: uploadResult.data.fileID,
          uri: uploadResult.data.tempURL,
          uploadError: undefined,
        };
      }
    } catch (error: any) {
      if (attempt === retryCount) {
        // 返回带错误信息的媒体
        return {
          ...item,
          uploadError: error.message || '上传失败',
        };
      }
      // 等待重试
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { ...item, uploadError: '上传失败' };
};
```

### 4. **UI 渲染** - 失败媒体展示
```typescript
const renderMediaPreview = (item: MediaResource, index: number) => {
  const isFailed = !!item.uploadError;

  return (
    <View style={[styles.mediaItem, isFailed && styles.mediaItemFailed]}>
      {/* 缩略图 */}
      <Image 
        source={{ uri: item.uri }} 
        style={[styles.mediaThumbnail, isFailed && styles.mediaThumbnailFailed]} 
      />

      {/* 删除按钮 */}
      <TouchableOpacity onPress={() => removeMedia(index)}>
        <Ionicons name="close-circle" size={24} color="#FF4444" />
      </TouchableOpacity>

      {/* 重试按钮（仅失败时显示） */}
      {isFailed && (
        <TouchableOpacity style={styles.retryButton} onPress={() => retryUpload(index)}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* 类型标识 */}
      <View style={styles.mediaTypeBadge}>
        <Text>{item.type === 'image' ? '📷' : '🎬'}</Text>
      </View>

      {/* 错误提示（仅失败时显示） */}
      {isFailed && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>上传失败</Text>
        </View>
      )}
    </View>
  );
};
```

## 样式设计

### 失败媒体样式
```typescript
mediaItemFailed: {
  opacity: 0.7,
  borderWidth: 2,
  borderColor: '#FF4444',  // 红色边框
},
mediaThumbnailFailed: {
  opacity: 0.5,  // 缩略图变暗
},
```

### 重试按钮样式
```typescript
retryButton: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginLeft: -20,
  marginTop: -20,
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#FF6B6B',  // 红色背景
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
```

### 错误提示样式
```typescript
errorOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(255,68,68,0.9)',  // 红色背景
  paddingHorizontal: 8,
  paddingVertical: 4,
  alignItems: 'center',
},
errorText: {
  fontSize: 11,
  color: '#FFF',
  fontWeight: '600',
},
```

## 用户体验流程

### 正常上传流程
1. 用户选择媒体
2. 自动上传到云端
3. 上传成功：显示正常预览

### 上传失败流程
1. 用户选择媒体
2. 自动上传到云端
3. **上传失败**：
   - 保留在列表中
   - 显示红色边框
   - 缩略图变暗
   - 中央显示重试按钮
   - 底部显示"上传失败"提示

### 重试流程
1. 用户点击重试按钮
2. 重新尝试上传
3. **重试成功**：
   - 清除错误状态
   - 恢复正常显示
   - 显示云端 URL
4. **重试失败**：
   - 保留错误状态
   - 可以继续重试

## 优势对比

### 旧逻辑（已移除）
- ❌ 上传失败后立即移除
- ❌ 用户无法重试
- ❌ 需要重新选择媒体
- ❌ 体验较差

### 新逻辑
- ✅ 上传失败后保留
- ✅ 提供重试按钮
- ✅ 用户可以手动重试
- ✅ 体验友好
- ✅ 不会丢失用户选择

## 技术要点

### 1. **错误状态管理**
使用 `uploadError` 字段标记失败状态：
- `undefined`: 无错误（正常或上传中）
- `string`: 错误信息（上传失败）

### 2. **条件渲染**
根据 `uploadError` 字段动态显示：
- 重试按钮
- 错误提示
- 失败样式

### 3. **重试机制**
- 单次重试：点击按钮重试一次
- 自动重试：上传时自动重试 3 次
- 双重保障：自动重试失败后，用户可手动重试

### 4. **状态更新**
重试成功后清除错误状态：
```typescript
updatedMedia[index] = {
  ...item,
  fileID: uploadResult.data.fileID,
  uri: uploadResult.data.tempURL,
  uploadError: undefined,  // 清除错误状态
};
```

## 相关文件

- 类型定义：`src/types/index.ts`
- 组件实现：`src/components/handDrawn/MediaSelector.tsx`
- 服务层：`src/services/imageService.ts`
- 云函数：`cloudfunctions/image/index.js`

## 测试建议

### 测试场景
1. **网络良好**: 验证正常上传
2. **网络不稳定**: 验证自动重试
3. **网络断开**: 验证失败显示和手动重试
4. **重试成功**: 验证状态更新
5. **重试失败**: 验证错误状态保留

### 交互测试
1. 点击重试按钮，验证重新上传
2. 重试成功后，验证重试按钮消失
3. 删除失败媒体，验证正常移除
4. 混合成功和失败的媒体，验证正确显示

## 后续优化建议

1. **批量重试**: 添加"全部重试"按钮
2. **重试计数**: 显示已重试次数
3. **智能重试**: 根据错误类型建议重试策略
4. **上传队列**: 支持暂停和恢复上传
5. **错误分类**: 区分网络错误、服务器错误等
