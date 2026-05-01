// Cloud function for notebook management
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

// 创建日记本
const createNotebook = async (data) => {
  try {
    const { userId, name, isDefault, cover } = data;

    if (!userId || !name) {
      return { success: false, message: '用户ID或名称不能为空' };
    }

    const notebookData = {
      userId,
      name,
      isDefault: isDefault || false,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };
    
    if (cover) {
      notebookData.cover = cover;
    }

    const result = await db.collection('notebooks').add(notebookData);

    return {
      success: true,
      data: {
        _id: result.id || result._id,
        userId,
        name,
        isDefault: isDefault || false,
        cover,
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

    const _ = db.command;
    const result = await db
      .collection('notebooks')
      .where({
        userId,
        isDelete: _.neq(true) // 查询 isDelete 不为 true 的数据（即 false 或不存在）
      })
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
    const { _id, name, cover } = data;

    if (!_id || !name) {
      return { success: false, message: '日记本 ID 或名称不能为空' };
    }

    const updateData = {
      name,
      updatedAt: db.serverDate(),
    };
    
    if (cover !== undefined) {
      updateData.cover = cover;
    }

    await db.collection('notebooks').doc(_id).update(updateData);

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

    const notebook = await db.collection('notebooks').doc(_id).get();
    if (notebook.data && notebook.data.length > 0 && notebook.data[0].isDefault) {
      return { success: false, message: '默认日记本不允许删除' };
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

// 标记用户所有日记本为已注销 (isDelete = true)
const deactivateUserNotebooks = async (data) => {
  try {
    const { userId } = data;

    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    await db.collection('notebooks').where({ userId }).update({
      isDelete: true,
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      message: '用户日记本已注销',
    };
  } catch (error) {
    console.error('Deactivate notebooks error:', error);
    return { success: false, message: '注销用户日记本失败', error: error.message };
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
    case 'deactivateUserNotebooks':
      return await deactivateUserNotebooks(data);
    default:
      return { success: false, message: '无效的操作' };
  }
};
