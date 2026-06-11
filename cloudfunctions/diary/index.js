// Cloud function for diary management
// Supports create, update, get, delete, list operations

const cloud = require('@cloudbase/node-sdk');
const https = require('https');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();
const _ = db.command;
const REVIEWABLE_FEEDBACK_TYPE = 'report_user';
const HIDDEN_MODERATION_STATUSES = ['violation', 'pending_recheck'];

const usersCollection = db.collection('users');
const adminCollection = db.collection('admin_list');
const diariesCollection = db.collection('diaries');
const feedbacksCollection = db.collection('feedbacks');
const notificationsCollection = db.collection('notifications');

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

const normalizeRelationIds = (items) =>
  Array.isArray(items)
    ? items
        .map((item) => (typeof item === 'string' ? item : item && item.userId))
        .filter((id) => typeof id === 'string' && id)
    : [];

const getUserDoc = async (userId) => {
  if (!userId) return null;
  const result = await usersCollection.doc(userId).get();
  return getDocData(result);
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

const getUserDisplayName = (user, fallback = '有人') =>
  (user && (user.nickname || user.phone)) || fallback;

const getDiaryDisplayText = (diary) => {
  const title = diary && diary.title ? String(diary.title).trim() : '';
  if (title) {
    return title;
  }

  const content = diary && diary.content ? String(diary.content).replace(/\s+/g, ' ').trim() : '';
  if (content) {
    return content.slice(0, 18) + (content.length > 18 ? '...' : '');
  }

  return '这篇日记';
};

const getCommentPreview = (content) => {
  const normalized = content ? String(content).replace(/\s+/g, ' ').trim() : '';
  if (!normalized) {
    return '给你留了一条评论';
  }
  return normalized.slice(0, 26) + (normalized.length > 26 ? '...' : '');
};

const createDiaryInteractionNotification = async ({
  diary,
  senderId,
  type,
  commentContent,
  receiverIds,
  isReply = false,
}) => {
  if (!diary || !diary._id || !diary.userId || !senderId) {
    return;
  }

  const normalizedReceiverIds = [...new Set((receiverIds || [diary.userId]).filter(Boolean))].filter(
    (receiverId) => receiverId !== senderId
  );

  if (normalizedReceiverIds.length === 0) {
    return;
  }

  const [senderUser, ...receiverUsers] = await Promise.all([
    getUserDoc(senderId),
    ...normalizedReceiverIds.map((receiverId) => getUserDoc(receiverId)),
  ]);
  const senderName = getUserDisplayName(senderUser);
  const diaryText = getDiaryDisplayText(diary);
  const title =
    type === 'like'
      ? '有人赞了你的日记'
      : isReply
        ? '有人回复了你的评论'
        : '有人评论了你的日记';
  const content =
    type === 'like'
      ? `「${senderName}」赞了你的日记「${diaryText}」`
      : isReply
        ? `「${senderName}」回复了你的评论：${getCommentPreview(commentContent)}`
        : `「${senderName}」评论了你的日记：${getCommentPreview(commentContent)}`;
  const extraData = {
    diaryId: diary._id,
    diaryTitle: diaryText,
    screen: 'CircleDetail',
    isReply,
  };

  if (type === 'comment') {
    extraData.commentPreview = getCommentPreview(commentContent);
  }

  await Promise.all(
    normalizedReceiverIds.map((receiverId) =>
      notificationsCollection.add({
        receiverId,
        senderId,
        type,
        title,
        content,
        relatedId: diary._id,
        extraData,
        isRead: false,
        createdAt: db.serverDate(),
      })
    )
  );

  await Promise.allSettled(
    receiverUsers
      .filter((receiverUser) => receiverUser && receiverUser.pushToken)
      .map((receiverUser) =>
        sendPushNotification(receiverUser.pushToken, title, content, {
          type,
          relatedId: diary._id,
          diaryId: diary._id,
          screen: 'CircleDetail',
          isReply,
        })
      )
  );
};

const removeUnreadLikeNotification = async ({ diaryId, receiverId, senderId }) => {
  if (!diaryId || !receiverId || !senderId) {
    return;
  }

  await notificationsCollection.where({
    receiverId,
    senderId,
    type: 'like',
    relatedId: diaryId,
    isRead: false,
  }).remove();
};

const isDiaryModeratedHidden = (diary) =>
  !!(diary && HIDDEN_MODERATION_STATUSES.includes(diary.moderationStatus));

const isAdminUser = async (userId) => {
  const user = await getUserDoc(userId);
  if (!user || !user.phone) {
    return false;
  }

  const adminResult = await adminCollection.where({ phone: user.phone }).limit(1).get();
  return !!(adminResult.data && adminResult.data.length > 0);
};

const canBypassDiaryModeration = async (viewerId, diaryOwnerId) => {
  if (!viewerId) {
    return false;
  }

  if (viewerId === diaryOwnerId) {
    return true;
  }

  return isAdminUser(viewerId);
};

const getAdminUsers = async () => {
  const adminResult = await adminCollection.get();
  const adminPhones = [...new Set((adminResult.data || []).map((item) => item.phone).filter(Boolean))];

  if (adminPhones.length === 0) {
    return [];
  }

  const usersResult = await usersCollection
    .where({
      phone: _.in(adminPhones),
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

const sendAdminDiaryRecheckNotifications = async ({
  feedbackId,
  reporterUser,
  targetUserId,
  targetDiaryId,
  targetSnapshot,
  targetDiarySnapshot,
}) => {
  const adminUsers = await getAdminUsers();
  if (adminUsers.length === 0) {
    return { success: true, count: 0 };
  }

  const targetName =
    (targetSnapshot && (targetSnapshot.nickname || targetSnapshot.phone)) || targetUserId || '某位用户';
  const diaryTitle =
    (targetDiarySnapshot && targetDiarySnapshot.title) || '该笔记';
  const title = '收到新的笔记复审申请';
  const content = `「${targetName}」修改了违规笔记「${diaryTitle}」，请尽快前往内容审核复审。`;

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
        reportReason: 'other',
        source: 'diary_recheck',
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
        sendPushNotification(adminUser.pushToken, title, content, {
          type: 'admin_recheck',
          feedbackId,
          targetUserId: targetUserId || '',
          targetDiaryId: targetDiaryId || '',
          reportReason: 'other',
          screen: 'AdminModeration',
        })
      )
    );
  }

  return { success: true, count: notifications.length, pushCount: pushTargets.length };
};

const hasModerationRelevantChanges = (updateData) =>
  ['title', 'content', 'media', 'isPublic', 'location', 'tags', 'scenario'].some(
    (key) => Object.prototype.hasOwnProperty.call(updateData || {}, key)
  );

const createDiaryRecheckTask = async ({ diaryId, diaryOwnerId, diaryAfterUpdate }) => {
  const existing = await feedbacksCollection
    .where({
      type: REVIEWABLE_FEEDBACK_TYPE,
      targetDiaryId: diaryId,
      source: 'diary_recheck',
      status: _.in(['pending', 'processing']),
    })
    .limit(1)
    .get();

  const existingFeedback = getDocData(existing);
  if (existingFeedback) {
    return { success: true, feedbackId: existingFeedback._id || existingFeedback.id, reused: true };
  }

  const owner = await getUserDoc(diaryOwnerId);
  const targetSnapshot = buildUserSnapshot(owner);
  const targetDiarySnapshot = buildDiarySnapshot(diaryAfterUpdate);
  const addResult = await feedbacksCollection.add({
    userId: diaryOwnerId,
    type: REVIEWABLE_FEEDBACK_TYPE,
    content: '用户已修改违规笔记，申请管理员重新审核。',
    contact: '',
    media: [],
    targetUserId: diaryOwnerId,
    targetDiaryId: diaryId,
    reportReason: 'other',
    targetSnapshot,
    targetDiarySnapshot,
    source: 'diary_recheck',
    autoGenerated: true,
    governanceTrigger: 'diary_recheck',
    status: 'pending',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  });

  const feedbackId = addResult.id || addResult._id;

  try {
    await sendAdminDiaryRecheckNotifications({
      feedbackId,
      reporterUser: owner,
      targetUserId: diaryOwnerId,
      targetDiaryId: diaryId,
      targetSnapshot,
      targetDiarySnapshot,
    });
  } catch (notifyError) {
    console.error('Send diary recheck notifications error:', notifyError);
  }

  return { success: true, feedbackId, reused: false };
};

const getBlockedUserIdsForViewer = async (viewerId) => {
  if (!viewerId) return [];
  const user = await getUserDoc(viewerId);
  return normalizeRelationIds(user && user.blockedUsers);
};

const hasBlockRelationship = async (viewerId, targetUserId) => {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return false;
  }

  const [viewer, targetUser] = await Promise.all([
    getUserDoc(viewerId),
    getUserDoc(targetUserId),
  ]);
  const viewerBlockedIds = normalizeRelationIds(viewer && viewer.blockedUsers);
  const targetBlockedIds = normalizeRelationIds(targetUser && targetUser.blockedUsers);

  return viewerBlockedIds.includes(targetUserId) || targetBlockedIds.includes(viewerId);
};

