// 修复 COS SDK 在 React Native 下由于 navigator.userAgent 缺失导致的报错
import { CloudService } from './tcb';
if (typeof global !== 'undefined') {
  if (!global.navigator) {
    (global as any).navigator = {};
  }
  if (!global.navigator.userAgent) {
    (global as any).navigator.userAgent = 'ReactNative';
  }
}

const COS = require('cos-js-sdk-v5');

class ImageService {
  private cos: any = null;

  constructor() {}

  // 获取临时密钥
  private async getTempCredentials() {
    try {
      const response = await CloudService.callFunction('getCosTempKey', {});

      if (response.code !== 0) {
        throw new Error(response.message || '获取密钥失败');
      }

      return response.data;
    } catch (error) {
      console.error('获取 COS 密钥失败:', error);
      throw error;
    }
  }

  // 初始化 COS
  private async initCOS() {
    if (this.cos) return this.cos;

    this.cos = new COS({
      getAuthorization: async (options: any, callback: any) => {
        try {
          const credentials = await this.getTempCredentials();
          callback({
            TmpSecretId: credentials.tmpSecretId,
            TmpSecretKey: credentials.tmpSecretKey,
            SecurityToken: credentials.sessionToken,
            StartTime: credentials.startTime,
            ExpiredTime: credentials.expiredTime,
          });
        } catch (error) {
          console.error('获取签名失败:', error);
        }
      },
    });

    return this.cos;
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
    mimeType: string = 'image/jpeg'
  ): Promise<{ success: boolean; data?: { url: string }; message?: string }> {
    try {
      const cos = await this.initCOS();

      // 读取文件为 blob
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        // 使用真实的 Bucket 名称和 Region
        cos.putObject(
          {
            Bucket: '6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-1417164439',
            Region: 'ap-shanghai',
            Key: cloudPath,
            Body: blob,
            ContentType: mimeType,
          },
          (err: any, data: any) => {
            if (err) {
              console.error('COS 上传失败:', err);
              resolve({
                success: false,
                message: err.message || '上传失败',
              });
            } else {
              console.log('COS 上传成功:', data);
              // 使用 TCB 的默认访问域名来展示图片
              const tcbDomain = '6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-1417164439.tcb.qcloud.la';
              const tempURL = `https://${tcbDomain}/${cloudPath}`;
              resolve({
                success: true,
                data: {
                  url: tempURL,
                },
              });
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      return {
        success: false,
        message: error.message || '上传准备失败',
      };
    }
  }
}

export const imageService = new ImageService();
export default imageService;
