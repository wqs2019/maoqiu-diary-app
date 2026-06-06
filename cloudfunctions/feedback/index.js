const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const usersCollection = db.collection('users');
const adminCollection = db.collection('admin_list');
const diariesCollection = db.collection('diaries');
const feedbacksCollection = db.collection('feedbacks');
const notificationsCollection = db.collection('notifications');
const REVIEWABLE_FEEDBACK_TYPE = 'report_user';
const REVIEWABLE_STATUSES = ['pending', 'processing', 'resolved', 'rejected'];

const sendPushNotification = (expoPushToken, title, body, data = {}) =>
  new Promise((resolve, reject) => {
    if (!expoPushToken) {
      resolve();
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    const req = https.request(
      {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => resolve(responseData));
      }
    );

    req.on('error', (error) => {
      console.error('Push notification error:', error);
      reject(error);
    });

    req.write(JSON.stringify(message));
    req.end();
  });

const getDocData = (result) =>
  result && result.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;

const getUserById = async (userId) => {
  if (!userId) {
    return null;
  }

  const result = await usersCollection.doc(userId).get();
  return getDocData(result);
};

const getDiaryById = async (diaryId) => {
  if (!diaryId) {
    return null;
  }

  const result = await diariesCollection.doc(diaryId).get();
  return getDocData(result);
};

const isAdminUser = async (userId) => {
  const user = await getUserById(userId);
  if (!user || !user.phone) {
    return false;
  }

  const adminResult = await adminCollection.where({ phone: user.phone }).limit(1).get();
  return !!(adminResult.data && adminResult.data.length > 0);
};

const buildUserSnapshot = (user) => ({
  _id: user && user._id ? user._id : '',
  nickname: user && user.nickname ? user.nickname : '',
  avatar: user && user.avatar ? user.avatar : '',
  phone: user && user.phone ? user.phone : '',
});

const buildDiarySnapshot = (diary) => ({
  _id: diary && diary._id ? diary._id : '',
  title: diary && diary.title ? diary.title : '',
  content: diary && diary.content ? String(diary.content).slice(0, 120) : '',
  mediaCount: diary && Array.isArray(diary.media) ? diary.media.length : 0,
});

const buildReviewFilter = (status = 'pending') => {
  const filter = {
    type: REVIEWABLE_FEEDBACK_TYPE,
  };

  if (status === 'pending') {
    filter.status = db.command.in(['pending', 'processing']);
  } else if (status && status !== 'all') {
    filter.status = status;
  }

  return filter;
};

const buildReviewResultNotification = ({ feedback, status, reviewNote }) => {
  if (feedback.source === 'diary_recheck' && feedback.targetDiaryId) {
    const diaryTitle =
      (feedback.targetDiarySnapshot && feedback.targetDiarySnapshot.title) || '你的笔记';
    const noteText = reviewNote ? ` 处理说明：${reviewNote}` : '';

    if (status === 'resolved') {
      return {
        title: '你的笔记已恢复展示',
        content: `你修改后的笔记「${diaryTitle}」已通过复审，现已恢复在圈子里展示。${noteText}`,
      };
    }

    if (status === 'rejected') {
      return {
        title: '你的笔记仍需继续整改',
        content: `你修改后的笔记「${diaryTitle}」复审未通过，当前仍保持违规下架状态。${noteText}`,
      };
    }
  }

  if (feedback.targetDiaryId) {
    const diaryTitle =
      (feedback.targetDiarySnapshot && feedback.targetDiarySnapshot.title) || '该笔记';
    const reviewerName = '毛球管理员';
    const noteText = reviewNote ? ` 处理说明：${reviewNote}` : '';

    if (status === 'resolved') {
      return {
        title: '你举报的笔记已处理',
        content: `${reviewerName} 已处理你举报的笔记「${diaryTitle}」，感谢你的反馈。${noteText}`,
      };
    }

    if (status === 'rejected') {
      return {
        title: '你举报的笔记未通过',
        content: `${reviewerName} 已复核你举报的笔记「${diaryTitle}」，当前结果为未通过。${noteText}`,
      };
    }
  }

  const targetName =
    (feedback.targetSnapshot && (feedback.targetSnapshot.nickname || feedback.targetSnapshot.phone)) ||
    feedback.targetUserId ||
    '该用户';
  const reviewerName = '毛球管理员';
  const noteText = reviewNote ? ` 处理说明：${reviewNote}` : '';

  if (status === 'resolved') {
    return {
      title: '你提交的举报已处理',
      content: `${reviewerName} 已处理你对「${targetName}」的举报，感谢你的反馈。${noteText}`,
    };
  }

  if (status === 'rejected') {
    return {
      title: '你提交的举报未通过',
      content: `${reviewerName} 已复核你对「${targetName}」的举报，当前结果为未通过。${noteText}`,
    };
  }

  return null;
};