const filterBlockedComments = (comments, blockedUserIds) => {
  if (!Array.isArray(comments) || blockedUserIds.length === 0) {
    return Array.isArray(comments) ? comments : [];
  }

  return comments.filter((comment) => !blockedUserIds.includes(comment.userId));
};

// 辅助函数：为日记列表填充最新的用户信息（头像、昵称）
const populateUserInfo = async (diaries, db) => {
  if (!diaries || diaries.length === 0) return diaries;

  const userIds = new Set();
  diaries.forEach(diary => {
    if (diary.userId) userIds.add(diary.userId);
    if (diary.comments && Array.isArray(diary.comments)) {
      diary.comments.forEach(comment => {
        if (comment.userId) userIds.add(comment.userId);
      });
    }
  });

  const uniqueUserIds = Array.from(userIds);
  if (uniqueUserIds.length === 0) return diaries;

  try {
    const _ = db.command;
    // 批量查询所有相关用户
    const usersResult = await db.collection('users').where({
      _id: _.in(uniqueUserIds)
    }).get();

    const userMap = {};
    if (usersResult.data) {
      usersResult.data.forEach(user => {
        userMap[user._id] = {
          nickname: user.nickname,
          avatar: user.avatar
        };
      });
    }

    // 映射回日记和评论中
    return diaries.map(diary => {
      const newDiary = { ...diary };
      
      // 更新日记作者信息
      if (newDiary.userId && userMap[newDiary.userId]) {
        newDiary.authorInfo = {
          nickname: userMap[newDiary.userId].nickname,
          avatar: userMap[newDiary.userId].avatar
        };
      }

      // 更新评论者信息
      if (newDiary.comments && Array.isArray(newDiary.comments)) {
        newDiary.comments = newDiary.comments.map(comment => {
          if (comment.userId && userMap[comment.userId]) {
            return {
              ...comment,
              user: userMap[comment.userId].nickname || comment.user,
              avatar: userMap[comment.userId].avatar || comment.avatar
            };
          }
          return comment;
        });
      }

      return newDiary;
    });
  } catch (err) {
    console.error('Error populating user info:', err);
    return diaries; // 发生错误时回退到原始数据
  }
};

