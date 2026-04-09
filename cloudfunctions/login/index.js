// 登录云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  try {
    const { phone, code } = event;

    // 验证手机号和验证码
    if (!phone || !code) {
      return {
        code: -1,
        message: '手机号和验证码不能为空'
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
        updatedAt: new Date()
      };
      
      const result = await usersCollection.add(newUser);
      user = {
        data: [{
          ...newUser,
          id: result._id
        }]
      };
    } else {
      // 用户存在，更新最后登录时间
      await usersCollection.doc(user.data[0]._id).update({
        updatedAt: new Date()
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
          avatar: user.data[0].avatar
        }
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      code: -1,
      message: '登录失败'
    };
  }
};

// 生成Token的函数
function generateToken(userId) {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const signature = crypto.createHash('md5').update(`${userId}${timestamp}${randomStr}`).digest('hex');
  return `${userId}.${timestamp}.${signature}`;
}