const buildDiaryOwnerModerationNotification = ({ feedback, reviewNote }) => {
  if (!feedback || !feedback.targetDiaryId || feedback.source === 'diary_recheck') {
    return null;
  }

  const diaryTitle = (feedback.targetDiarySnapshot && feedback.targetDiarySnapshot.title) || '你的笔记';
  const noteText = reviewNote ? ` 处理说明：${reviewNote}` : '';

  return {
    title: '你的笔记已被标记违规',
    content: `由于举报核实属实，你的笔记「${diaryTitle}」已停止在圈子里展示。你仍可查看并修改，修改后系统会再次通知管理员复审。${noteText}`,
  };
};

const sendReviewResultNotificationToReporter = async ({ feedback, adminUser, status, reviewNote }) => {
  if (!feedback || !feedback.userId || !['resolved', 'rejected'].includes(status)) {
    return { success: true, sent: false };
  }

  const notificationPayload = buildReviewResultNotification({
    feedback,
    status,
    reviewNote,
  });

  if (!notificationPayload) {
    return { success: true, sent: false };
  }

  await notificationsCollection.add({
    receiverId: feedback.userId,
    senderId: adminUser && adminUser._id ? adminUser._id : '',
    type: 'system',
    title: notificationPayload.title,
    content: notificationPayload.content,
    extraData: {
      feedbackId: feedback._id || '',
      targetUserId: feedback.targetUserId || '',
      reportReason: feedback.reportReason || 'other',
      reviewStatus: status,
      source: 'report_review_result',
    },
    isRead: false,
    createdAt: db.serverDate(),
  });

  return { success: true, sent: true };
};

const sendDiaryOwnerModerationNotification = async ({ feedback, adminUser, status, reviewNote }) => {
  if (!feedback || !feedback.targetDiaryId || !feedback.targetUserId || status !== 'resolved') {
    return { success: true, sent: false };
  }

  const notificationPayload = buildDiaryOwnerModerationNotification({
    feedback,
    reviewNote,
  });

  if (!notificationPayload) {
    return { success: true, sent: false };
  }

  await notificationsCollection.add({
    receiverId: feedback.targetUserId,
    senderId: adminUser && adminUser._id ? adminUser._id : '',
    type: 'system',
    title: notificationPayload.title,
    content: notificationPayload.content,
    extraData: {
      feedbackId: feedback._id || '',
      targetDiaryId: feedback.targetDiaryId || '',
      reviewStatus: status,
      source: 'diary_moderation_result',
      screen: 'DiaryDetail',
    },
    isRead: false,
    createdAt: db.serverDate(),
  });

  return { success: true, sent: true };
};

const getAdminUsers = async () => {
  const adminResult = await adminCollection.get();
  const adminPhones = [...new Set((adminResult.data || []).map((item) => item.phone).filter(Boolean))];

  if (adminPhones.length === 0) {
    return [];
  }

  const usersResult = await usersCollection
    .where({
      phone: db.command.in(adminPhones),
    })
    .field({
      _id: true,
      phone: true,
      nickname: true,
      pushToken: true,
    })
    .get();

  return usersResult.data || [];
};