// 创建日记
const createDiary = async (data) => {
  try {
    const { title, content, date, scenario, mood, weather, location, tags, media, userId, notebookId, isPublic } = data;

    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空',
      };
    }

    // 验证必填字段
    if (!title && !content) {
      return {
        success: false,
        message: '标题或内容不能为空',
      };
    }

    // 创建日记记录
    const result = await diariesCollection.add({
      userId,
      notebookId: notebookId,
      title: title || '',
      content: content || '',
      date: date || new Date().toISOString(), // 保存用户选择的时间
      scenario: scenario || 'daily',
      mood: mood || 'normal',
      weather: weather || 'sunny',
      location: location || '',
      tags: tags || [],
      media: media || [], // 保存 media 字段
      isPublic: isPublic || false, // 世界功能
      // 扩展字段（预留，后续实现）
      isFavorite: false, // 收藏功能
      isPrivate: data.isPrivate || false, // TODO: 私密日记 - 需要密码查看，共享日记本中对伴侣不可见
      likedUserIds: [],
      comments: [],
      authorInfo: data.authorInfo || null,
      moderationStatus: 'normal',
      violationReason: '',
      violationFeedbackId: '',
      violationMarkedAt: null,
      reReviewRequestedAt: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    console.log('新建日记结果:', result);

    return {
      success: true,
      data: {
        _id: result.id || result._id,
        notebookId: notebookId,
        title,
        content,
        date: date || new Date().toISOString(),
        scenario,
        mood,
        weather,
        location,
        tags,
        media,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isPrivate: data.isPrivate || false,
        authorInfo: data.authorInfo || null,
        moderationStatus: 'normal',
      },
    };
  } catch (error) {
    console.error('Create diary error:', error);
    return {
      success: false,
      message: '创建日记失败',
      error: error.message,
    };
  }
};

