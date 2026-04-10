// 验证码验证云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const codesCollection = db.collection('verification_codes');

exports.main = async (event, context) => {
  try {
    const { phone, code } = event;

    // 验证参数
    if (!phone || !code) {
      return {
        code: -1,
        message: '手机号和验证码不能为空'
      };
    }

    // 查找验证码记录
    const codeRecord = await codesCollection
      .where({
        phone: phone,
        code: code,
        expiresAt: {
          $gt: new Date()
        }
      })
      .limit(1)
      .get();

    if (codeRecord.data.length === 0) {
      return {
        code: -1,
        message: '验证码错误或已过期'
      };
    }

    // 验证成功，删除验证码（一次性使用）
    await codesCollection.doc(codeRecord.data[0]._id).remove();

    return {
      code: 0,
      message: '验证码验证成功'
    };
  } catch (error) {
    console.error('Verify code error:', error);
    return {
      code: -1,
      message: '验证码验证失败'
    };
  }
};
