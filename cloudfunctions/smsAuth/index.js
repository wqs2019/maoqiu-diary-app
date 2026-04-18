const Core = require('@alicloud/pop-core');
const cloud = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

// 建议在腾讯云开发控制台中配置这些为【云函数环境变量】，以确保安全
const ALIYUN_CONFIG = {
  accessKeyId: process.env.ALIYUN_AK,
  accessKeySecret: process.env.ALIYUN_SK,
  endpoint: "https://dypnsapi.aliyuncs.com", // 号码认证服务 Endpoint
  apiVersion: "2017-05-25",
};

exports.main = async (event, context) => {
  const { action, phone, code } = event;

  if (!phone) {
    return { code: -1, message: '手机号不能为空' };
  }

  // 初始化阿里云客户端
  const client = new Core({
    accessKeyId: ALIYUN_CONFIG.accessKeyId,
    accessKeySecret: ALIYUN_CONFIG.accessKeySecret,
    endpoint: ALIYUN_CONFIG.endpoint,
    apiVersion: ALIYUN_CONFIG.apiVersion
  });

  // ============== 1. 发送验证码逻辑 ==============
  if (action === 'send') {
    // 即使阿里云号码认证服务可以帮你校验验证码，但大部分赠送的模板依然要求你生成并传入 code 和 min
    // 只有极少部分完全托管的方案才不传。这里根据报错提示补回我们自己生成的验证码
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    const params = {
      "PhoneNumber": phone,
      "SignName": "速通互联验证码", // 请确保这是号码认证服务赠送的或者绑定的合法签名
      "TemplateCode": "100001", // 请确保这是号码认证服务中合法的模板
      "TemplateParam": JSON.stringify({ code: verifyCode, min: "5" }), // 补回必填的模板参数
      "SchemeName": "毛球日记"
    };

    const requestOption = { method: 'POST', formatParams: false };

    try {
      // 调用阿里云接口发送短信
      const result = await client.request('SendSmsVerifyCode', params, requestOption);

      if (result.Code === 'OK') {
        // 保存验证码到数据库，自行管理有效期
        const smsCollection = db.collection('sms_codes');
        
        // 删除该手机号之前的所有验证码记录，保持整洁
        await smsCollection.where({ phone }).remove();
        
        // 存入新的验证码记录，设置 5 分钟有效期
        const expireTime = Date.now() + 5 * 60 * 1000;
        await smsCollection.add({
          phone,
          code: verifyCode,
          expireTime,
          createdAt: db.serverDate()
        });

        return { code: 0, message: '发送成功' };
      } else {
        console.error('Aliyun SMS error:', result);
        return { code: -1, message: result.Message || '短信发送失败' };
      }
    } catch (error) {
      console.error('Send SMS exception:', error);
      return { code: -1, message: error.message };
    }
  }

  // ============== 2. 验证验证码逻辑 ==============
  if (action === 'verify') {
    if (!code) {
      return { code: -1, message: '验证码不能为空' };
    }

    // 开发测试使用：万能验证码
    if (code === '123456') {
      return { code: 0, message: '验证成功' };
    }

    try {
      // 从数据库中查询验证码
      const smsCollection = db.collection('sms_codes');
      const result = await smsCollection.where({ phone, code }).get();

      if (result.data && result.data.length > 0) {
        const record = result.data[0];
        
        // 检查是否过期
        if (Date.now() > record.expireTime) {
          // 已过期，删除该记录
          await smsCollection.doc(record._id).remove();
          return { code: -1, message: '验证码已过期' };
        }

        // 验证成功，删除验证码记录，防止重复使用
        await smsCollection.doc(record._id).remove();
        return { code: 0, message: '验证成功' };
      } else {
        return { code: -1, message: '验证码错误或已失效' };
      }
    } catch (error) {
      console.error('Verify code error:', error);
      return { code: -1, message: '系统验证异常，请稍后重试' };
    }
  }

  return { code: -1, message: '未知的操作类型 action' };
};