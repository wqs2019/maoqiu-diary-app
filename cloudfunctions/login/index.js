// 登录云函数
const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'login':
      return await loginHandler(data);
    case 'validateToken':
      return await validateTokenHandler(data);
    default:
      return {
        code: -1,
        message: '无效的操作',
      };
  }
};

async function loginHandler(data) {
  try {
    const { phone, code } = data || {};

    // 验证手机号和验证码
    if (!phone || !code) {
      return {
        code: -1,
        message: '手机号和验证码不能为空',
      };
    }

    // 这里应该验证验证码是否正确
    // 实际应用中，验证码应该存储在数据库或缓存中
    // 这里简化处理，假设验证码正确

    // 查找用户
    let user = await usersCollection.where({ phone }).get();

    if (user.data.length === 0) {
      // 用户不存在，创建新用户
      const newUser = {
        phone,
        nickname: `用户${phone.slice(-4)}`,
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.add(newUser);
      user = {
        data: [
          {
            ...newUser,
            id: result._id,
          },
        ],
      };
    } else {
      // 用户存在，更新最后登录时间
      await usersCollection.doc(user.data[0]._id).update({
        updatedAt: new Date(),
      });
    }

    // 生成Token
    const token = generateToken(user.data[0].id);

    return {
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.data[0]._id,
          phone: user.data[0].phone,
          nickname: user.data[0].nickname,
          avatar: user.data[0].avatar,
        },
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      code: -1,
      message: '登录失败',
    };
  }
}

// 生成Token的函数
function generateToken(userId) {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const signature = crypto
    .createHash('md5')
    .update(`${userId}${timestamp}${randomStr}`)
    .digest('hex');
  return `${userId}.${timestamp}.${signature}`;
}

async function validateTokenHandler(data) {
  try {
    const { token } = data || {};

    if (!token) {
      return { code: -1, message: 'Token不能为空' };
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { code: -1, message: 'Token格式错误' };
    }

    const [userId, timestamp, signature] = tokenParts;

    const tokenExpiry = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > tokenExpiry) {
      return { code: -1, message: 'Token已过期' };
    }

    // 验证用户是否存在
    const userResult = await usersCollection.doc(userId).get();

    // userResult.data 可能是数组，也可能是对象（取决于 SDK 实现），这里做下兼容
    const userData = Array.isArray(userResult.data) ? userResult.data[0] : userResult.data;

    if (!userData) {
      return { code: -1, message: '用户不存在' };
    }

    return {
      code: 0,
      message: 'Token验证成功',
      data: {
        user: {
          id: userData._id || userId,
          phone: userData.phone,
          nickname: userData.nickname,
          avatar: userData.avatar,
        },
      },
    };
  } catch (error) {
    console.error('Validate token error:', error);
    return { code: -1, message: 'Token验证失败' };
  }
}
