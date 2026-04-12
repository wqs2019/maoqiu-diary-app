# 云存储安全规则配置指南

## 问题描述

上传图片时报错：
```
AccessDenied: Access Denied
Resource: /diary-images/xxx.png
```

**原因**: 云存储的安全规则不允许匿名用户上传文件。

## 解决方案

### 方法 1: 配置存储安全规则（推荐）

#### 步骤 1: 登录云开发控制台

1. 访问 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的环境：`maoqiu-diary-app-2fpzvwp2e01dbaf`
3. 进入**云存储** → **安全规则**

#### 步骤 2: 添加存储安全规则

在安全规则页面，添加以下规则：

```json
{
  "rules": {
    "diary-images/": {
      "read": true,
      "write": "auth.openid != null"
    }
  }
}
```

**规则说明**:
- `read: true`: 允许所有人读取（查看图片）
- `write: "auth.openid != null"`: 允许已登录用户（包括匿名用户）上传

#### 步骤 3: 更细粒度的规则（可选）

如果需要更严格的控制，可以使用：

```json
{
  "rules": {
    "diary-images/": {
      "read": true,
      "write": "auth.openid != null && request.auth.openid == auth.openid"
    }
  }
}
```

**规则说明**:
- 只允许上传自己创建的文件
- 需要配合数据库记录使用

#### 步骤 4: 保存并生效

1. 点击**保存**按钮
2. 规则立即生效
3. 无需重启应用

### 方法 2: 使用云函数上传（备选）

如果不想修改安全规则，可以通过云函数间接上传：

#### 云函数代码

```javascript
// cloudfunctions/upload/index.js
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { fileContent, cloudPath } = event;
  
  try {
    // 云函数有管理员权限，可以上传到任何位置
    const result = await app.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(fileContent, 'base64'),
    });
    
    // 获取临时 URL
    const urlResult = await app.getTempFileURL({
      fileList: [result.fileID],
    });
    
    return {
      success: true,
      data: {
        fileID: result.fileID,
        cloudPath: cloudPath,
        tempURL: urlResult.fileList[0].tempFileURL,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
```

#### 前端调用

```typescript
// src/services/imageService.ts
export const uploadImage = async (
  filePath: string,
  cloudPath: string
): Promise<ImageUploadResponse> => {
  // 1. 读取文件为 base64
  const response = await fetch(filePath);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  
  // 2. 通过云函数上传
  const result = await CloudService.callFunction('upload', {
    fileContent: base64,
    cloudPath: cloudPath,
  });
  
  return result.data;
};
```

**优缺点**:
- ✅ 不需要修改安全规则
- ✅ 可以使用管理员权限
- ❌ 受限于云函数 1MB 请求体限制
- ❌ 需要 base64 编码，体积膨胀

## 推荐方案

**强烈建议使用方法 1（配置安全规则）**，原因：
1. ✅ 客户端直传，速度快
2. ✅ 不受大小限制（最高 50MB）
3. ✅ 不需要 base64 编码
4. ✅ 代码更简单
5. ✅ 成本更低（省去了云函数调用）

## 验证配置

配置完成后，测试上传功能：

1. 运行应用
2. 选择一张图片
3. 查看控制台日志：
   ```
   [imageService] Uploading file directly: diary-images/xxx.jpg
   [imageService] Upload result: { fileID: 'cloud://...' }
   [MediaUpload] Success: cloud://...
   ```
4. 上传成功，显示预览

## 常见问题

### Q1: 规则配置后仍然报错？
A: 可能需要等待几分钟让规则生效，或者清除应用缓存后重试。

### Q2: 如何查看当前的安全规则？
A: 在云开发控制台 → 云存储 → 安全规则 页面查看。

### Q3: 规则中的 `auth.openid` 是什么？
A: 用户的唯一标识符，匿名用户也会有一个临时的 openid。

### Q4: 可以限制上传文件大小吗？
A: 可以在规则中添加：
```json
"write": "auth.openid != null && request.resource.size < 52428800"
```
（限制 50MB）

### Q5: 可以限制上传文件类型吗？
A: 可以在规则中添加：
```json
"write": "auth.openid != null && request.resource.contentType matches '^image/'"
```
（只允许图片）

## 完整的安全规则示例

```json
{
  "rules": {
    "diary-images/": {
      "read": true,
      "write": "auth.openid != null"
    },
    "avatars/": {
      "read": true,
      "write": "auth.openid != null"
    },
    "private/": {
      "read": "auth.openid != null",
      "write": "auth.openid != null"
    }
  }
}
```

## 参考文档

- [腾讯云存储安全规则](https://docs.cloudbase.net/storage/rules.html)
- [安全规则语法](https://docs.cloudbase.net/storage/rules-syntax.html)
- [访问控制](https://docs.cloudbase.net/security/access-control.html)
