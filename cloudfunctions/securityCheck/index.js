const cloud = require('@cloudbase/node-sdk');
const { SensitiveWordTool } = require('sensitive-word-tool');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();
const usersCollection = db.collection('users');
const USER_ERROR_CODES = {
  USER_FROZEN: 'USER_FROZEN',
};

// 实例化 sensitive-word-tool，使用库内置的默认敏感词库
const sensitiveWordTool = new SensitiveWordTool({
  useDefaultWords: true
});

// 你也可以继续追加自定义的敏感词
// sensitiveWordTool.addWords(['自定义违规词1', '自定义违规词2']);

const getDocData = (result) =>
  result && result.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;

const getUserDoc = async (userId) => {
  if (!userId) {
    return null;
  }

  const result = await usersCollection.doc(userId).get();
  return getDocData(result);
};

const getOperatorUserId = (payload = {}) => {
  const candidateKeys = ['__operatorUserId', 'userId', 'currentUserId', '_id'];
  for (const key of candidateKeys) {
    if (payload && typeof payload[key] === 'string' && payload[key]) {
      return payload[key];
    }
  }

  return '';
};

const ensureOperatorNotFrozen = async (payload = {}) => {
  const operatorUserId = getOperatorUserId(payload);
  if (!operatorUserId) {
    return null;
  }

  const operatorUser = await getUserDoc(operatorUserId);
  if (operatorUser && operatorUser.accountStatus === 'frozen') {
    return {
      code: -1,
      message: '该账号已被冻结，请联系管理员',
      errorCode: USER_ERROR_CODES.USER_FROZEN,
    };
  }

  return null;
};

exports.main = async (event, context) => {
  const { action, text } = event;

  const frozenGuard = await ensureOperatorNotFrozen(event || {});
  if (frozenGuard) {
    return frozenGuard;
  }

  if (action === 'checkText') {
    if (!text || typeof text !== 'string') {
      return { code: -1, message: '文本不能为空' };
    }

    try {
      // 检查是否包含敏感词 (忽略特殊符号干扰)
      const isVerified = sensitiveWordTool.verify(text);

      if (isVerified) {
        // 获取匹配到的所有敏感词（可选，用于记录日志或提示用户）
        const matchedWords = sensitiveWordTool.match(text);
        console.warn(`[Security] 检测到敏感词:`, matchedWords);
        
        return { 
          code: 0, 
          data: { 
            isSafe: false, 
            reason: '包含敏感词',
            matched: matchedWords // 也可以选择不返回给前端，看具体需求
          } 
        };
      }

      // 如果没有敏感词，放行
      return { code: 0, data: { isSafe: true } };

    } catch (error) {
      console.error('Security check error:', error);
      // 检测服务异常时，建议保守拒绝或根据业务需求放行
      return { code: -1, message: '安全检测服务异常', error: error.message };
    }
  }

  return { code: -1, message: '无效的操作' };
};
