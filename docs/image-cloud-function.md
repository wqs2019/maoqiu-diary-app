# 图片上传云函数使用指南

## 云函数功能

云函数 `image` 提供了以下功能：

### 1. 上传图片 (`upload`)
- **功能**: 上传 base64 格式的图片到云存储，并返回临时访问 URL
- **输入参数**:
  ```javascript
  {
    action: 'upload',
    data: {
      fileContent: 'data:image/jpeg;base64,/9j/...', // base64 字符串（支持 data URI 格式）
      cloudPath: 'diary-images/123.jpg'              // 云存储路径
    }
  }
  ```
- **返回结果**:
  ```javascript
  {
    success: true,
    data: {
      fileID: 'cloud://...',      // 云存储文件 ID
      cloudPath: 'diary-images/...', // 云存储路径
      tempURL: 'https://...',     // 临时访问 URL（7 天有效）
      mimeType: 'image/jpeg',     // MIME 类型
      size: 12345                 // 文件大小（字节）
    }
  }
  ```

### 2. 获取临时 URL (`getURL`)
- **功能**: 批量获取云存储文件的临时访问 URL
- **输入参数**:
  ```javascript
  {
    action: 'getURL',
    data: {
      fileList: ['cloud://...', 'cloud://...'],  // fileID 列表
      maxAge: 60 * 60 * 24 * 7                   // 有效期（秒），默认 7 天
    }
  }
  ```
- **返回结果**:
  ```javascript
  {
    success: true,
    data: {
      fileList: [
        {
          fileID: 'cloud://...',
          tempURL: 'https://...',
          status: 0,      // 0 表示成功
          message: ''     // 错误信息（如果有）
        }
      ]
    }
  }
  ```

### 3. 生成云存储路径 (`generatePath`)
- **功能**: 生成唯一的云存储路径（时间戳 + 随机字符串）
- **输入参数**:
  ```javascript
  {
    action: 'generatePath',
    data: {
      extension: 'jpg'  // 文件扩展名，默认 'jpg'
    }
  }
  ```
- **返回结果**:
  ```javascript
  {
    success: true,
    data: {
      cloudPath: 'diary-images/1234567890-abc123.jpg'
    }
  }
  ```

### 4. 删除文件 (`delete`)
- **功能**: 批量删除云存储文件
- **输入参数**:
  ```javascript
  {
    action: 'delete',
    data: {
      fileList: ['cloud://...', 'cloud://...']  // fileID 列表
    }
  }
  ```
- **返回结果**:
  ```javascript
  {
    success: true,
    data: {
      fileList: [
        {
          fileID: 'cloud://...',
          status: 0,      // 0 表示成功
          message: ''     // 错误信息（如果有）
        }
      ]
    }
  }
  ```

## 前端使用示例

### 示例 1: 上传图片

```typescript
import { uploadImage, generateCloudPath } from '@/services/imageService';
import * as ImagePicker from 'expo-image-picker';

// 1. 选择图片
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0];
  }
  return null;
};

// 2. 读取图片为 base64
const imageToBase64 = async (imageUri: string): Promise<string> => {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 3. 上传图片
const uploadImageExample = async () => {
  try {
    // 选择图片
    const imageAsset = await pickImage();
    if (!imageAsset) return;

    // 生成唯一的云存储路径
    const extension = imageAsset.uri.split('.').pop() || 'jpg';
    const pathResult = await generateCloudPath(extension);
    const cloudPath = pathResult.data.cloudPath;

    // 转换为 base64
    const base64 = await imageToBase64(imageAsset.uri);

    // 上传到云端
    const uploadResult = await uploadImage(base64, cloudPath);
    
    if (uploadResult.success) {
      console.log('上传成功:', uploadResult.data);
      console.log('临时访问 URL:', uploadResult.data.tempURL);
      console.log('文件 ID:', uploadResult.data.fileID);
    } else {
      console.error('上传失败:', uploadResult.message);
    }
  } catch (error) {
    console.error('上传错误:', error);
  }
};
```

### 示例 2: 批量获取图片 URL

```typescript
import { getTempFileURLs } from '@/services/imageService';

// 假设你有一些 fileID 需要获取访问 URL
const getFileURLsExample = async () => {
  try {
    const fileIDs = [
      'cloud://maoqiu-diary-app-2fpzvwp2e01dbaf.6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-12345/diary-images/1.jpg',
      'cloud://maoqiu-diary-app-2fpzvwp2e01dbaf.6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-12345/diary-images/2.jpg',
    ];

    const result = await getTempFileURLs(fileIDs);
    
    if (result.success) {
      result.data.fileList.forEach(file => {
        if (file.status === 0) {
          console.log(`File ${file.fileID}: ${file.tempURL}`);
        } else {
          console.error(`File ${file.fileID} failed: ${file.message}`);
        }
      });
    }
  } catch (error) {
    console.error('获取 URL 失败:', error);
  }
};
```

### 示例 3: 删除图片

```typescript
import { deleteFiles } from '@/services/imageService';

// 删除不再需要的图片
const deleteImagesExample = async (fileIDs: string[]) => {
  try {
    const result = await deleteFiles(fileIDs);
    
    if (result.success) {
      console.log('删除成功');
      result.data.fileList.forEach(file => {
        if (file.status === 0) {
          console.log(`File ${file.fileID} deleted successfully`);
        } else {
          console.error(`File ${file.fileID} delete failed: ${file.message}`);
        }
      });
    }
  } catch (error) {
    console.error('删除失败:', error);
  }
};
```

## 注意事项

1. **临时 URL 有效期**: 默认为 7 天（604800 秒），可以根据需要调整
2. **文件大小限制**: 建议限制上传图片大小（如 5MB），避免上传失败
3. **图片格式**: 支持所有常见图片格式（jpg, png, gif, webp 等）
4. **安全规则**: 需要在云开发控制台配置存储安全规则，允许用户访问
5. **错误处理**: 始终检查 `success` 字段和 `status` 字段来判断操作是否成功

## 云存储安全规则示例

在云开发控制台配置存储安全规则：

```
{
  "rules": {
    "diary-images/": {
      "read": true,  // 允许所有用户读取
      "write": "auth.openid == request.auth.openid"  // 只允许创建者写入
    }
  }
}
```
