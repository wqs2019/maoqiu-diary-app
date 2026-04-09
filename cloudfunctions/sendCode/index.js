// 发送验证码云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const codesCollection = db.collection('verification_codes');

exports.main = async (event, context) => {
  try {
    const { phone } = event;

    // 验证手机号
    if (!phone || !(/^1[3-9]\d{9}$/.test(phone))) {
      return {
        code: -1,
        message: '手机号格式错误'
      };
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码到数据库，设置5分钟过期
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await codesCollection.add({
      phone,
      code,
      expiresAt,
      createdAt: new Date()
    });

    // 这里应该调用短信服务发送验证码
    // 实际应用中，需要集成短信服务商的API
    console.log(`向 ${phone} 发送验证码: ${code}`);

    // 清理过期的验证码
    await codesCollection.where({
      expiresAt: {
        $lt: new Date()
      }
    }).remove();

    return {
      code: 0,
      message: '验证码发送成功'
    };
  } catch (error) {
    console.error('Send code error:', error);
    return {
      code: -1,
      message: '验证码发送失败'
    };
  }
};
