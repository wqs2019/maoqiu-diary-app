const cloud = require('wx-server-sdk');
const STS = require('qcloud-cos-sts');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  try {
    // 从环境变量读取密钥
    const secretId = process.env.COS_SECRET_ID;
    const secretKey = process.env.COS_SECRET_KEY;

    if (!secretId || !secretKey) {
      return {
        code: -1,
        message: 'COS 密钥未配置，请在云函数环境变量中设置 COS_SECRET_ID 和 COS_SECRET_KEY',
      };
    }

    // STS 配置
    const config = {
      secretId: secretId,
      secretKey: secretKey,
      durationSeconds: 1800, // 临时密钥有效期 30 分钟
      bucket: 'cloud1-2g4k8irc2cbc94c3-1250000000', // 你的存储桶
      region: 'ap-shanghai', // 你的区域
      allowPrefix: 'diary/*', // 允许上传的路径前缀
      allowActions: [
        // 简单上传
        'name/cos:PutObject',
        'name/cos:PostObject',
        // 分片上传
        'name/cos:InitiateMultipartUpload',
        'name/cos:ListMultipartUploads',
        'name/cos:ListParts',
        'name/cos:UploadPart',
        'name/cos:CompleteMultipartUpload',
        'name/cos:AbortMultipartUpload',
      ],
    };

    // 获取临时密钥
    const result = await STS.getCredential(config);

    return {
      code: 0,
      message: 'success',
      data: {
        tmpSecretId: result.credentials.tmpSecretId,
        tmpSecretKey: result.credentials.tmpSecretKey,
        sessionToken: result.credentials.sessionToken,
        expiredTime: result.expiredTime,
        startTime: result.startTime,
        bucket: config.bucket,
        region: config.region,
      },
    };
  } catch (error) {
    console.error('获取临时密钥失败:', error);
    return {
      code: -1,
      message: error.message || '获取临时密钥失败',
    };
  }
};