// 更新日记
const updateDiary = async (data) => {
  try {
    const { _id, userId, ...updateData } = data;

    if (!_id) {
      return {
        success: false,
        message: '日记 ID 不能为空',
      };
    }

    if (!userId) {
      return {
        success: false,
        message: '用户 ID 不能为空',
      };
    }
    
    console.log('更新日记ID：', _id)

    const diaryRes = await diariesCollection.doc(_id).get();
    if (!diaryRes.data || (Array.isArray(diaryRes.data) && diaryRes.data.length === 0)) {
      return {
        success: false,
        message: '日记不存在或已被删除',
      };
    }

    // 校验权限：只有日记所有者可以更新日记
    const diaryData = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (diaryData.userId !== userId) {
      return {
        success: false,
        message: '无权修改他人的日记',
      };
    }

    // 更新日记
    const shouldTriggerReReview =
      HIDDEN_MODERATION_STATUSES.includes(diaryData.moderationStatus) &&
      hasModerationRelevantChanges(updateData);

    await diariesCollection.doc(_id).update({
      ...updateData,
      moderationStatus: shouldTriggerReReview ? 'pending_recheck' : diaryData.moderationStatus,
      reReviewRequestedAt: shouldTriggerReReview ? db.serverDate() : diaryData.reReviewRequestedAt || null,
      updatedAt: db.serverDate(),
    });

    if (shouldTriggerReReview) {
      await createDiaryRecheckTask({
        diaryId: _id,
        diaryOwnerId: userId,
        diaryAfterUpdate: {
          ...diaryData,
          ...updateData,
          _id,
          moderationStatus: 'pending_recheck',
        },
      });
    }

    return {
      success: true,
      message: '更新成功',
    };
  } catch (error) {
    console.error('Update diary error:', error);
    return {
      success: false,
      message: '更新日记失败',
      error: error.message,
    };
  }
};

// 获取日记详情
const getDiaryDetail = async (data) => {
  try {
    const { _id, userId } = data;

    if (!_id) {
      return {
        success: false,
        message: '日记 ID 不能为空',
      };
    }

    const result = await diariesCollection.doc(_id).get();

    if (!result.data) {
      return {
        success: false,
        message: '日记不存在',
      };
    }

    // 校验权限：只能查看自己的日记或公开日记，或者是活跃共享日记本中伴侣的非私密日记
    const diaryDataRaw = Array.isArray(result.data) ? result.data[0] : result.data;
    if (isDiaryModeratedHidden(diaryDataRaw)) {
      const canBypass = await canBypassDiaryModeration(userId, diaryDataRaw.userId);
      if (!canBypass) {
        return {
          success: false,
          message: '该笔记因违规处理暂不可查看',
        };
      }
    }

    if (userId && (await hasBlockRelationship(userId, diaryDataRaw.userId))) {
      return {
        success: false,
        message: '由于拉黑关系，该内容暂不可见',
      };
    }

    let hasPermission = false;

    if (diaryDataRaw.userId === userId || diaryDataRaw.isPublic) {
      hasPermission = true;
    } else if (diaryDataRaw.notebookId) {
      const notebookRes = await db.collection('notebooks').doc(diaryDataRaw.notebookId).get();
      if (notebookRes.data && notebookRes.data.length > 0) {
        const nb = Array.isArray(notebookRes.data) ? notebookRes.data[0] : notebookRes.data;
        if (nb.type === 'shared' && nb.status === 'active' && !diaryDataRaw.isPrivate) {
          const otherUserId = nb.userId === userId ? nb.partnerId : nb.userId;
          if (otherUserId === diaryDataRaw.userId) {
            hasPermission = true;
          }
        }
      }
    }

    if (!hasPermission) {
      return {
        success: false,
        message: '无权查看他人的日记',
      };
    }

    // 动态填充用户信息（因为前端期望数组，这里保持外层是数组，或者如果result.data本身是数组就直接传）
    const blockedUserIds = userId ? await getBlockedUserIdsForViewer(userId) : [];
    const diaryData = (Array.isArray(result.data) ? result.data : [result.data]).map((diary) => ({
      ...diary,
      comments: filterBlockedComments(diary.comments, blockedUserIds),
    }));
    const populatedData = await populateUserInfo(diaryData, db);

    return {
      success: true,
      data: populatedData, // 确保返回的是数组格式以兼容前端的 [0]
    };
  } catch (error) {
    console.error('Get diary error:', error);
    return {
      success: false,
      message: '获取日记失败',
      error: error.message,
    };
  }
};

