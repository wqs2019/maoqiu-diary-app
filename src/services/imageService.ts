import adapter from '@cloudbase/adapter-rn';
import cloudbase from '@cloudbase/js-sdk';

// 注册 React Native 适配器，以支持在 RN 环境中使用云开发相关的 API（如上传文件时的 filePath 支持 uri）
cloudbase.useAdapters(adapter);

class ImageService {
  private readonly app: any;
  private isAuth: boolean = false;

  constructor() {
    // 初始化 cloudbase
    this.app = cloudbase.init({
      env: 'maoqiu-diary-app-2fpzvwp2e01dbaf',
      region: 'ap-shanghai',
    });
  }

  private async ensureAuth() {
    if (this.isAuth) return this.app.auth();

    try {
      const auth = this.app.auth({ persistence: 'local' });
      // 关键：如果没登录，强制匿名登录
      if (auth.signInAnonymously) {
        await auth.signInAnonymously();
        console.log('[CloudService] Anonymous login (signInAnonymously)');
        this.isAuth = true;
      } else {
        console.warn('auth.anonymousAuthProvider and auth.signInAnonymously are missing.');
        throw new Error('Cannot find anonymous login method on auth object');
      }
      return auth;
    } catch (err) {
      console.error('登录失败：', err);
      return false;
    }
  }

  public async generateCloudPath(extension: string, folder: string = 'diary') {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const cloudPath = `${folder}/${timestamp}-${randomStr}.${extension}`;
    return { data: { cloudPath } };
  }

  public async uploadImage(
    uri: string,
    cloudPath: string,
    mimeType?: string
  ): Promise<{ success: boolean; data?: { fileID: string; tempURL: string }; message?: string }> {
    try {
      await this.ensureAuth();

      console.log('Uploading to TCB:', cloudPath, uri);

      // 使用 RN 适配器后，直接将本地 uri 传给 filePath
      const uploadResult = await this.app.uploadFile({
        cloudPath,
        filePath: uri,
      });

      console.log('uploadResult：', uploadResult);

      const fileID = uploadResult.fileID;

      // 获取上传后的临时访问链接
      const tempUrlResult = await this.app.getTempFileURL({
        fileList: [fileID],
      });

      if (!tempUrlResult.fileList || tempUrlResult.fileList.length === 0) {
        throw new Error('Failed to get temporary file URL');
      }

      const tempURL = tempUrlResult.fileList[0].tempFileURL;

      return {
        success: true,
        data: {
          fileID,
          tempURL,
        },
      };
    } catch (error: any) {
      console.error('Upload failed:', error);
      return {
        success: false,
        message: error.message || '上传失败',
      };
    }
  }
}

export const imageService = new ImageService();
export default imageService;