const sendAdminReportNotifications = async ({
  feedbackId,
  reporterUser,
  targetUserId,
  targetDiaryId,
  reportReason,
  targetSnapshot,
  targetDiarySnapshot,
  source,
}) => {
  const adminUsers = await getAdminUsers();
  if (adminUsers.length === 0) {
    return { success: true, count: 0 };
  }

  const reporterName =
    (reporterUser && (reporterUser.nickname || reporterUser.phone)) || '某位用户';
  const targetName =
    (targetSnapshot && (targetSnapshot.nickname || targetSnapshot.phone)) || targetUserId || '某位用户';
  const diaryTitle =
    (targetDiarySnapshot && targetDiarySnapshot.title) || '该笔记';
  const isDiaryRecheck = source === 'diary_recheck';
  const title = isDiaryRecheck ? '收到新的笔记复审申请' : '收到新的用户举报';
  const content = isDiaryRecheck
    ? `「${targetName}」修改了违规笔记「${diaryTitle}」，请尽快前往内容审核复审。`
    : targetDiaryId
      ? `「${reporterName}」举报了「${targetName}」的笔记「${diaryTitle}」，请尽快前往内容审核处理。`
      : `「${reporterName}」举报了「${targetName}」，请尽快前往内容审核处理。`;
  const notifications = adminUsers
    .filter((adminUser) => adminUser._id && adminUser._id !== (reporterUser && reporterUser._id))
    .map((adminUser) => ({
      receiverId: adminUser._id,
      senderId: reporterUser && reporterUser._id ? reporterUser._id : '',
      type: 'system',
      title,
      content,
      extraData: {
        feedbackId,
        targetUserId: targetUserId || '',
        targetDiaryId: targetDiaryId || '',
        reportReason: reportReason || 'other',
        source: source || 'report_user',
        screen: 'AdminModeration',
      },
      isRead: false,
      createdAt: db.serverDate(),
    }));

  if (notifications.length === 0) {
    return { success: true, count: 0 };
  }

  await Promise.all(notifications.map((notification) => notificationsCollection.add(notification)));

  const pushTargets = adminUsers.filter(
    (adminUser) => adminUser._id && adminUser._id !== (reporterUser && reporterUser._id) && adminUser.pushToken
  );

  if (pushTargets.length > 0) {
    await Promise.allSettled(
      pushTargets.map((adminUser) =>
        sendPushNotification(
          adminUser.pushToken,
          title,
          content,
          {
            type: isDiaryRecheck ? 'admin_recheck' : 'admin_review',
            feedbackId,
            targetUserId: targetUserId || '',
            targetDiaryId: targetDiaryId || '',
            reportReason: reportReason || 'other',
            screen: 'AdminModeration',
          }
        )
      )
    );
  }

  return { success: true, count: notifications.length, pushCount: pushTargets.length };
};

const applyDiaryModerationResult = async ({ feedbackId, feedback, status, reviewNote }) => {
  if (!feedback || !feedback.targetDiaryId || !['resolved', 'rejected'].includes(status)) {
    return { success: true, updated: false };
  }

  const diary = await getDiaryById(feedback.targetDiaryId);
  if (!diary) {
    return { success: false, updated: false, message: '被举报笔记不存在' };
  }

  if (feedback.source === 'diary_recheck') {
    if (status === 'resolved') {
      await diariesCollection.doc(feedback.targetDiaryId).update({
        moderationStatus: 'normal',
        violationReason: '',
        violationFeedbackId: '',
        violationMarkedAt: null,
        reReviewRequestedAt: null,
        updatedAt: db.serverDate(),
      });
      return { success: true, updated: true };
    }

    await diariesCollection.doc(feedback.targetDiaryId).update({
      moderationStatus: 'violation',
      violationReason: reviewNote,
      violationFeedbackId: feedbackId,
      violationMarkedAt: db.serverDate(),
      reReviewRequestedAt: null,
      updatedAt: db.serverDate(),
    });
    return { success: true, updated: true };
  }

  if (status === 'resolved') {
    await diariesCollection.doc(feedback.targetDiaryId).update({
      moderationStatus: 'violation',
      violationReason: reviewNote,
      violationFeedbackId: feedbackId,
      violationMarkedAt: db.serverDate(),
      reReviewRequestedAt: null,
      updatedAt: db.serverDate(),
    });
    return { success: true, updated: true };
  }

  return { success: true, updated: false };
};

