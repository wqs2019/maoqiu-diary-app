const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

// 发送 Expo 推送通知
const sendPushNotification = (expoPushToken, title, body, data = {}) => {
  return new Promise((resolve, reject) => {
    if (!expoPushToken) {
      resolve();
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    };

    const req = https.request({
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'application/json',
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => { resolve(responseData); });
    });

    req.on('error', (e) => {
      console.error('Push notification error:', e);
      reject(e);
    });

    req.write(JSON.stringify(message));
    req.end();
  });
};

// 创建日记本
const createNotebook = async (data) => {
  try {
    const { userId, name, isDefault, cover, desc, type, inviteePhone } = data;

    if (!userId || !name) {
      return { success: false, message: '用户ID或名称不能为空' };
    }

    const notebookData = {
      userId,
      name,
      desc,
      isDefault: isDefault || false,
      type: type || 'private',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };
    
    if (type === 'shared') {
      notebookData.status = 'pending';
    }

    if (cover) {
      notebookData.cover = cover;
    }

    const result = await db.collection('notebooks').add(notebookData);
    const notebookId = result.id || result._id;

    if (type === 'shared' && inviteePhone) {
      // get inviter info to record their phone
      const inviterRes = await db.collection('users').doc(userId).get();
      const inviterPhone = inviterRes.data[0]?.phone || '';
      const inviterName = inviterRes.data[0]?.nickname || '有人';

      // 1. Create invitation
      const invitationResult = await db.collection('invitations').add({
        notebookId,
        inviterId: userId,
        inviterPhone, // 记录邀请人的手机号
        inviteePhone,
        status: 'pending',
        createdAt: db.serverDate(),
        expiresAt: db.serverDate({ offset: 7 * 24 * 60 * 60 * 1000 }) // 7 days later
      });

      // 2. Find invitee user by phone to create notification
      const inviteeRes = await db.collection('users').where({ phone: inviteePhone }).get();
      if (inviteeRes.data && inviteeRes.data.length > 0) {
        const inviteeUser = inviteeRes.data[0];
        const inviteeId = inviteeUser._id;
        
        const title = '日记本共享邀请';
        const body = `「${inviterName}」邀请你共写日记本《${name}》`;

        await db.collection('notifications').add({
          receiverId: inviteeId,
          senderId: userId,
          type: 'invite_shared_notebook',
          title,
          content: body,
          relatedId: invitationResult.id || invitationResult._id,
          extraData: { notebookId, notebookName: name },
          isRead: false,
          actionStatus: 'pending',
          createdAt: db.serverDate()
        });

        // 触发 App 推送通知
        if (inviteeUser.pushToken) {
          try {
            await sendPushNotification(inviteeUser.pushToken, title, body, {
              type: 'invite_shared_notebook',
              notebookId
            });
          } catch (e) {
            console.error('Failed to send push notification to invitee:', e);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        _id: notebookId,
        userId,
        name,
        desc,
        isDefault: isDefault || false,
        type: type || 'private',
        status: type === 'shared' ? 'pending' : undefined,
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
      .where(
        _.and([
          { isDelete: _.neq(true) }, // 未删除
          _.or([
            { userId }, // 自己创建的
            { partnerId: userId } // 受邀者且已绑定（注意：包含 pending 状态，前端过滤）
          ])
        ])
      )
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
    const { _id, name, cover, desc } = data;

    if (!_id || !name) {
      return { success: false, message: '日记本 ID 或名称不能为空' };
    }

    const updateData = {
      name,
      desc,
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

    // 删除日记本下的所有日记
    await db.collection('diaries').where({ notebookId: _id }).remove();

    // 删除日记本相关的邀请
    await db.collection('invitations').where({ notebookId: _id }).remove();

    // 删除日记本
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

// 响应邀请
const respondInvitation = async (data) => {
  try {
    const { invitationId, action, userId } = data; // action: 'accept' | 'reject'
    if (!invitationId || !action || !userId) {
      return { success: false, message: '参数缺失' };
    }

    const invitationRes = await db.collection('invitations').doc(invitationId).get();
    if (!invitationRes.data || invitationRes.data.length === 0) {
      return { success: false, message: '邀请不存在' };
    }
    const invitation = invitationRes.data[0];

    if (invitation.status !== 'pending') {
      return { success: false, message: '邀请已被处理' };
    }

    const notebookId = invitation.notebookId;

    if (action === 'accept') {
      // 1. Update invitation status
      await db.collection('invitations').doc(invitationId).update({
        status: 'accepted',
        updatedAt: db.serverDate()
      });

      // 1.5 Update corresponding notification status
      await db.collection('notifications').where({ relatedId: invitationId, receiverId: userId }).update({
        actionStatus: 'accepted',
        isRead: true,
        updatedAt: db.serverDate()
      });

      // 2. Update notebook
      await db.collection('notebooks').doc(notebookId).update({
        partnerId: userId,
        status: 'active',
        updatedAt: db.serverDate()
      });

      // 3. Notify inviter
      const userRes = await db.collection('users').doc(userId).get();
      const userName = userRes.data[0]?.nickname || '对方';
      const title = '共享邀请已接受';
      const body = `「${userName}」接受了你的日记本共享邀请`;

      await db.collection('notifications').add({
        receiverId: invitation.inviterId,
        senderId: userId,
        type: 'system',
        title,
        content: body,
        extraData: { notebookId },
        isRead: false,
        createdAt: db.serverDate()
      });

      // 触发 App 推送通知
      const inviterRes = await db.collection('users').doc(invitation.inviterId).get();
      if (inviterRes.data && inviterRes.data.length > 0) {
        const inviterUser = inviterRes.data[0];
        if (inviterUser.pushToken) {
          try {
            await sendPushNotification(inviterUser.pushToken, title, body, {
              type: 'system',
              notebookId
            });
          } catch (e) {
            console.error('Failed to send push notification to inviter (accept):', e);
          }
        }
      }

      return { success: true, message: '已接受邀请' };
    } else if (action === 'reject') {
      // Update invitation status
      await db.collection('invitations').doc(invitationId).update({
        status: 'rejected',
        updatedAt: db.serverDate()
      });

      // Update corresponding notification status
      await db.collection('notifications').where({ relatedId: invitationId, receiverId: userId }).update({
        actionStatus: 'rejected',
        isRead: true,
        updatedAt: db.serverDate()
      });

      // Update notebook status to unbound so inviter can invite again
      await db.collection('notebooks').doc(notebookId).update({
        status: 'unbound',
        updatedAt: db.serverDate()
      });

      // Notify inviter about rejection
      const userRes = await db.collection('users').doc(userId).get();
      const userName = userRes.data[0]?.nickname || '对方';
      const title = '共享邀请已拒绝';
      const body = `「${userName}」拒绝了你的日记本共享邀请`;

      await db.collection('notifications').add({
        receiverId: invitation.inviterId,
        senderId: userId,
        type: 'system',
        title,
        content: body,
        extraData: { notebookId },
        isRead: false,
        createdAt: db.serverDate()
      });

      // 触发 App 推送通知
      const inviterRes = await db.collection('users').doc(invitation.inviterId).get();
      if (inviterRes.data && inviterRes.data.length > 0) {
        const inviterUser = inviterRes.data[0];
        if (inviterUser.pushToken) {
          try {
            await sendPushNotification(inviterUser.pushToken, title, body, {
              type: 'system',
              notebookId
            });
          } catch (e) {
            console.error('Failed to send push notification to inviter (reject):', e);
          }
        }
      }

      return { success: true, message: '已拒绝邀请' };
    }

    return { success: false, message: '无效的操作' };
  } catch (error) {
    console.error('Respond invitation error:', error);
    return { success: false, message: '处理邀请失败', error: error.message };
  }
};

// 解绑共享日记本
const unbindSharedNotebook = async (data) => {
  try {
    const { notebookId, userId } = data;
    if (!notebookId || !userId) {
      return { success: false, message: '参数缺失' };
    }

    const notebookRes = await db.collection('notebooks').doc(notebookId).get();
    if (!notebookRes.data || notebookRes.data.length === 0) {
      return { success: false, message: '日记本不存在' };
    }
    const notebook = notebookRes.data[0];

    if (notebook.userId !== userId && notebook.partnerId !== userId) {
      return { success: false, message: '无权操作' };
    }

    await db.collection('notebooks').doc(notebookId).update({
      status: 'unbound',
      partnerId: '', // 清除受邀者信息
      updatedAt: db.serverDate()
    });

    // Notify the other party
    const otherId = notebook.userId === userId ? notebook.partnerId : notebook.userId;
    if (otherId) {
      const userRes = await db.collection('users').doc(userId).get();
      const userName = userRes.data[0]?.nickname || '对方';
      const title = '日记本已解绑';
      const content = `「${userName}」解除了与你的日记本《${notebook.name}》的共享关系`;
      
      await db.collection('notifications').add({
        receiverId: otherId,
        senderId: userId,
        type: 'unbind_shared_notebook',
        title,
        content,
        extraData: { notebookId },
        isRead: false,
        createdAt: db.serverDate()
      });

      // 触发 App 推送通知
      const otherUserRes = await db.collection('users').doc(otherId).get();
      if (otherUserRes.data && otherUserRes.data.length > 0) {
        const otherUser = otherUserRes.data[0];
        if (otherUser.pushToken) {
          try {
            await sendPushNotification(otherUser.pushToken, title, content, {
              type: 'unbind_shared_notebook',
              notebookId
            });
          } catch (e) {
            console.error('Failed to send push notification for unbind:', e);
          }
        }
      }
    }

    return { success: true, message: '解绑成功' };
  } catch (error) {
    console.error('Unbind notebook error:', error);
    return { success: false, message: '解绑失败', error: error.message };
  }
};

// 获取我的邀请
const getInvitations = async (data) => {
  try {
    const { userId } = data;
    if (!userId) {
      return { success: false, message: '用户ID不能为空' };
    }

    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const phone = userRes.data[0].phone;

    const _ = db.command;
    const result = await db.collection('invitations').where({
      inviteePhone: phone,
      status: 'pending'
    }).orderBy('createdAt', 'desc').get();

    // 填充邀请人和日记本信息
    const invitations = result.data || [];
    for (let inv of invitations) {
      const inviterRes = await db.collection('users').doc(inv.inviterId).get();
      inv.inviterName = inviterRes.data[0]?.nickname || '某人';
      
      const notebookRes = await db.collection('notebooks').doc(inv.notebookId).get();
      inv.notebookName = notebookRes.data[0]?.name || '未知日记本';
    }

    return { success: true, data: invitations };
  } catch (error) {
    console.error('Get invitations error:', error);
    return { success: false, message: '获取邀请失败', error: error.message };
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
    case 'respondInvitation':
      return await respondInvitation(data);
    case 'unbindSharedNotebook':
      return await unbindSharedNotebook(data);
    case 'getInvitations':
      return await getInvitations(data);
    default:
      return { success: false, message: '无效的操作' };
  }
};
