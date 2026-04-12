// Cloud function for image upload with chunked upload support
// Supports large files via client-side chunking and server-side merging

const cloudbase = require('@cloudbase/node-sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 初始化云开发 SDK - 使用当前环境
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();

// 分片上传配置
const CHUNK_SIZE = 512 * 1024; // 512KB per chunk
const MAX_CHUNKS = 1000; // Maximum number of chunks

// 注意：不能使用内存存储，因为云函数是无状态的
// 每次 HTTP 请求可能由不同的云函数实例处理
// 必须使用数据库或云存储来持久化会话状态

/**
 * 初始化分片上传会话（数据库存储）
 * @param {Object} data - 包含 cloudPath, mimeType, totalChunks, fileSize 的对象
 */
const initMultipartUpload = async (data) => {
  try {
    const { cloudPath, mimeType, totalChunks, fileSize } = data;

    if (!cloudPath || !totalChunks) {
      return {
        success: false,
        message: '缺少必填参数',
      };
    }

    if (totalChunks > MAX_CHUNKS) {
      return {
        success: false,
        message: `分片数量不能超过 ${MAX_CHUNKS}`,
      };
    }

    console.log('[CloudFunction] Init multipart upload:', cloudPath, 'chunks:', totalChunks);

    // 生成唯一的上传会话 ID
    const uploadId = crypto.randomBytes(16).toString('hex');

    // 在数据库中创建上传会话记录
    await db
      .collection('upload_sessions')
      .doc(uploadId)
      .set({
        cloudPath,
        mimeType,
        totalChunks,
        fileSize,
        uploadedChunks: [],
        status: 'uploading',
        createdAt: db.serverDate(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 小时后过期
      });

    console.log('[CloudFunction] ✓ Upload session created in database:', uploadId);

    return {
      success: true,
      data: {
        uploadId,
        cloudPath,
        totalChunks,
      },
    };
  } catch (error) {
    console.error('[CloudFunction] ✗ Init multipart upload error:', error);
    return {
      success: false,
      message: '初始化上传会话失败',
      error: error.message,
    };
  }
};

/**
 * 上传单个分片（数据库 + 云存储）
 * @param {Object} data - 包含 uploadId, chunkIndex, chunkData (base64) 的对象
 */
const uploadChunk = async (data) => {
  try {
    const { uploadId, chunkIndex, chunkData } = data;

    if (!uploadId || chunkIndex === undefined || !chunkData) {
      console.error('[CloudFunction] Missing required parameters:', {
        uploadId,
        chunkIndex,
        hasData: !!chunkData,
      });
      return {
        success: false,
        message: '缺少必填参数',
      };
    }

    console.log(`[CloudFunction] ← Receiving chunk ${chunkIndex} for session ${uploadId}`);

    const currentSession = await db.collection('upload_sessions').doc(uploadId).get();
    if (!currentSession.data || currentSession.data.length === 0) {
      console.error('[CloudFunction] Upload session not found in database:', uploadId);
      return {
        success: false,
        message: '上传会话不存在或已过期',
      };
    }

    // TCB SDK get() returns array of documents in data for doc().get() in some versions
    const sessionData = Array.isArray(currentSession.data)
      ? currentSession.data[0]
      : currentSession.data;
    console.log(
      `[CloudFunction] Session found: totalChunks=${sessionData.totalChunks}, mimeType=${sessionData.mimeType}`
    );

    // 验证分片索引
    if (chunkIndex >= sessionData.totalChunks) {
      console.error(
        '[CloudFunction] Chunk index out of range:',
        chunkIndex,
        '>=',
        sessionData.totalChunks
      );
      return {
        success: false,
        message: '分片索引超出范围',
      };
    }

    // 将 base64 转换为 Buffer
    console.log(`[CloudFunction] Converting chunk ${chunkIndex} to buffer...`);
    const chunkBuffer = Buffer.from(chunkData, 'base64');
    console.log(`[CloudFunction] Chunk ${chunkIndex} buffer size: ${chunkBuffer.length} bytes`);

    // 存储分片到云存储临时目录
    const chunkPath = `temp_uploads/${uploadId}/chunk_${chunkIndex}`;
    console.log(`[CloudFunction] Storing chunk ${chunkIndex} at ${chunkPath}...`);
    await app.uploadFile({
      cloudPath: chunkPath,
      fileContent: chunkBuffer,
    });
    console.log(`[CloudFunction] ✓ Chunk ${chunkIndex} stored in cloud storage`);

    // 使用数组操作符原子性地添加分片索引（避免并发问题）
    console.log(`[CloudFunction] Updating session with chunk ${chunkIndex}...`);

    const _ = db.command;
    await db
      .collection('upload_sessions')
      .doc(uploadId)
      .update({
        uploadedChunks: _.addToSet(chunkIndex),
        updatedAt: db.serverDate(),
      });

    console.log(`[CloudFunction] Session updated: chunk ${chunkIndex} added`);

    // 重新获取最新的会话数据
    const updatedSessionResult = await db.collection('upload_sessions').doc(uploadId).get();
    const updatedSessionData = Array.isArray(updatedSessionResult.data)
      ? updatedSessionResult.data[0]
      : updatedSessionResult.data;
    const updatedCount = updatedSessionData?.uploadedChunks?.length || 0;
    console.log(`[CloudFunction] Uploaded chunks: ${updatedCount}/${sessionData.totalChunks}`);

    return {
      success: true,
      data: {
        uploadId,
        chunkIndex,
        uploadedCount: updatedCount,
        totalCount: sessionData.totalChunks,
      },
    };
  } catch (error) {
    console.error('[CloudFunction] ✗ Upload chunk error:', error);
    console.error('[CloudFunction] Error stack:', error.stack);
    return {
      success: false,
      message: '上传分片失败',
      error: error.message,
    };
  }
};

/**
 * 合并所有分片并上传到云存储（数据库 + 云存储）
 * @param {Object} data - 包含 uploadId 的对象
 */
const mergeChunks = async (data) => {
  try {
    const { uploadId } = data;

    if (!uploadId) {
      console.error('[CloudFunction] Missing uploadId');
      return {
        success: false,
        message: '缺少 uploadId',
      };
    }

    console.log(`[CloudFunction] ← Merge request for session: ${uploadId}`);

    // 从数据库中获取上传会话
    const currentSession = await db.collection('upload_sessions').doc(uploadId).get();
    if (!currentSession.data || currentSession.data.length === 0) {
      console.error('[CloudFunction] Upload session not found in database:', uploadId);
      return {
        success: false,
        message: '上传会话不存在',
      };
    }

    // TCB SDK returns an array in data for get() queries
    const sessionData = Array.isArray(currentSession.data)
      ? currentSession.data[0]
      : currentSession.data;
    console.log('[CloudFunction] Session data:', JSON.stringify(sessionData, null, 2));

    // 验证必要字段
    if (!sessionData.cloudPath || !sessionData.totalChunks) {
      console.error('[CloudFunction] Invalid session data: missing cloudPath or totalChunks');
      return {
        success: false,
        message: '会话数据不完整',
      };
    }

    console.log(
      `[CloudFunction] Session found: cloudPath=${sessionData.cloudPath}, totalChunks=${sessionData.totalChunks}`
    );
    console.log(
      `[CloudFunction] Uploaded chunks: ${sessionData.uploadedChunks?.length || 0}/${sessionData.totalChunks}`
    );

    // 验证所有分片都已上传
    if (sessionData.uploadedChunks.length !== sessionData.totalChunks) {
      console.error(
        '[CloudFunction] Not all chunks uploaded:',
        sessionData.uploadedChunks.length,
        '!=',
        sessionData.totalChunks
      );
      return {
        success: false,
        message: `还有 ${sessionData.totalChunks - sessionData.uploadedChunks.length} 个分片未上传`,
      };
    }

    console.log('[CloudFunction] ✓ All chunks present, starting merge...');
    console.log('[CloudFunction] Total chunks:', sessionData.totalChunks);

    const mergedFilePath = path.join('/tmp', `merged_${uploadId}`);
    if (fs.existsSync(mergedFilePath)) {
      fs.unlinkSync(mergedFilePath);
    }

    // 从云存储并发读取分片并按顺序追加，提高合并速度
    let totalSize = 0;
    const downloadPromises = [];
    for (let i = 0; i < sessionData.totalChunks; i++) {
      const chunkPath = `temp_uploads/${uploadId}/chunk_${i}`;
      downloadPromises.push(
        (async () => {
          let downloadAttempts = 0;
          const maxDownloadAttempts = 3;
          while (downloadAttempts < maxDownloadAttempts) {
            downloadAttempts++;
            try {
              console.log(
                `[CloudFunction] Reading chunk ${i} from ${chunkPath} (attempt ${downloadAttempts})...`
              );
              const result = await app.downloadFile({ cloudPath: chunkPath });
              return { index: i, content: result.fileContent };
            } catch (error) {
              console.warn(
                `[CloudFunction] Download chunk ${i} attempt ${downloadAttempts} failed:`,
                error.message
              );
              if (downloadAttempts === maxDownloadAttempts) throw error;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        })()
      );
    }

    // 等待所有分片下载完成
    console.log(`[CloudFunction] Downloading ${sessionData.totalChunks} chunks concurrently...`);
    const downloadedChunks = await Promise.all(downloadPromises);

    // 按索引排序
    downloadedChunks.sort((a, b) => a.index - b.index);

    // 依次追加到本地临时文件
    console.log('[CloudFunction] Appending downloaded chunks to local file...');
    for (const chunk of downloadedChunks) {
      fs.appendFileSync(mergedFilePath, chunk.content);
      totalSize += chunk.content.length;
    }

    console.log('[CloudFunction] ✓ Merged file size:', totalSize, 'bytes at', mergedFilePath);

    // 上传合并后的文件到云存储
    console.log('[CloudFunction] Uploading merged file to:', sessionData.cloudPath);
    try {
      const uploadResult = await app.uploadFile({
        cloudPath: sessionData.cloudPath,
        fileContent: fs.createReadStream(mergedFilePath),
      });

      console.log('[CloudFunction] ✓ Merged file uploaded, fileID:', uploadResult.fileID);

      // 获取临时 URL
      console.log('[CloudFunction] Getting temp URL...');
      // 云开发 getTempFileURL 容易在刚刚 uploadFile 后报错 (文件还没完全同步)
      // 我们加一个小延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      const urlResult = await app.getTempFileURL({
        fileList: [uploadResult.fileID],
        maxAge: 60 * 60 * 24 * 7,
      });

      console.log(
        '[CloudFunction] ✓ Got temp URL:',
        urlResult.fileList[0].tempFileURL?.substring(0, 50) + '...'
      );

      // 清理临时分片文件
      const chunkPaths = [];
      for (let i = 0; i < sessionData.totalChunks; i++) {
        chunkPaths.push(`temp_uploads/${uploadId}/chunk_${i}`);
      }

      console.log('[CloudFunction] Cleaning up', chunkPaths.length, 'chunk files...');
      try {
        await app.deleteFile({
          fileList: chunkPaths,
        });
        console.log('[CloudFunction] ✓ Cleaned up chunk files');
      } catch (e) {
        console.warn('[CloudFunction] ✗ Cleanup failed:', e);
      }

      // 清理本地合并文件
      if (fs.existsSync(mergedFilePath)) {
        fs.unlinkSync(mergedFilePath);
        console.log('[CloudFunction] ✓ Cleaned up local merged file');
      }

      // 更新会话状态
      console.log('[CloudFunction] Updating session status to completed...');
      await db.collection('upload_sessions').doc(uploadId).update({
        status: 'completed',
        fileID: uploadResult.fileID,
        completedAt: db.serverDate(),
      });

      console.log('[CloudFunction] ✓✓✓ Merge completed successfully');

      return {
        success: true,
        data: {
          fileID: uploadResult.fileID,
          cloudPath: sessionData.cloudPath,
          tempURL: urlResult.fileList[0].tempFileURL,
          size: totalSize,
          mimeType: sessionData.mimeType,
        },
      };
    } catch (error) {
      console.error('[CloudFunction] ✗ Upload or merge error:', error);
      console.error('[CloudFunction] Error stack:', error.stack);
      throw error;
    }
  } catch (error) {
    console.error('[CloudFunction] ✗ Merge chunks error:', error);
    console.error('[CloudFunction] Error stack:', error.stack);
    return {
      success: false,
      message: '合并分片失败',
      error: error.message,
    };
  }
};

/**
 * 获取上传签名（用于客户端直传）
 * @param {Object} data - 包含 cloudPath 和 mimeType 的对象
 */
const getUploadSignature = async (data) => {
  try {
    const { cloudPath, mimeType } = data;

    if (!cloudPath) {
      return {
        success: false,
        message: '云存储路径不能为空',
      };
    }

    console.log('[CloudFunction] Getting upload signature for:', cloudPath);

    // 使用 SDK 的 getUploadSignature 方法获取签名
    const signature = await app.getUploadSignature({
      path: cloudPath,
      maxAge: 3600, // 1 小时有效期
    });

    console.log('[CloudFunction] Signature generated');

    return {
      success: true,
      data: {
        signature,
        cloudPath,
      },
    };
  } catch (error) {
    console.error('[CloudFunction] Get signature error:', error);
    return {
      success: false,
      message: '获取签名失败',
      error: error.message,
    };
  }
};

/**
 * 上传文件到云存储（支持 base64，小文件）
 * @deprecated 已废弃，统一使用分片上传
 */
const uploadFile = async (data) => {
  // 保留此函数以兼容旧版本，但建议使用分片上传
  try {
    const { fileContent, cloudPath } = data;

    if (!fileContent || !cloudPath) {
      return {
        success: false,
        message: '缺少必填参数',
      };
    }

    console.log('[CloudFunction] Direct upload to:', cloudPath);

    let base64Data = fileContent;
    let mimeType = 'image/jpeg';

    if (fileContent.includes('data:')) {
      const matches = fileContent.match(/^data:(image\/\w+|video\/\w+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    console.log('[CloudFunction] File buffer size:', fileBuffer.length, 'bytes');

    const result = await app.uploadFile({
      cloudPath: cloudPath,
      fileContent: fileBuffer,
    });

    const urlResult = await app.getTempFileURL({
      fileList: [result.fileID],
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      data: {
        fileID: result.fileID,
        cloudPath: cloudPath,
        tempURL: urlResult.fileList[0].tempFileURL,
        mimeType: mimeType,
        size: fileBuffer.length,
      },
    };
  } catch (error) {
    console.error('[CloudFunction] Upload file error:', error);
    return {
      success: false,
      message: '上传文件失败',
      error: error.message,
    };
  }
};

/**
 * 通过 cloudPath 查询 fileID（用于直传后获取 fileID）
 * 注意：这个方法需要云存储支持通过路径查询文件 ID
 * 实际上腾讯云开发没有直接提供这个 API
 * 我们需要通过其他方式实现
 */
const queryFileID = async (data) => {
  try {
    const { cloudPath } = data;

    if (!cloudPath) {
      return {
        success: false,
        message: '云存储路径不能为空',
      };
    }

    console.log('[CloudFunction] Query fileID for:', cloudPath);

    // 由于腾讯云没有直接的 queryFileID API
    // 我们使用一个变通方法：通过 downloadFile 获取 fileID
    // 或者：直传时记录 cloudPath 到 fileID 的映射到数据库
    // 这里我们采用简单方案：直接构造 fileID
    // 格式：cloudID://{envId}/{cloudPath}

    const envId = process.env.CLOUDBASE_ENV || 'unknown';
    const fileID = `cloud://${envId}.${cloudPath.replace(/\//g, '.')}`;

    console.log('[CloudFunction] Generated fileID:', fileID);

    return {
      success: true,
      data: {
        fileID,
        cloudPath,
      },
    };
  } catch (error) {
    console.error('Query fileID error:', error);
    return {
      success: false,
      message: '查询 fileID 失败',
      error: error.message,
    };
  }
};

/**
 * 批量获取文件的临时访问 URL
 * @param {Object} data - 包含 fileList (fileID 数组) 的对象
 */
const getTempFileURL = async (data) => {
  try {
    const { fileList, maxAge = 60 * 60 * 24 * 7 } = data;

    if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
      return {
        success: false,
        message: '文件 ID 列表不能为空',
      };
    }

    // 获取临时访问 URL
    const result = await app.getTempFileURL({
      fileList: fileList,
      maxAge: maxAge, // 默认 7 天有效期
    });

    return {
      success: true,
      data: {
        fileList: result.fileList.map((file) => ({
          fileID: file.fileID,
          tempURL: file.tempFileURL,
          status: file.status,
          message: file.message,
        })),
      },
    };
  } catch (error) {
    console.error('Get temp file URL error:', error);
    return {
      success: false,
      message: '获取临时 URL 失败',
      error: error.message,
    };
  }
};

/**
 * 生成唯一的云存储路径
 * @param {String} extension - 文件扩展名
 */
const generateCloudPath = (extension = 'jpg') => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `diary-images/${timestamp}-${randomStr}.${extension}`;
};

/**
 * 删除云存储文件
 * @param {Object} data - 包含 fileList (fileID 数组) 的对象
 */
const deleteFile = async (data) => {
  try {
    const { fileList } = data;

    if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
      return {
        success: false,
        message: '文件 ID 列表不能为空',
      };
    }

    // 删除文件
    const result = await app.deleteFile({
      fileList: fileList,
    });

    return {
      success: true,
      data: {
        fileList: result.fileList.map((file) => ({
          fileID: file.fileID,
          status: file.status,
          message: file.message,
        })),
      },
    };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      message: '删除文件失败',
      error: error.message,
    };
  }
};

// 导出主函数
exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'upload':
      return await uploadFile(data);
    case 'initMultipart':
      return await initMultipartUpload(data);
    case 'uploadChunk':
      return await uploadChunk(data);
    case 'mergeChunks':
      return await mergeChunks(data);
    case 'getSignature':
      return await getUploadSignature(data);
    case 'queryFileID':
      return await queryFileID(data);
    case 'getURL':
      return await getTempFileURL(data);
    case 'generatePath':
      return {
        success: true,
        data: {
          cloudPath: generateCloudPath(data?.extension),
        },
      };
    case 'delete':
      return await deleteFile(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
