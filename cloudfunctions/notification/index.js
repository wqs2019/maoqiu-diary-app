const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();
const _ = db.command;

// 获取通知列表
const getNotifications = async (data) => {
  try {
    const { userId, page = 1, pageSize = 20 } = data;

    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    const skip = (page - 1) * pageSize;

    // 先查出当前用户的通知
    const result = await db.collection('notifications')
      .where({ receiverId: userId })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    const notifications = result.data || [];

    // 填充发送者信息 (头像等)
    for (let notif of notifications) {
      if (notif.senderId) {
        const senderRes = await db.collection('users').doc(notif.senderId).get();
        if (senderRes.data && senderRes.data.length > 0) {
          notif.senderInfo = {
            nickname: senderRes.data[0].nickname || '某人',
            avatar: senderRes.data[0].avatar
          };
        }
      }
    }

    // 获取总数
    const countRes = await db.collection('notifications').where({ receiverId: userId }).count();

    return {
      success: true,
      data: {
        list: notifications,
        total: countRes.total,
        page,
        pageSize
      }
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, message: '获取通知失败', error: error.message };
  }
};

// 标记通知为已读
const markNotificationRead = async (data) => {
  try {
    const { userId, notificationIds, markAll = false } = data;

    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    let condition = { receiverId: userId, isRead: false };

    if (!markAll) {
      if (!notificationIds || !notificationIds.length) {
        return { success: false, message: '请提供要标记的通知ID' };
      }
      condition._id = _.in(notificationIds);
    }

    await db.collection('notifications').where(condition).update({
      isRead: true,
      updatedAt: db.serverDate()
    });

    return { success: true, message: '标记成功' };
  } catch (error) {
    console.error('Mark notification read error:', error);
    return { success: false, message: '标记已读失败', error: error.message };
  }
};

// 获取未读通知数量
const getUnreadCount = async (data) => {
  try {
    const { userId } = data;

    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    const result = await db.collection('notifications')
      .where({ receiverId: userId, isRead: false })
      .count();

    return { success: true, data: result.total };
  } catch (error) {
    console.error('Get unread count error:', error);
    return { success: false, message: '获取未读数量失败', error: error.message };
  }
};

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'getNotifications':
      return await getNotifications(data);
    case 'markRead':
      return await markNotificationRead(data);
    case 'getUnreadCount':
      return await getUnreadCount(data);
    default:
      return { success: false, message: '无效的操作' };
  }
};
