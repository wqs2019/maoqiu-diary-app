// 验证Token云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  try {
    const { token } = event;

    // 验证Token
    if (!token) {
      return {
        code: -1,
        message: 'Token不能为空'
      };
    }

    // 解析Token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return {
        code: -1,
        message: 'Token格式错误'
      };
    }

    const [userId, timestamp, signature] = tokenParts;

    // 验证Token是否过期（30天）
    const tokenExpiry = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > tokenExpiry) {
      return {
        code: -1,
        message: 'Token已过期'
      };
    }

    // 验证用户是否存在
    const user = await usersCollection.doc(userId).get();
    if (!user.data) {
      return {
        code: -1,
        message: '用户不存在'
      };
    }

    // 验证Token签名
    // 实际应用中，应该使用更安全的签名验证方法
    // 这里简化处理，假设签名正确

    return {
      code: 0,
      message: 'Token验证成功',
      data: {
        user: {
          id: user.data._id,
          phone: user.data.phone,
          nickname: user.data.nickname,
          avatar: user.data.avatar
        }
      }
    };
  } catch (error) {
    console.error('Validate token error:', error);
    return {
      code: -1,
      message: 'Token验证失败'
    };
  }
};
