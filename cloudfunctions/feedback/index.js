const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();

// 添加反馈
const addFeedback = async (data) => {
  try {
    const { userId, type, content, contact } = data;

    if (!userId || !type || !content) {
      return { success: false, message: '缺少必要参数' };
    }

    const result = await db.collection('feedbacks').add({
      userId,
      type,
      content,
      contact: contact || '',
      status: 'pending', // 默认状态为待处理
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: {
        _id: result._id,
        ...data,
        status: 'pending',
      },
    };
  } catch (error) {
    console.error('Add feedback error:', error);
    return { success: false, message: '添加反馈失败', error: error.message };
  }
};

// 获取反馈列表 (可以给管理员用，或者用户查看自己的反馈)
const listFeedbacks = async (data) => {
  try {
    const { userId, page = 1, pageSize = 20 } = data;
    
    let query = db.collection('feedbacks');
    
    // 如果传了 userId，就只查他自己的；如果没传（比如管理员），就查所有
    if (userId) {
      query = query.where({ userId });
    }

    const skip = (page - 1) * pageSize;
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    const countResult = await query.count();

    return {
      success: true,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error('List feedbacks error:', error);
    return { success: false, message: '获取反馈列表失败', error: error.message };
  }
};

// 删除反馈 (用户撤回或管理员删除)
const deleteFeedback = async (data) => {
  try {
    const { _id, userId } = data;

    if (!_id) {
      return { success: false, message: '缺少反馈ID' };
    }

    // 安全起见，如果是用户操作，只能删除自己的
    let query = db.collection('feedbacks').doc(_id);
    const feedback = await query.get();
    
    if (!feedback.data || feedback.data.length === 0) {
       return { success: false, message: '反馈不存在' };
    }
    
    // 取出真实数据
    const fbData = Array.isArray(feedback.data) ? feedback.data[0] : feedback.data;

    if (userId && fbData.userId !== userId) {
      return { success: false, message: '无权删除该反馈' };
    }

    await query.remove();

    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('Delete feedback error:', error);
    return { success: false, message: '删除反馈失败', error: error.message };
  }
};

// 更新反馈 (比如管理员处理完毕修改状态)
const updateFeedback = async (data) => {
  try {
    const { _id, ...updateData } = data;

    if (!_id) {
      return { success: false, message: '缺少反馈ID' };
    }

    await db.collection('feedbacks').doc(_id).update({
      ...updateData,
      updatedAt: db.serverDate(),
    });

    return { success: true, message: '更新成功' };
  } catch (error) {
    console.error('Update feedback error:', error);
    return { success: false, message: '更新反馈失败', error: error.message };
  }
};

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'add':
      return await addFeedback(data);
    case 'list':
      return await listFeedbacks(data);
    case 'delete':
      return await deleteFeedback(data);
    case 'update':
      return await updateFeedback(data);
    default:
      return {
        success: false,
        message: '未知的操作类型 action',
      };
  }
};
