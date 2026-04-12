# 权限配置说明

## 问题描述
选择视频后应用闪退，错误信息：
```
[TCC] This app has crashed because it attempted to access privacy-sensitive data without a usage description.
The app's Info.plist must contain an NSPhotoLibraryUsageDescription key...
```

## 解决方案

### iOS 权限配置

在 `app.json` 的 `ios.infoPlist` 中添加以下权限描述：

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.maoqiu-diary",
  "appleTeamId": "PK8H5TBMV6",
  "infoPlist": {
    "NSPhotoLibraryUsageDescription": "毛球日记需要访问您的相册以选择照片和视频，记录美好时光",
    "NSCameraUsageDescription": "毛球日记需要使用相机拍摄照片和视频",
    "NSMicrophoneUsageDescription": "毛球日记需要访问麦克风以录制视频声音"
  }
}
```

**权限说明**：
- `NSPhotoLibraryUsageDescription`: 访问相册权限（必需）
- `NSCameraUsageDescription`: 使用相机权限（可选，用于拍照）
- `NSMicrophoneUsageDescription`: 访问麦克风权限（必需，用于录制视频）

### Android 权限配置

在 `app.json` 的 `android` 部分添加权限列表：

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/logo.jpg",
    "backgroundColor": "#ffffff"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "permissions": [
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "CAMERA",
    "RECORD_AUDIO"
  ]
}
```

**权限说明**：
- `READ_EXTERNAL_STORAGE`: 读取外部存储（选择图片/视频）
- `WRITE_EXTERNAL_STORAGE`: 写入外部存储（保存图片/视频）
- `CAMERA`: 使用相机（拍照）
- `RECORD_AUDIO`: 录制音频（录制视频时必需）

## 重新构建应用

修改配置后，需要重新构建应用才能生效：

### 开发构建（推荐）
```bash
# 清除缓存
npx expo prebuild --clean

# 重新构建
npx expo run:ios
# 或
npx expo run:android
```

### 生产构建
```bash
# 使用 EAS Build
eas build --platform ios
# 或
eas build --platform android
```

## 权限请求时机

应用会在以下场景请求权限：

1. **首次点击"添加媒体"**：请求相册访问权限
2. **首次选择视频**：请求麦克风权限（Android）
3. **首次拍摄照片/视频**：请求相机权限

## iOS 隐私权限最佳实践

### 1. 描述要具体
❌ 错误示例：
```json
"NSPhotoLibraryUsageDescription": "需要访问相册"
```

✅ 正确示例：
```json
"NSPhotoLibraryUsageDescription": "毛球日记需要访问您的相册以选择照片和视频，记录美好时光"
```

### 2. 说明用途
告诉用户为什么要使用这个权限，以及会带来什么好处。

### 3. 语气友好
使用友好、亲切的语气，增加用户授权的可能性。

## Android 权限处理

### Expo 自动处理
使用 Expo 的 `expo-image-picker` 会自动处理权限请求，无需手动编写权限代码。

### 手动权限检查（可选）
如果需要提前检查权限，可以使用：

```typescript
import { PermissionsAndroid } from 'react-native';

const checkAndroidPermissions = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: '存储权限',
        message: '毛球日记需要访问您的相册以选择照片和视频',
        buttonPositive: '允许',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};
```

## 常见问题

### Q1: 修改后仍然闪退怎么办？
A: 需要清除缓存并重新构建：
```bash
npx expo prebuild --clean
npx expo run:ios  # 或 npx expo run:android
```

### Q2: 模拟器上测试权限
A: iOS 模拟器默认有相册访问权限，Android 模拟器可能需要手动授权。

### Q3: 真机测试权限
A: 在真机上首次运行时，系统会弹出权限请求对话框，用户可以选择"允许"或"不允许"。

### Q4: 用户拒绝权限后如何处理？
A: `expo-image-picker` 会返回 `canceled: true`，需要在代码中处理这种情况：

```typescript
const result = await ImagePicker.launchImageLibraryAsync({...});
if (result.canceled) {
  // 用户取消了选择或没有权限
  return;
}
```

## 相关文件

- 配置文件：`app.json`
- 组件：`src/components/handDrawn/MediaSelector.tsx`
- 文档：`docs/permissions-setup.md`

## 验证步骤

1. ✅ 检查 `app.json` 中是否包含所有必需的权限配置
2. ✅ 运行 `npx expo prebuild --clean`
3. ✅ 重新构建应用
4. ✅ 在真机或模拟器上测试
5. ✅ 选择图片和视频，确认不再闪退

## 参考链接

- [Expo Image Picker 文档](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [iOS 权限配置](https://developer.apple.com/documentation/bundleresources/information_property_list/privacy)
- [Android 权限概览](https://developer.android.com/guide/topics/permissions/overview)
