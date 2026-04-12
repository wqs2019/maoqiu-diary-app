// 图片服务类型定义

/**
 * 图片上传响应
 */
export interface ImageUploadResponse {
  success: boolean;
  data?: {
    fileID: string;      // 云存储文件 ID
    cloudPath: string;   // 云存储路径
    tempURL: string;     // 临时访问 URL
    mimeType?: string;    // 文件 MIME 类型
    size?: number;        // 文件大小（字节）
  };
  message?: string;
  error?: string;
}

/**
 * 获取临时 URL 请求参数
 */
export interface GetTempFileURLRequest {
  fileList: string[];    // fileID 列表
  maxAge?: number;       // 有效期（秒），默认 7 天
}

/**
 * 获取临时 URL 响应
 */
export interface GetTempFileURLResponse {
  success: boolean;
  data: {
    fileList: Array<{
      fileID: string;
      tempURL: string;
      status: number;    // 0 表示成功
      message?: string;
    }>;
  };
  message?: string;
  error?: string;
}

/**
 * 生成云存储路径请求参数
 */
export interface GenerateCloudPathRequest {
  extension?: string;    // 文件扩展名，默认 'jpg'
}

/**
 * 生成云存储路径响应
 */
export interface GenerateCloudPathResponse {
  success: boolean;
  data: {
    cloudPath: string;
  };
}

/**
 * 删除文件请求参数
 */
export interface DeleteFileRequest {
  fileList: string[];    // fileID 列表
}

/**
 * 删除文件响应
 */
export interface DeleteFileResponse {
  success: boolean;
  data: {
    fileList: Array<{
      fileID: string;
      status: number;    // 0 表示成功
      message?: string;
    }>;
  };
  message?: string;
  error?: string;
}
