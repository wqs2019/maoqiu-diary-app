const cloud = require('@cloudbase/node-sdk');

const APP_CONFIG_KEY = 'global_app_config';

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const usersCollection = db.collection('users');
const adminCollection = db.collection('admin_list');
const configCollection = db.collection('config');

const getConfigDoc = async () => {
  const keyedResult = await configCollection.where({ configKey: APP_CONFIG_KEY }).limit(1).get();
  if (keyedResult.data && keyedResult.data.length > 0) {
    return keyedResult.data[0];
  }

  const fallbackResult = await configCollection.limit(1).get();
  if (fallbackResult.data && fallbackResult.data.length > 0) {
    return fallbackResult.data[0];
  }

  return null;
};

const normalizeConfig = (doc) => ({
  show_ai_chat: doc && doc.show_ai_chat !== undefined ? !!doc.show_ai_chat : true,
  show_circle: doc && doc.show_circle !== undefined ? !!doc.show_circle : true,
  version: doc && typeof doc.version === 'string' ? doc.version : '',
});

const isAdminUser = async (userId) => {
  if (!userId) {
    return false;
  }

  const userResult = await usersCollection.doc(userId).get();
  const user = userResult && userResult.data ? userResult.data[0] : null;
  if (!user || !user.phone) {
    return false;
  }

  const adminResult = await adminCollection.where({ phone: user.phone }).limit(1).get();
  return !!(adminResult.data && adminResult.data.length > 0);
};

const getAppConfig = async () => {
  try {
    const doc = await getConfigDoc();
    return {
      success: true,
      data: {
        docId: doc ? doc._id : null,
        configKey: APP_CONFIG_KEY,
        ...normalizeConfig(doc),
      },
    };
  } catch (error) {
    console.error('Get app config error:', error);
    return {
      success: false,
      message: '获取系统配置失败',
      error: error.message,
    };
  }
};

const updateAppConfig = async (data) => {
  try {
    const { adminUserId, show_ai_chat, show_circle, version } = data || {};

    if (!adminUserId) {
      return { success: false, message: '缺少管理员信息' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无权限更新系统配置' };
    }

    const existingDoc = await getConfigDoc();
    const payload = {
      configKey: APP_CONFIG_KEY,
      show_ai_chat: show_ai_chat !== undefined ? !!show_ai_chat : true,
      show_circle: show_circle !== undefined ? !!show_circle : true,
      version:
        typeof version === 'string'
          ? version.trim()
          : existingDoc && typeof existingDoc.version === 'string'
            ? existingDoc.version
            : '',
      updatedAt: db.serverDate(),
      updatedBy: adminUserId,
    };

    let docId = existingDoc ? existingDoc._id : null;

    if (docId) {
      await configCollection.doc(docId).update(payload);
    } else {
      const result = await configCollection.add({
        ...payload,
        createdAt: db.serverDate(),
      });
      docId = result.id || result._id || null;
    }

    return {
      success: true,
      data: {
        docId,
        configKey: APP_CONFIG_KEY,
        show_ai_chat: payload.show_ai_chat,
        show_circle: payload.show_circle,
        version: payload.version,
      },
    };
  } catch (error) {
    console.error('Update app config error:', error);
    return {
      success: false,
      message: '更新系统配置失败',
      error: error.message,
    };
  }
};

exports.main = async (event) => {
  const { action, data } = event;

  switch (action) {
    case 'get':
      return await getAppConfig();
    case 'update':
      return await updateAppConfig(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
