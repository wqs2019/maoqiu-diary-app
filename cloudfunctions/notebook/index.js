// Cloud function for notebook management
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

// 创建日记本
const createNotebook = async (data) => {
  try {
    const { userId, name, isDefault } = data;

    if (!userId || !name) {
      return { success: false, message: '用户ID或名称不能为空' };
    }

    const result = await db.collection('notebooks').add({
      userId,
      name,
      isDefault: isDefault || false,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: {
        _id: result._id,
        userId,
        name,
        isDefault: isDefault || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Create notebook error:', error);
    return { success: false, message: '创建日记本失败', error: error.message };
  }
};

// 获取日记本列表
const getNotebookList = async (data) => {
  try {
    const { userId } = data;

    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    const result = await db
      .collection('notebooks')
      .where({ userId })
      .orderBy('createdAt', 'asc')
      .get();

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Get notebook list error:', error);
    return { success: false, message: '获取日记本列表失败', error: error.message };
  }
};

// 更新日记本
const updateNotebook = async (data) => {
  try {
    const { _id, name } = data;

    if (!_id || !name) {
      return { success: false, message: '日记本 ID 或名称不能为空' };
    }

    await db.collection('notebooks').doc(_id).update({
      name,
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      message: '更新成功',
    };
  } catch (error) {
    console.error('Update notebook error:', error);
    return { success: false, message: '更新日记本失败', error: error.message };
  }
};

// 删除日记本
const deleteNotebook = async (data) => {
  try {
    const { _id } = data;

    if (!_id) {
      return { success: false, message: '日记本 ID 不能为空' };
    }

    await db.collection('notebooks').doc(_id).remove();

    return {
      success: true,
      message: '删除成功',
    };
  } catch (error) {
    console.error('Delete notebook error:', error);
    return { success: false, message: '删除日记本失败', error: error.message };
  }
};

// 导出主函数
exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'create':
      return await createNotebook(data);
    case 'list':
      return await getNotebookList(data);
    case 'update':
      return await updateNotebook(data);
    case 'delete':
      return await deleteNotebook(data);
    default:
      return { success: false, message: '无效的操作' };
  }
};