const fetchUsersMap = async (userIds) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const usersMap = {};
  const MAX_LIMIT = 100;

  for (let i = 0; i < uniqueIds.length; i += MAX_LIMIT) {
    const batchIds = uniqueIds.slice(i, i + MAX_LIMIT);
    const result = await usersCollection
      .where({
        _id: db.command.in(batchIds),
      })
      .field({
        _id: true,
        nickname: true,
        avatar: true,
        phone: true,
      })
      .get();

    const users = result.data || [];
    users.forEach((user) => {
      usersMap[user._id] = user;
    });
  }

  return usersMap;
};

const enrichFeedbackItem = (item, usersMap) => {
  const reporter = usersMap[item.userId];
  const target = usersMap[item.targetUserId];
  const reviewer = usersMap[item.reviewedBy];

  return {
    ...item,
    reporterSnapshot: reporter ? buildUserSnapshot(reporter) : null,
    targetSnapshot: item.targetSnapshot || (target ? buildUserSnapshot(target) : null),
    blockerSnapshot: item.blockerSnapshot || null,
    reviewerSnapshot: reviewer ? buildUserSnapshot(reviewer) : null,
  };
};

// 添加反馈
const addFeedback = async (data) => {
  try {
    const {
      userId,
      type,
      content,
      contact,
      media,
      targetUserId,
      targetDiaryId,
      reportReason,
      targetSnapshot,
      targetDiarySnapshot,
      source,
    } = data;

    if (!userId || !type || !content) {
      return { success: false, message: '缺少必要参数' };
    }

    if (type === 'report_user') {
      if (!targetUserId || !reportReason) {
        return { success: false, message: '举报信息不完整' };
      }

      if (userId === targetUserId) {
        return { success: false, message: '不能举报自己' };
      }
    }

    let diary = null;
    if (targetDiaryId) {
      diary = await getDiaryById(targetDiaryId);
      if (!diary) {
        return { success: false, message: '被举报笔记不存在' };
      }

      if (targetUserId && diary.userId !== targetUserId) {
        return { success: false, message: '被举报笔记与目标用户不匹配' };
      }
    }

    const result = await feedbacksCollection.add({
      userId,
      type,
      content,
      contact: contact || '',
      media: media || [],
      targetUserId: targetUserId || '',
      targetDiaryId: targetDiaryId || '',
      reportReason: reportReason || '',
      targetSnapshot: targetSnapshot || null,
      targetDiarySnapshot: targetDiarySnapshot || (diary ? buildDiarySnapshot(diary) : null),
      source: source || (targetDiaryId ? 'diary_report' : 'user_report'),
      status: 'pending', // 默认状态为待处理
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    if (type === 'report_user') {
      try {
        const reporterUser = await getUserById(userId);
        await sendAdminReportNotifications({
          feedbackId: result.id || result._id,
          reporterUser,
          targetUserId,
          targetDiaryId,
          reportReason,
          targetSnapshot,
          targetDiarySnapshot: targetDiarySnapshot || (diary ? buildDiarySnapshot(diary) : null),
          source: source || (targetDiaryId ? 'diary_report' : 'user_report'),
        });
      } catch (notifyError) {
        console.error('Send admin report notifications error:', notifyError);
      }
    }

    return {
      success: true,
      data: {
        _id: result.id || result._id,
        ...data,
        status: 'pending',
      },
    };
  } catch (error) {
    console.error('Add feedback error:', error);
    return { success: false, message: '添加反馈失败', error: error.message };
  }
};

const adminListFeedbacks = async (data) => {
  try {
    const { adminUserId, page = 1, pageSize = 20, status = 'pending' } = data;

    if (!adminUserId) {
      return { success: false, message: '缺少管理员信息' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无权限查看审核列表' };
    }

    const query = feedbacksCollection.where(buildReviewFilter(status));
    const skip = (page - 1) * pageSize;
    const result = await query.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get();
    const countResult = await query.count();

    const list = Array.isArray(result.data) ? result.data : [];
    const usersMap = await fetchUsersMap(
      list.flatMap((item) => [item.userId, item.targetUserId, item.reviewedBy])
    );

    return {
      success: true,
      data: {
        list: list.map((item) => enrichFeedbackItem(item, usersMap)),
        total: countResult.total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error('Admin list feedbacks error:', error);
    return { success: false, message: '获取审核列表失败', error: error.message };
  }
};

const adminGetPendingCount = async (data) => {
  try {
    const { adminUserId } = data;

    if (!adminUserId) {
      return { success: false, message: '缺少管理员信息' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无权限查看待处理数量' };
    }

    const countResult = await feedbacksCollection.where(buildReviewFilter('pending')).count();
    return {
      success: true,
      data: countResult.total || 0,
    };
  } catch (error) {
    console.error('Admin get pending count error:', error);
    return { success: false, message: '获取待处理数量失败', error: error.message };
  }
};

const adminGetFeedbackDetail = async (data) => {
  try {
    const { adminUserId, feedbackId } = data;

    if (!adminUserId || !feedbackId) {
      return { success: false, message: '缺少审核记录参数' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无权限查看审核记录' };
    }

    const feedback = getDocData(await feedbacksCollection.doc(feedbackId).get());
    if (!feedback || feedback.type !== REVIEWABLE_FEEDBACK_TYPE) {
      return { success: false, message: '审核记录不存在' };
    }

    const usersMap = await fetchUsersMap([feedback.userId, feedback.targetUserId, feedback.reviewedBy]);
    return {
      success: true,
      data: enrichFeedbackItem(feedback, usersMap),
    };
  } catch (error) {
    console.error('Admin get feedback detail error:', error);
    return { success: false, message: '获取审核记录详情失败', error: error.message };
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

const adminUpdateFeedback = async (data) => {
  try {
    const { adminUserId, feedbackId, status, reviewNote = '' } = data;

    if (!adminUserId || !feedbackId || !status) {
      return { success: false, message: '审核参数不完整' };
    }

    if (!REVIEWABLE_STATUSES.includes(status)) {
      return { success: false, message: '审核状态不合法' };
    }

    if (['resolved', 'rejected'].includes(status) && !String(reviewNote || '').trim()) {
      return { success: false, message: '已处理或已驳回时必须填写处理原因' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无权限审核该记录' };
    }

    const feedback = getDocData(await feedbacksCollection.doc(feedbackId).get());
    if (!feedback) {
      return { success: false, message: '审核记录不存在' };
    }

    const adminUser = await getUserById(adminUserId);

    const moderationResult = await applyDiaryModerationResult({
      feedbackId,
      feedback: {
        ...feedback,
        _id: feedbackId,
      },
      status,
      reviewNote,
    });

    if (!moderationResult.success) {
      return { success: false, message: moderationResult.message || '更新笔记违规状态失败' };
    }

    await feedbacksCollection.doc(feedbackId).update({
      status,
      reviewNote,
      reviewedBy: adminUserId,
      reviewedAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    if (['resolved', 'rejected'].includes(status)) {
      try {
        await sendReviewResultNotificationToReporter({
          feedback: {
            ...feedback,
            _id: feedbackId,
          },
          adminUser,
          status,
          reviewNote,
        });

        await sendDiaryOwnerModerationNotification({
          feedback: {
            ...feedback,
            _id: feedbackId,
          },
          adminUser,
          status,
          reviewNote,
        });
      } catch (notifyError) {
        console.error('Send review result notification error:', notifyError);
      }
    }

    return {
      success: true,
      message: '审核状态已更新',
    };
  } catch (error) {
    console.error('Admin update feedback error:', error);
    return { success: false, message: '更新审核状态失败', error: error.message };
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
    case 'adminList':
      return await adminListFeedbacks(data);
    case 'adminPendingCount':
      return await adminGetPendingCount(data);
    case 'adminDetail':
      return await adminGetFeedbackDetail(data);
    case 'delete':
      return await deleteFeedback(data);
    case 'update':
      return await updateFeedback(data);
    case 'adminUpdate':
      return await adminUpdateFeedback(data);
    default:
      return {
        success: false,
        message: '未知的操作类型 action',
      };
  }
};
