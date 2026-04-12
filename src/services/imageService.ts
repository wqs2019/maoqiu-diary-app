import tcb from '@cloudbase/js-sdk';

class ImageService {
  private readonly app: any;
  private isAuth: boolean = false;

  constructor() {
    // Register adapter for React Native
    // tcb.useAdapters(adapter);

    // Initialize cloudbase
    this.app = tcb.init({
      env: 'maoqiu-diary-app-2fpzvwp2e01dbaf',
      // region: 'ap-shanghai',
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

      // In React Native without @cloudbase/adapter-rn, we need to convert the local URI to a Blob
      // because the pure Web SDK expects a File/Blob object for `filePath`
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log('cloudPath：', cloudPath);
      console.log('filePath：', blob);

      if (blob) {
        try {
          // Safely attempt to set the name property for the SDK
          Object.defineProperty(blob, 'name', {
            value: cloudPath.split('/').pop() || 'image.png',
            writable: true,
            configurable: true,
          });
        } catch (e) {
          console.warn('Failed to set blob name', e);
        }
      }

      const uploadResult = await this.app.uploadFile({
        cloudPath,
        filePath: blob, // Cast to any to bypass the File type definition
      });

      console.log('uploadResult：', uploadResult);

      const fileID = uploadResult.fileID;

      // Get temporary URL for the uploaded file
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