// 获取日记列表
const getDiaryList = async (data) => {
  try {
    const { page = 1, pageSize = 10, scenario, mood, startDate, endDate, keyword, userId, notebookId, isFavorite, isPublic, likedByUserId, commentedByUserId, viewerId } = data;

    if (!userId && !isPublic && !likedByUserId && !commentedByUserId) {
      return {
        success: false,
        message: '查询条件不足',
      };
    }

    // 构建查询条件
    let queryConditions = [];
    const viewerBlockedUserIds = viewerId ? await getBlockedUserIdsForViewer(viewerId) : [];

    if (viewerBlockedUserIds.length > 0) {
      queryConditions.push({ userId: _.nin(viewerBlockedUserIds) });
    }

    if (notebookId) {
      queryConditions.push({ notebookId: notebookId });

      // 查询日记本状态以决定权限
      const notebookRes = await db.collection('notebooks').doc(notebookId).get();
      let isSharedActive = false;
      let otherUserId = null;

      if (notebookRes.data && notebookRes.data.length > 0) {
        const nb = Array.isArray(notebookRes.data) ? notebookRes.data[0] : notebookRes.data;
        if (nb.type === 'shared' && nb.status === 'active') {
          isSharedActive = true;
          otherUserId = nb.userId === userId ? nb.partnerId : nb.userId;
        }
      }

      if (isSharedActive && otherUserId) {
        queryConditions.push(
          _.or([
            { userId: userId },
            {
              userId: otherUserId,
              isPrivate: _.neq(true)
            }
          ])
        );
      } else {
        queryConditions.push({ userId: userId });
      }
    } else {
      // 没有任何特殊过滤条件（评论、点赞）且要求不是完全的公共世界频道
      if (userId && !isPublic && !likedByUserId && !commentedByUserId) {
        queryConditions.push({ userId: userId });
      } else if (isPublic === true && userId) {
        // 特定用户的公开日记
        queryConditions.push({ userId: userId });
        queryConditions.push({ isPublic: true });
      } else if (isPublic === true && !likedByUserId && !commentedByUserId) {
        // 世界频道
        queryConditions.push({ isPublic: true });
      }
    }

    if (isPublic === true || likedByUserId || commentedByUserId) {
      queryConditions.push({ moderationStatus: _.nin(HIDDEN_MODERATION_STATUSES) });
    }

    if (scenario) {
      queryConditions.push({ scenario: scenario });
    }

    if (mood) {
      queryConditions.push({ mood: mood });
    }

    if (isFavorite !== undefined) {
      queryConditions.push({ isFavorite: isFavorite });
    }

    if (startDate || endDate) {
      const dateCondition = {};
      if (startDate) dateCondition.$gte = startDate;
      if (endDate) dateCondition.$lte = endDate;
      queryConditions.push({ date: dateCondition });
    }

    if (keyword) {
      const keywordRegex = db.RegExp({
        regexp: keyword,
        options: 'i',
      });
      queryConditions.push(
        _.or([
          { title: keywordRegex },
          { content: keywordRegex }
        ])
      );
    }

    if (likedByUserId) {
      queryConditions.push({ likedUserIds: likedByUserId });
    }

    if (commentedByUserId) {
      // 使用数组元素匹配查询
      queryConditions.push({
        comments: _.elemMatch({
          userId: commentedByUserId
        })
      });
    }

    let finalQuery = queryConditions.length > 0 ? _.and(queryConditions) : {};

    // 计算分页
    const skip = (page - 1) * pageSize;

    console.log('Query List finalQuery:', JSON.stringify(finalQuery));

    // 获取数据
    const result = await db
      .collection('diaries')
      .where(finalQuery)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 动态填充用户信息
    const filteredList = (result.data || []).map((diary) => ({
      ...diary,
      comments: filterBlockedComments(diary.comments, viewerBlockedUserIds),
    }));
    const populatedList = await populateUserInfo(filteredList, db);

    // 获取总数
    const countResult = await diariesCollection.where(finalQuery).count();

    return {
      success: true,
      data: {
        list: populatedList,
        total: countResult.total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error('Get diary list error:', error);
    return {
      success: false,
      message: '获取日记列表失败',
      error: error.message,
    };
  }
};

// 删除日记
const deleteDiary = async (data) => {
  try {
    const { _id, userId } = data;

    if (!_id) {
      return {
        success: false,
        message: '日记 ID 不能为空',
      };
    }

    if (!userId) {
      return {
        success: false,
        message: '用户 ID 不能为空',
      };
    }

    console.log('删除日记ID：', _id)

    const diaryRes = await diariesCollection.doc(_id).get();
    if (!diaryRes.data || (Array.isArray(diaryRes.data) && diaryRes.data.length === 0)) {
      return {
        success: false,
        message: '日记不存在或已被删除',
      };
    }

    // 校验权限：只有日记所有者可以删除日记
    const diaryData = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (diaryData.userId !== userId) {
      return {
        success: false,
        message: '无权删除他人的日记',
      };
    }

    await diariesCollection.doc(_id).remove();

    return {
      success: true,
      message: '删除成功',
    };
  } catch (error) {
    console.error('Delete diary error:', error);
    return {
      success: false,
      message: '删除日记失败',
      error: error.message,
    };
  }
};

// 点赞日记
const likeDiary = async (data) => {
  try {
    const { _id, userId, action } = data;
    if (!_id || !userId) {
      return { success: false, message: '日记 ID 或用户 ID 不能为空' };
    }
    
    const diaryRes = await diariesCollection.doc(_id).get();
    if (!diaryRes.data) {
      return { success: false, message: '日记不存在' };
    }

    const diaryDataRaw = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (isDiaryModeratedHidden(diaryDataRaw)) {
      const canBypass = await canBypassDiaryModeration(userId, diaryDataRaw.userId);
      if (!canBypass) {
        return { success: false, message: '该笔记当前不可互动' };
      }
    }

    if (await hasBlockRelationship(userId, diaryDataRaw.userId)) {
      return { success: false, message: '存在拉黑关系，无法继续操作' };
    }
    
    let hasPermission = false;
    if (diaryDataRaw.userId === userId || diaryDataRaw.isPublic) {
      hasPermission = true;
    } else if (diaryDataRaw.notebookId) {
      const notebookRes = await db.collection('notebooks').doc(diaryDataRaw.notebookId).get();
      if (notebookRes.data && notebookRes.data.length > 0) {
        const nb = Array.isArray(notebookRes.data) ? notebookRes.data[0] : notebookRes.data;
        if (nb.type === 'shared' && nb.status === 'active' && !diaryDataRaw.isPrivate) {
          const otherUserId = nb.userId === userId ? nb.partnerId : nb.userId;
          if (otherUserId === diaryDataRaw.userId) {
            hasPermission = true;
          }
        }
      }
    }

    if (!hasPermission) {
      return { success: false, message: '无权操作他人的私密日记' };
    }

    const likedUserIds = diaryDataRaw.likedUserIds || [];
    
    // 去除空字符串或无效数据，防止由于其他原因导致的意外格式
    const validLikedUserIds = likedUserIds.filter(id => id && typeof id === 'string');
    
    const hasLiked = validLikedUserIds.includes(userId);
    const nextAction = action || (hasLiked ? 'unlike' : 'like');

    if (nextAction === 'unlike') {
      // 取消点赞：过滤掉目标 userId
      const newLikedUserIds = validLikedUserIds.filter(id => id !== userId);
      await diariesCollection.doc(_id).update({
        likedUserIds: newLikedUserIds,
        updatedAt: db.serverDate(),
      });
      if (hasLiked) {
        try {
          await removeUnreadLikeNotification({
            diaryId: _id,
            receiverId: diaryDataRaw.userId,
            senderId: userId,
          });
        } catch (notificationError) {
          console.error('Remove unread like notification failed:', notificationError);
        }
      }
      return { success: true, message: '取消点赞成功', data: { action: 'unlike' } };
    } else {
      // 点赞：添加目标 userId（并去重）
      const newLikedUserIds = [...new Set([...validLikedUserIds, userId])];
      await diariesCollection.doc(_id).update({
        likedUserIds: newLikedUserIds,
        updatedAt: db.serverDate(),
      });
      if (!hasLiked) {
        try {
          await createDiaryInteractionNotification({
            diary: diaryDataRaw,
            senderId: userId,
            type: 'like',
          });
        } catch (notificationError) {
          console.error('Create like notification failed:', notificationError);
        }
      }
      return { success: true, message: '点赞成功', data: { action: 'like' } };
    }
  } catch (error) {
    console.error('Like diary error:', error);
    return { success: false, message: '操作失败', error: error.message };
  }
};

// 评论日记
const commentDiary = async (data) => {
  try {
    const { _id, comment } = data;
    if (!_id || !comment || !comment.userId) {
      return { success: false, message: '参数不完整' };
    }

    const diaryRes = await diariesCollection.doc(_id).get();
    if (!diaryRes.data) {
      return { success: false, message: '日记不存在' };
    }

    const diaryDataRaw = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (isDiaryModeratedHidden(diaryDataRaw)) {
      const canBypass = await canBypassDiaryModeration(comment.userId, diaryDataRaw.userId);
      if (!canBypass) {
        return { success: false, message: '该笔记当前不可评论' };
      }
    }

    if (await hasBlockRelationship(comment.userId, diaryDataRaw.userId)) {
      return { success: false, message: '存在拉黑关系，无法发表评论' };
    }

    let hasPermission = false;
    if (diaryDataRaw.userId === comment.userId || diaryDataRaw.isPublic) {
      hasPermission = true;
    } else if (diaryDataRaw.notebookId) {
      const notebookRes = await db.collection('notebooks').doc(diaryDataRaw.notebookId).get();
      if (notebookRes.data && notebookRes.data.length > 0) {
        const nb = Array.isArray(notebookRes.data) ? notebookRes.data[0] : notebookRes.data;
        if (nb.type === 'shared' && nb.status === 'active' && !diaryDataRaw.isPrivate) {
          const otherUserId = nb.userId === comment.userId ? nb.partnerId : nb.userId;
          if (otherUserId === diaryDataRaw.userId) {
            hasPermission = true;
          }
        }
      }
    }

    if (!hasPermission) {
      return { success: false, message: '无权评论他人的私密日记' };
    }

    await diariesCollection.doc(_id).update({
      comments: _.push([comment]),
      updatedAt: db.serverDate(),
    });

    try {
      const receiverIds = [];
      if (comment.replyToUserId && comment.replyToUserId !== comment.userId) {
        receiverIds.push(comment.replyToUserId);
      }
      if (diaryDataRaw.userId && diaryDataRaw.userId !== comment.userId) {
        receiverIds.push(diaryDataRaw.userId);
      }

      await createDiaryInteractionNotification({
        diary: diaryDataRaw,
        senderId: comment.userId,
        type: 'comment',
        commentContent: comment.content,
        receiverIds,
        isReply: !!comment.replyToUserId && comment.replyToUserId !== comment.userId,
      });
    } catch (notificationError) {
      console.error('Create comment notification failed:', notificationError);
    }

    return { success: true, message: '评论成功' };
  } catch (error) {
    return { success: false, message: '评论失败', error: error.message };
  }
};

// 导出主函数
exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'create':
      return await createDiary(data);
    case 'update':
      return await updateDiary(data);
    case 'get':
      return await getDiaryDetail(data);
    case 'list':
      return await getDiaryList(data);
    case 'delete':
      return await deleteDiary(data);
    case 'like':
      return await likeDiary(data);
    case 'comment':
      return await commentDiary(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
