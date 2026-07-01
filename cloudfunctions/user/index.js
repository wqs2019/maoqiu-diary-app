// Cloud function for user management
// Supports add, update, get, delete, list operations
// User ID is based on database _id field
// Author: Trae AI | Version: 1.0

const cloud = require('@cloudbase/node-sdk');
const https = require('https');

// Apple App Store Shared Secret (在 App Store Connect 获取)
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET || 'YOUR_APPLE_SHARED_SECRET';

// 初始化云开发环境
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV, // 使用当前环境（从 cloudbaserc.json 读取）
});
const db = app.database();
const _ = db.command;
const CURRENT_ENV_ID = process.env.TCB_ENV || 'maoqiu-diary-app-2fpzvwp2e01dbaf';
const DEFAULT_STORAGE_BUCKET = '6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-1417164439';
const DIARY_BATCH_LIMIT = 100;
const adminCollection = db.collection('admin_list');
const diariesCollection = db.collection('diaries');
const notificationsCollection = db.collection('notifications');
const AUTO_BLOCK_GOVERNANCE_SOURCE = 'block_auto';
const AUTO_BLOCK_GOVERNANCE_TRIGGER = 'user_block';
const AUTO_BLOCK_OPEN_STATUSES = ['pending', 'processing'];
const GOVERNANCE_RECORD_TYPE = 'report_user';
const GOVERNANCE_REPORT_REASON = 'other';
const VIP_PROTECTED_FIELDS = [
  'isVip',
  'latestReceipt',
  'vipExpireAt',
  'vipOriginalTransactionId',
  'vipTransactionId',
  'vipProductId',
  'accountStatus',
  'freezeReason',
  'frozenAt',
  'frozenBy',
];
const VIP_ERROR_CODES = {
  SUBSCRIPTION_OWNED_BY_OTHER_USER: 'SUBSCRIPTION_OWNED_BY_OTHER_USER',
};
const USER_ERROR_CODES = {
  USER_FROZEN: 'USER_FROZEN',
};

const getDocData = (result) =>
  result && result.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;

const buildCloudFileId = (cloudPath, bucket = DEFAULT_STORAGE_BUCKET) => {
  if (!cloudPath || typeof cloudPath !== 'string') {
    return '';
  }

  const normalizedPath = cloudPath.replace(/^\/+/, '');
  if (!normalizedPath) {
    return '';
  }

  return `cloud://${CURRENT_ENV_ID}.${bucket}/${normalizedPath}`;
};

const getCloudStorageFileIdFromUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (value.startsWith('cloud://')) {
    return value;
  }

  if (!/^https?:\/\//i.test(value)) {
    return buildCloudFileId(value);
  }

  try {
    const parsedUrl = new URL(value);
    const cloudPath = decodeURIComponent(parsedUrl.pathname || '').replace(/^\/+/, '');
    const bucket = parsedUrl.hostname.endsWith('.tcb.qcloud.la')
      ? parsedUrl.hostname.replace(/\.tcb\.qcloud\.la$/i, '')
      : DEFAULT_STORAGE_BUCKET;
    return buildCloudFileId(cloudPath, bucket);
  } catch (error) {
    console.error('Parse cloud storage file id failed:', value, error);
    return '';
  }
};

const collectDiaryMediaFileList = (diary) => {
  if (!diary || !Array.isArray(diary.media) || diary.media.length === 0) {
    return [];
  }

  const fileSet = new Set();

  diary.media.forEach((item) => {
    [item && item.uri, item && item.thumbnail, item && item.livePhotoVideoUri].forEach((value) => {
      const filePath = getCloudStorageFileIdFromUrl(value);

      // 只清理日记目录下的附件，避免误删到其他业务目录。
      if (filePath && filePath.includes('/diary/')) {
        fileSet.add(filePath);
      }
    });
  });

  return [...fileSet];
};

const deleteDiaryMediaFileList = async (fileList) => {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    return;
  }

  try {
    const result = await app.deleteFile({
      fileList,
    });

    const failedItems = Array.isArray(result && result.fileList)
      ? result.fileList.filter((item) => item && item.code && item.code !== 'SUCCESS')
      : [];

    if (failedItems.length > 0) {
      console.error('Delete diary media partially failed:', failedItems);
      throw new Error(failedItems.map((item) => `${item.fileID}: ${item.code}`).join('; '));
    }
  } catch (error) {
    console.error('Delete diary media failed:', error, fileList);
    throw error;
  }
};

const listAllUserDiaries = async (userId) => {
  const diaries = [];
  let skip = 0;

  while (true) {
    const result = await diariesCollection
      .where({ userId })
      .skip(skip)
      .limit(DIARY_BATCH_LIMIT)
      .get();

    const batch = Array.isArray(result && result.data) ? result.data : [];
    if (batch.length === 0) {
      break;
    }

    diaries.push(...batch);
    skip += batch.length;

    if (batch.length < DIARY_BATCH_LIMIT) {
      break;
    }
  }

  return diaries;
};

const purgeUserDiariesAndMedia = async (userId) => {
  const diaries = await listAllUserDiaries(userId);
  if (diaries.length === 0) {
    return {
      diaryCount: 0,
      attachmentCount: 0,
    };
  }

  const fileSet = new Set();
  diaries.forEach((diary) => {
    collectDiaryMediaFileList(diary).forEach((fileId) => fileSet.add(fileId));
  });

  const fileList = [...fileSet];
  await deleteDiaryMediaFileList(fileList);
  await diariesCollection.where({ userId }).remove();

  return {
    diaryCount: diaries.length,
    attachmentCount: fileList.length,
  };
};

const normalizeRelationIds = (items) =>
  Array.isArray(items)
    ? items
        .map((item) => (typeof item === 'string' ? item : item && item.userId))
        .filter((id) => typeof id === 'string' && id)
    : [];

const getBlockedUserIdsFromUser = (userData) => normalizeRelationIds(userData && userData.blockedUsers);
const buildLimitedProfileData = (userData, extra = {}) => ({
  _id: userData._id,
  nickname: userData.nickname,
  avatar: userData.avatar,
  profileBackground: userData.profileBackground,
  publicDiariesCount: 0,
  followersCount: 0,
  totalLikes: 0,
  isFollowing: false,
  ...extra,
});

const buildGovernanceUserSnapshot = (userData) => ({
  _id: userData && userData._id ? userData._id : '',
  nickname: userData && userData.nickname ? userData.nickname : '',
  avatar: userData && userData.avatar ? userData.avatar : '',
});

const buildAutoBlockGovernanceContent = (userData, targetUserData) =>
  `${userData.nickname || '当前用户'} 已主动拉黑 ${targetUserData.nickname || '目标用户'}，系统自动生成治理记录。请结合历史举报、互动行为和公开内容进一步核查。`;

const ensureAutoBlockGovernanceRecord = async (store, { userData, targetUserData, blockedAt }) => {
  const feedbackCollection = store.collection('feedbacks');
  const existingResult = await feedbackCollection
    .where({
      userId: userData._id,
      targetUserId: targetUserData._id,
      type: GOVERNANCE_RECORD_TYPE,
      source: AUTO_BLOCK_GOVERNANCE_SOURCE,
      governanceTrigger: AUTO_BLOCK_GOVERNANCE_TRIGGER,
      status: _.in(AUTO_BLOCK_OPEN_STATUSES),
    })
    .limit(1)
    .get();

  const existingRecord = getDocData(existingResult);
  const targetSnapshot = buildGovernanceUserSnapshot(targetUserData);
  const blockerSnapshot = buildGovernanceUserSnapshot(userData);

  if (existingRecord && existingRecord._id) {
    await feedbackCollection.doc(existingRecord._id).update({
      targetSnapshot,
      blockerSnapshot,
      blockRelationCreatedAt: blockedAt,
      updatedAt: db.serverDate(),
    });

    return {
      created: false,
      recordId: existingRecord._id,
    };
  }

  const addResult = await feedbackCollection.add({
    userId: userData._id,
    type: GOVERNANCE_RECORD_TYPE,
    content: buildAutoBlockGovernanceContent(userData, targetUserData),
    contact: '',
    media: [],
    targetUserId: targetUserData._id,
    reportReason: GOVERNANCE_REPORT_REASON,
    targetSnapshot,
    blockerSnapshot,
    status: 'pending',
    source: AUTO_BLOCK_GOVERNANCE_SOURCE,
    governanceTrigger: AUTO_BLOCK_GOVERNANCE_TRIGGER,
    autoGenerated: true,
    blockRelationCreatedAt: blockedAt,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  });

  return {
    created: true,
    recordId: addResult.id || addResult._id,
  };
};

const getUserDoc = async (userId) => {
  if (!userId) return null;
  const result = await db.collection('users').doc(userId).get();
  return getDocData(result);
};

const isAdminUser = async (userId) => {
  if (!userId) {
    return false;
  }

  const user = await getUserDoc(userId);
  if (!user || !user.phone) {
    return false;
  }

  const result = await adminCollection.where({ phone: user.phone }).limit(1).get();
  return Array.isArray(result.data) && result.data.length > 0;
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

const buildAdminUserListItem = (user, adminPhoneSet, publicDiariesCountMap = {}) => {
  const vipState =
    user && user.isVip && typeof user.isVip === 'object'
      ? user.isVip
      : {
          value: !!(user && user.isVip),
        };

  return {
    _id: user && user._id ? user._id : '',
    nickname: user && user.nickname ? user.nickname : '',
    avatar: user && user.avatar ? user.avatar : '',
    phone: user && user.phone ? user.phone : '',
    maskedPhone: maskPhone(user && user.phone),
    profileBackground: user && user.profileBackground ? user.profileBackground : '',
    isDelete: !!(user && user.isDelete),
    accountStatus: user && user.accountStatus === 'frozen' ? 'frozen' : 'active',
    freezeReason: user && user.freezeReason ? user.freezeReason : '',
    frozenAt: user && user.frozenAt ? user.frozenAt : null,
    isAdmin: !!(user && user.phone && adminPhoneSet.has(user.phone)),
    isVip: vipState,
    followersCount: Array.isArray(user && user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user && user.following) ? user.following.length : 0,
    blockedCount: Array.isArray(user && user.blockedUsers) ? user.blockedUsers.length : 0,
    publicDiariesCount:
      user && user._id && typeof publicDiariesCountMap[user._id] === 'number'
        ? publicDiariesCountMap[user._id]
        : 0,
    createdAt: user && user.createdAt ? user.createdAt : null,
    updatedAt: user && user.updatedAt ? user.updatedAt : null,
  };
};

const sanitizeUserUpdateData = (updateData = {}) => {
  const sanitizedData = { ...updateData };
  VIP_PROTECTED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(sanitizedData, field)) {
      delete sanitizedData[field];
    }
  });
  return sanitizedData;
};

const isUserFrozen = (user) => user && user.accountStatus === 'frozen';

const buildUserFrozenError = () => ({
  code: -1,
  message: '该账号已被冻结，请联系管理员',
  errorCode: USER_ERROR_CODES.USER_FROZEN,
});

const getOperatorUserId = (payload = {}) => {
  const candidateKeys = ['__operatorUserId', 'adminUserId', 'userId', 'currentUserId', 'followerId', '_id'];
  for (const key of candidateKeys) {
    if (payload && typeof payload[key] === 'string' && payload[key]) {
      return payload[key];
    }
  }

  return '';
};

const ensureOperatorNotFrozen = async (payload = {}) => {
  const operatorUserId = getOperatorUserId(payload);
  if (!operatorUserId) {
    return null;
  }

  const operatorUser = await getUserDoc(operatorUserId);
  if (isUserFrozen(operatorUser)) {
    return buildUserFrozenError();
  }

  return null;
};

const getUserDisplayName = (user, fallback = '有人') =>
  (user && (user.nickname || user.username || user.name)) || fallback;

const createFollowNotification = async ({ followerId, followingId, followerUser }) => {
  if (!followerId || !followingId || followerId === followingId) {
    return { skipped: true, reason: 'invalid-params' };
  }

  const sender = followerUser || (await getUserDoc(followerId));
  const senderName = getUserDisplayName(sender);

  const result = await notificationsCollection.add({
    receiverId: followingId,
    senderId: followerId,
    type: 'follow',
    title: '有人关注了你',
    content: `「${senderName}」关注了你`,
    relatedId: followerId,
    extraData: {
      screen: 'UserProfile',
      userId: followerId,
    },
    isRead: false,
    createdAt: db.serverDate(),
  });
  return {
    skipped: false,
    notificationId: result.id || result._id || null,
    receiverId: followingId,
    senderId: followerId,
  };
};

// Add new user
const addUser = async (data) => {
  try {
    const { phoneNumber, nickname, avatar, isVip } = data;

    // Create new user
    const result = await db.collection('users').add({
      phoneNumber,
      nickname,
      avatar,
      isVip: isVip || false,
      accountStatus: 'active',
      blockedUsers: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: {
        _id: result.id || result._id,
        phoneNumber,
        nickname,
        avatar,
        isVip: isVip || false,
        accountStatus: 'active',
      },
    };
  } catch (error) {
    console.error('Add user error:', error);
    return {
      success: false,
      message: 'Failed to add user',
      error: error.message,
    };
  }
};

const adminSetFreezeStatus = async (data) => {
  try {
    const { adminUserId, targetUserId, frozen, reason } = data || {};

    if (!adminUserId || !targetUserId) {
      return { success: false, message: '缺少必要的用户信息' };
    }

    if (adminUserId === targetUserId) {
      return { success: false, message: '不能冻结当前管理员账号' };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return { success: false, message: '无管理员权限' };
    }

    const targetUser = await getUserDoc(targetUserId);
    if (!targetUser) {
      return { success: false, message: '目标用户不存在' };
    }

    const targetIsAdmin = await isAdminUser(targetUserId);
    if (targetIsAdmin) {
      return { success: false, message: '暂不支持冻结管理员账号' };
    }

    await db.collection('users').doc(targetUserId).update({
      accountStatus: frozen ? 'frozen' : 'active',
      freezeReason: frozen ? String(reason || '管理员冻结').trim() || '管理员冻结' : '',
      frozenAt: frozen ? Date.now() : null,
      frozenBy: frozen ? adminUserId : '',
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: {
        targetUserId,
        accountStatus: frozen ? 'frozen' : 'active',
      },
    };
  } catch (error) {
    console.error('Admin set freeze status error:', error);
    return {
      success: false,
      message: '更新冻结状态失败',
      error: error.message,
    };
  }
};

// Update user
const updateUser = async (data) => {
  try {
    const { _id, ...updateData } = data;

    if (!_id) {
      return {
        success: false,
        message: 'User ID is required',
      };
    }

    // Update user data
    const result = await db
      .collection('users')
      .doc(_id)
      .update({
        ...sanitizeUserUpdateData(updateData),
        updatedAt: db.serverDate(),
      });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Update user error:', error);
    return {
      success: false,
      message: 'Failed to update user',
      error: error.message,
    };
  }
};

// Get user by ID
const getUser = async (data) => {
  try {
    const { _id } = data;

    if (!_id) {
      return {
        success: false,
        message: 'User ID is required',
      };
    }

    let userResult;
    try {
      userResult = await db.collection('users').doc(_id).get();
    } catch (e) {
      console.log('Error fetching user directly by id, trying array result fallback:', e);
      userResult = { data: null };
    }

    let userData =
      userResult && userResult.data
        ? Array.isArray(userResult.data)
          ? userResult.data[0]
          : userResult.data
        : null;

    if (!userData) {
      console.log('User data not found by doc(), trying where().get() for userId:', _id);
      const fallbackResult = await db.collection('users').where({ _id }).get();
      userData =
        fallbackResult.data && fallbackResult.data.length > 0 ? fallbackResult.data[0] : null;
    }

    return {
      success: true,
      data: userData || {},
    };
  } catch (error) {
    console.error('Get user error:', error);
    return {
      success: false,
      message: 'Failed to get user',
      error: error.message,
    };
  }
};

// Delete user
const deleteUser = async (data) => {
  try {
    const { _id } = data;

    if (!_id) {
      return {
        success: false,
        message: 'User ID is required',
      };
    }

    const result = await db.collection('users').doc(_id).remove();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Delete user error:', error);
    return {
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    };
  }
};

// 向苹果服务器校验收据 (verifyReceipt)
const verifyAppleReceipt = (receiptData, isSandbox = false) => {
  return new Promise((resolve) => {
    const host = isSandbox ? 'sandbox.itunes.apple.com' : 'buy.itunes.apple.com';
    const options = {
      hostname: host,
      path: '/verifyReceipt',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // 21007 意味着这个收据是沙盒环境的，但发送到了生产环境验证，需要切到沙盒重试
          if (json.status === 21007 && !isSandbox) {
            resolve(verifyAppleReceipt(receiptData, true));
          } else if (json.status === 0) {
            // 找到最新的过期时间
            let latestExpireMs = 0;
            const latestReceiptInfo = json.latest_receipt_info || [];
            latestReceiptInfo.forEach(info => {
              const expire = parseInt(info.expires_date_ms, 10);
              if (expire > latestExpireMs) latestExpireMs = expire;
            });
            resolve({ isValid: true, latestExpireMs, json });
          } else {
            console.error('Apple Verify Error Status:', json.status);
            resolve({ isValid: false, status: json.status });
          }
        } catch (e) {
          console.error('Parse Apple Response Error:', e);
          resolve({ isValid: false });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request Apple Error:', e);
      resolve({ isValid: false });
    });
    
    req.write(JSON.stringify({
      'receipt-data': receiptData,
      'password': APPLE_SHARED_SECRET,
      'exclude-old-transactions': true
    }));
    req.end();
  });
};

const getLatestAppleSubscriptionRecord = (verifyJson) => {
  const records = Array.isArray(verifyJson && verifyJson.latest_receipt_info)
    ? verifyJson.latest_receipt_info
    : [];

  if (records.length === 0) {
    return null;
  }

  return records
    .slice()
    .sort((a, b) => {
      const expireA = parseInt((a && a.expires_date_ms) || '0', 10);
      const expireB = parseInt((b && b.expires_date_ms) || '0', 10);
      if (expireA !== expireB) {
        return expireB - expireA;
      }

      const purchaseA = parseInt((a && a.purchase_date_ms) || '0', 10);
      const purchaseB = parseInt((b && b.purchase_date_ms) || '0', 10);
      return purchaseB - purchaseA;
    })[0];
};

const buildVipState = ({ isActive, productId, expiresAt }) => ({
  value: !!isActive,
  ...(productId ? { type: productId } : {}),
  ...(expiresAt ? { expiresAt } : {}),
});

const findSubscriptionOwner = async (originalTransactionId) => {
  if (!originalTransactionId) {
    return null;
  }

  const result = await db
    .collection('users')
    .where({
      vipOriginalTransactionId: originalTransactionId,
    })
    .limit(1)
    .get();

  return getDocData(result);
};

const updateVipOwnershipForUser = async ({
  userId,
  receiptData,
  originalTransactionId,
  transactionId,
  productId,
  expiresAt,
}) => {
  await db.collection('users').doc(userId).update({
    isVip: buildVipState({ isActive: true, productId, expiresAt }),
    latestReceipt: receiptData,
    vipExpireAt: expiresAt ? new Date(expiresAt) : null,
    vipOriginalTransactionId: originalTransactionId || null,
    vipTransactionId: transactionId || null,
    vipProductId: productId || null,
    updatedAt: db.serverDate(),
  });
};

const clearVipStateForUser = async (userId) => {
  await db.collection('users').doc(userId).update({
    isVip: buildVipState({ isActive: false }),
    vipExpireAt: null,
    vipTransactionId: null,
    vipProductId: null,
    updatedAt: db.serverDate(),
  });
};

// 客户端购买成功后，上传收据进行校验并开通 VIP
const verifyPurchase = async (data) => {
  try {
    const { _id, receiptData } = data;
    if (!_id || !receiptData) return { success: false, message: 'Missing parameters' };

    const currentUser = await getUserDoc(_id);
    if (!currentUser) {
      return { success: false, message: '用户不存在' };
    }

    const verifyResult = await verifyAppleReceipt(receiptData);
    const latestRecord = verifyResult.isValid ? getLatestAppleSubscriptionRecord(verifyResult.json) : null;
    const expiresAt = latestRecord?.expires_date_ms ? parseInt(latestRecord.expires_date_ms, 10) : 0;
    const originalTransactionId =
      latestRecord?.original_transaction_id || latestRecord?.transaction_id || '';
    const transactionId = latestRecord?.transaction_id || '';
    const productId = latestRecord?.product_id || '';

    if (!verifyResult.isValid || !latestRecord || expiresAt <= Date.now()) {
      if (
        currentUser.latestReceipt === receiptData ||
        (currentUser.vipOriginalTransactionId &&
          currentUser.vipOriginalTransactionId === originalTransactionId)
      ) {
        await clearVipStateForUser(_id);
      }
      return { success: false, message: 'Receipt invalid or expired' };
    }

    const existingOwner = await findSubscriptionOwner(originalTransactionId);
    if (existingOwner && existingOwner._id && existingOwner._id !== _id) {
      return {
        success: false,
        errorCode: VIP_ERROR_CODES.SUBSCRIPTION_OWNED_BY_OTHER_USER,
        message: '该苹果订阅已绑定到其他账号，请使用原开通账号登录。',
      };
    }

    await updateVipOwnershipForUser({
      userId: _id,
      receiptData,
      originalTransactionId,
      transactionId,
      productId,
      expiresAt,
    });

    return {
      success: true,
      data: {
        isVip: buildVipState({ isActive: true, productId, expiresAt }),
        originalTransactionId,
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// 主动同步更新 VIP 状态（供客户端登录/启动时调用）
const syncVipStatus = async (data) => {
  try {
    const { _id } = data;
    if (!_id) return { success: false, message: 'User ID is required' };

    const userRes = await db.collection('users').doc(_id).get();
    const user = userRes.data ? (Array.isArray(userRes.data) ? userRes.data[0] : userRes.data) : null;
    
    if (!user) {
      return { success: false, message: '该用户不存在' };
    }
    if (user.isDelete) {
      return { success: false, message: '该用户已注销' };
    }

    let isVip = false;
    
    // 如果有收据，去苹果服务器重新校验一下最新状态（苹果会自动返回该收据对应的最新续费状态）
    if (user.latestReceipt) {
      const verifyResult = await verifyAppleReceipt(user.latestReceipt);
      const latestRecord = verifyResult.isValid ? getLatestAppleSubscriptionRecord(verifyResult.json) : null;
      const expiresAt = latestRecord?.expires_date_ms ? parseInt(latestRecord.expires_date_ms, 10) : 0;
      const originalTransactionId =
        latestRecord?.original_transaction_id || latestRecord?.transaction_id || user.vipOriginalTransactionId || '';
      const transactionId = latestRecord?.transaction_id || '';
      const productId = latestRecord?.product_id || '';

      if (verifyResult.isValid && latestRecord && expiresAt > Date.now()) {
        isVip = true;
        const existingOwner = await findSubscriptionOwner(originalTransactionId);
        if (existingOwner && existingOwner._id && existingOwner._id !== _id) {
          return {
            success: false,
            errorCode: VIP_ERROR_CODES.SUBSCRIPTION_OWNED_BY_OTHER_USER,
            message: '该苹果订阅已绑定到其他账号，请使用原开通账号登录。',
          };
        }

        await db.collection('users').doc(_id).update({
          isVip: buildVipState({ isActive: true, productId, expiresAt }),
          vipExpireAt: new Date(expiresAt),
          vipOriginalTransactionId: originalTransactionId || null,
          vipTransactionId: transactionId || null,
          vipProductId: productId || null,
          updatedAt: db.serverDate(),
        });
      } else {
        // 过期了
        await clearVipStateForUser(_id);
      }
    } else if (user.isVip && user.isVip.value && user.vipExpireAt && user.vipExpireAt > new Date()) {
       // 如果没有 receipt 但过期时间没到，做个备用兼容
       isVip = true; 
    } else if (user.isVip && user.isVip.value) {
      // 兼容历史错误数据：如果既没有绑定的收据，也没有订阅归属标识，则撤销这类设备侧误发的 VIP。
      await clearVipStateForUser(_id);
    }

    return {
      success: true,
      data: {
        _id,
        isVip: user.isVip && typeof user.isVip === 'object' ? user.isVip : buildVipState({ isActive: isVip }),
      },
    };
  } catch (error) {
    console.error('Sync VIP error:', error);
    return {
      success: false,
      message: 'Failed to sync VIP status',
      error: error.message,
    };
  }
};

// List users
const listUsers = async (data) => {
  try {
    const { page = 1, pageSize = 10, filter = {} } = data;

    // Calculate skip
    const skip = (page - 1) * pageSize;

    // Get users with pagination
    const result = await db
      .collection('users')
      .where(filter)
      .skip(skip)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get();

    // Get total count
    const countResult = await db.collection('users').where(filter).count();

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
    console.error('List users error:', error);
    return {
      success: false,
      message: 'Failed to list users',
      error: error.message,
    };
  }
};

const adminListUsers = async (data) => {
  try {
    const {
      adminUserId,
      page = 1,
      pageSize = 20,
      keyword = '',
      filter = 'all',
    } = data || {};

    if (!adminUserId) {
      return {
        success: false,
        message: 'adminUserId is required',
      };
    }

    const isAdmin = await isAdminUser(adminUserId);
    if (!isAdmin) {
      return {
        success: false,
        message: '无管理员权限',
      };
    }

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
    const skip = (normalizedPage - 1) * normalizedPageSize;
    const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
    const queryConditions = [];

    if (filter === 'vip') {
      queryConditions.push({ 'isVip.value': true });
    } else if (filter === 'deleted') {
      queryConditions.push({ isDelete: true });
    }

    if (trimmedKeyword) {
      const keywordRegex = db.RegExp({
        regexp: escapeRegExp(trimmedKeyword),
        options: 'i',
      });

      queryConditions.push(
        _.or([
          { nickname: keywordRegex },
          { phone: keywordRegex },
        ])
      );
    }

    const whereCondition =
      queryConditions.length > 1 ? _.and(queryConditions) : queryConditions[0] || {};

    const usersCollection = db.collection('users');
    const [result, countResult, vipCountResult, deletedCountResult, adminListResult] = await Promise.all([
      usersCollection
        .where(whereCondition)
        .field({
          _id: true,
          nickname: true,
          avatar: true,
          phone: true,
          profileBackground: true,
          isDelete: true,
          isVip: true,
          accountStatus: true,
          freezeReason: true,
          frozenAt: true,
          followers: true,
          following: true,
          blockedUsers: true,
          createdAt: true,
          updatedAt: true,
        })
        .skip(skip)
        .limit(normalizedPageSize)
        .orderBy('createdAt', 'desc')
        .get(),
      usersCollection.where(whereCondition).count(),
      usersCollection.where({ 'isVip.value': true }).count(),
      usersCollection.where({ isDelete: true }).count(),
      adminCollection.field({ phone: true }).get(),
    ]);

    const adminPhoneSet = new Set(
      (Array.isArray(adminListResult.data) ? adminListResult.data : [])
        .map((item) => item && item.phone)
        .filter(Boolean)
    );

    const pageUsers = Array.isArray(result.data) ? result.data : [];
    const publicDiariesCountMap = {};
    await Promise.all(
      pageUsers.map(async (item) => {
        if (!item || !item._id) {
          return;
        }

        const diaryCountResult = await db.collection('diaries').where({
          userId: item._id,
          isPublic: true,
        }).count();
        publicDiariesCountMap[item._id] = diaryCountResult.total || 0;
      })
    );

    const list = pageUsers.map((item) => buildAdminUserListItem(item, adminPhoneSet, publicDiariesCountMap));

    return {
      success: true,
      data: {
        list,
        total: countResult.total || 0,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        summary: {
          totalUsers: await usersCollection.count().then((res) => res.total || 0),
          vipUsers: vipCountResult.total || 0,
          deletedUsers: deletedCountResult.total || 0,
          adminUsers: adminPhoneSet.size,
        },
      },
    };
  } catch (error) {
    console.error('Admin list users error:', error);
    return {
      success: false,
      message: '获取用户列表失败',
      error: error.message,
    };
  }
};

// Deactivate user (soft delete)
const deactivateAccount = async (data) => {
  try {
    const { _id } = data;

    if (!_id) {
      return {
        success: false,
        message: 'User ID is required',
      };
    }

    // 获取原用户信息
    const userResp = await getUser({ _id });
    const originalPhone = userResp.data && userResp.data.phone ? userResp.data.phone : _id;

    const purgeResult = await purgeUserDiariesAndMedia(_id);

    // Soft delete the user and scramble the phone number to free it up for re-registration
    await db.collection('users').doc(_id).update({
      isDelete: true,
      phone: `deleted_${Date.now()}_${originalPhone}`,
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      message: 'Account deactivated successfully',
      data: purgeResult,
    };
  } catch (error) {
    console.error('Deactivate account error:', error);
    return {
      success: false,
      message: 'Failed to deactivate account',
      error: error.message,
    };
  }
};

// Get user profile
const getProfile = async (data) => {
  try {
    const { targetUserId, currentUserId } = data;
    if (!targetUserId) {
      return { success: false, message: 'targetUserId is required' };
    }

    const userRes = await db.collection('users').doc(targetUserId).get();
    const userData = userRes.data && Array.isArray(userRes.data) ? userRes.data[0] : userRes.data;
    
    if (!userData) {
      return { success: false, message: '该用户不存在' };
    }

    if (userData.isDelete) {
      return { success: false, message: '该用户已注销' };
    }

    let currentUserData = null;
    let currentUserBlockedIds = [];
    let blockedByTargetUser = false;

    if (currentUserId) {
      currentUserData = await getUserDoc(currentUserId);
      currentUserBlockedIds = getBlockedUserIdsFromUser(currentUserData);
      blockedByTargetUser = getBlockedUserIdsFromUser(userData).includes(currentUserId);
    }

    const isBlockedByCurrentUser = currentUserBlockedIds.includes(targetUserId);

    if (isBlockedByCurrentUser) {
      return {
        success: true,
        data: buildLimitedProfileData(userData, {
          isBlockedByCurrentUser: true,
          blockedByTargetUser,
        }),
      };
    }

    if (blockedByTargetUser) {
      return {
        success: true,
        data: buildLimitedProfileData(userData, {
          isBlockedByCurrentUser: false,
          blockedByTargetUser: true,
        }),
      };
    }

    // get public diaries count and total likes
    const countRes = await db.collection('diaries').where({ 
      userId: targetUserId, 
      isPublic: true 
    }).count();
    
    let publicDiariesCount = countRes.total || 0;
    let totalLikes = 0;

    if (publicDiariesCount > 0) {
      const MAX_LIMIT = 1000;
      const batchTimes = Math.ceil(publicDiariesCount / MAX_LIMIT);
      const tasks = [];
      
      for (let i = 0; i < batchTimes; i++) {
        tasks.push(
          db.collection('diaries').where({ 
            userId: targetUserId, 
            isPublic: true 
          })
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .field({ likedUserIds: true }) // 只查点赞字段，极大地节省内存和网络开销
          .get()
        );
      }
      
      const results = await Promise.all(tasks);
      for (const res of results) {
        if (res.data) {
          const diaries = Array.isArray(res.data) ? res.data : [res.data];
          totalLikes += diaries.reduce((sum, diary) => {
            const likes = Array.isArray(diary.likedUserIds) ? diary.likedUserIds.length : 0;
            return sum + likes;
          }, 0);
        }
      }
    }
    
    // get followers count
    const followersCount = Array.isArray(userData.followers) ? userData.followers.length : 0;
    
    // check if current user is following
    let isFollowing = false;
    if (currentUserId && Array.isArray(userData.followers)) {
      isFollowing = userData.followers.some(item => (typeof item === 'string' ? item : item.userId) === currentUserId);
    }

    return {
      success: true,
      data: {
        _id: userData._id,
        nickname: userData.nickname,
        avatar: userData.avatar,
        profileBackground: userData.profileBackground,
        publicDiariesCount: publicDiariesCount,
        followersCount: followersCount,
        totalLikes: totalLikes,
        isFollowing,
        isBlockedByCurrentUser: false,
        blockedByTargetUser,
      }
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, message: error.message };
  }
};

// Follow or unfollow user
const follow = async (data) => {
  try {
    const { followerId, followingId, action } = data; // action: 'follow' or 'unfollow'
    if (!followerId || !followingId) {
      return { success: false, message: 'followerId and followingId are required' };
    }
    if (followerId === followingId) {
      return { success: false, message: 'Cannot follow yourself' };
    }

    const usersColl = db.collection('users');

    const followingUserRes = await usersColl.doc(followingId).get();
    const followerUserRes = await usersColl.doc(followerId).get();
    
    let followingUser = followingUserRes.data ? (Array.isArray(followingUserRes.data) ? followingUserRes.data[0] : followingUserRes.data) : null;
    let followerUser = followerUserRes.data ? (Array.isArray(followerUserRes.data) ? followerUserRes.data[0] : followerUserRes.data) : null;

    if (!followingUser || !followerUser) {
      return { success: false, message: '该用户不存在' };
    }

    if (followingUser.isDelete) {
      return { success: false, message: '对方已注销，无法关注' };
    }
    if (followerUser.isDelete) {
      return { success: false, message: '您的账号已注销' };
    }

    const followerBlockedIds = getBlockedUserIdsFromUser(followerUser);
    const targetBlockedIds = getBlockedUserIdsFromUser(followingUser);
    if (followerBlockedIds.includes(followingId) || targetBlockedIds.includes(followerId)) {
      return { success: false, message: '存在拉黑关系，暂时无法关注' };
    }

    let followers = Array.isArray(followingUser.followers) ? followingUser.followers : [];
    let following = Array.isArray(followerUser.following) ? followerUser.following : [];
    let followDebug = { action, followerExists: null, followingExists: null, notification: null };

    if (action === 'follow') {
      const followerExists = followers.some(item => (typeof item === 'string' ? item : item.userId) === followerId);
      const followingExists = following.some(item => (typeof item === 'string' ? item : item.userId) === followingId);
      followDebug = { action, followerExists, followingExists, notification: null };

      const timestamp = Date.now();
      
      if (!followerExists) {
        followers.push({ userId: followerId, followedAt: timestamp });
      }
      if (!followingExists) {
        following.push({ userId: followingId, followedAt: timestamp });
      }

      if (!followerExists) {
        followDebug.notification = await createFollowNotification({
          followerId,
          followingId,
          followerUser,
        });
      }
    } else {
      followers = followers.filter(item => (typeof item === 'string' ? item : item.userId) !== followerId);
      following = following.filter(item => (typeof item === 'string' ? item : item.userId) !== followingId);

      await notificationsCollection.where({
        receiverId: followingId,
        senderId: followerId,
        type: 'follow',
        isRead: false,
      }).remove();
    }

    await usersColl.doc(followingId).update({ followers, updatedAt: db.serverDate() });
    await usersColl.doc(followerId).update({ following, updatedAt: db.serverDate() });

    return { success: true, debug: followDebug };
  } catch (error) {
    console.error('Follow error:', error);
    return { success: false, message: error.message };
  }
};

const blockUser = async (data) => {
  try {
    const { userId, targetUserId } = data;
    if (!userId || !targetUserId) {
      return { success: false, message: 'userId and targetUserId are required' };
    }
    if (userId === targetUserId) {
      return { success: false, message: '不能拉黑自己' };
    }

    return await db.runTransaction(async (transaction) => {
      const user = getDocData(await transaction.collection('users').doc(userId).get());
      const targetUser = getDocData(await transaction.collection('users').doc(targetUserId).get());

      if (!user || !targetUser || targetUser.isDelete) {
        return { success: false, message: '目标用户不存在' };
      }

      const blockedUsers = Array.isArray(user.blockedUsers) ? [...user.blockedUsers] : [];
      const following = Array.isArray(user.following) ? user.following : [];
      const targetFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : [];
      const exists = blockedUsers.some(
        (item) => (typeof item === 'string' ? item : item.userId) === targetUserId
      );
      const blockedAt = Date.now();

      if (!exists) {
        blockedUsers.push({ userId: targetUserId, blockedAt });
      }

      await transaction.collection('users').doc(userId).update({
        blockedUsers,
        following: following.filter(
          (item) => (typeof item === 'string' ? item : item.userId) !== targetUserId
        ),
        updatedAt: db.serverDate(),
      });

      await transaction.collection('users').doc(targetUserId).update({
        followers: targetFollowers.filter(
          (item) => (typeof item === 'string' ? item : item.userId) !== userId
        ),
        updatedAt: db.serverDate(),
      });

      const governanceRecord = await ensureAutoBlockGovernanceRecord(transaction, {
        userData: user,
        targetUserData: targetUser,
        blockedAt: exists
          ? (
              blockedUsers.find(
                (item) => (typeof item === 'string' ? item : item.userId) === targetUserId
              ) || {}
            ).blockedAt || blockedAt
          : blockedAt,
      });

      return {
        success: true,
        data: {
          governanceRecordCreated: governanceRecord.created,
          governanceRecordId: governanceRecord.recordId,
        },
      };
    });
  } catch (error) {
    console.error('Block user error:', error);
    return { success: false, message: error.message };
  }
};

const unblockUser = async (data) => {
  try {
    const { userId, targetUserId } = data;
    if (!userId || !targetUserId) {
      return { success: false, message: 'userId and targetUserId are required' };
    }

    const user = await getUserDoc(userId);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    const blockedUsers = Array.isArray(user.blockedUsers) ? user.blockedUsers : [];
    await db.collection('users').doc(userId).update({
      blockedUsers: blockedUsers.filter((item) => (typeof item === 'string' ? item : item.userId) !== targetUserId),
      updatedAt: db.serverDate(),
    });

    return { success: true };
  } catch (error) {
    console.error('Unblock user error:', error);
    return { success: false, message: error.message };
  }
};

const getBlockedUserIds = async (data) => {
  try {
    const { userId } = data;
    if (!userId) {
      return { success: false, message: 'userId is required' };
    }

    const user = await getUserDoc(userId);
    if (!user) {
      return { success: true, data: { blockedUserIds: [] } };
    }

    return {
      success: true,
      data: {
        blockedUserIds: getBlockedUserIdsFromUser(user),
      },
    };
  } catch (error) {
    console.error('Get blocked users error:', error);
    return { success: false, message: error.message };
  }
};

const getBlockedUsersList = async (data) => {
  try {
    const { userId, page = 1, pageSize = 20 } = data;
    if (!userId) {
      return { success: false, message: 'userId is required' };
    }

    const user = await getUserDoc(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    let blockedUsers = Array.isArray(user.blockedUsers) ? [...user.blockedUsers] : [];
    blockedUsers.reverse();

    const total = blockedUsers.length;
    const skip = (page - 1) * pageSize;
    const pagedBlockedUsers = blockedUsers.slice(skip, skip + pageSize);

    if (pagedBlockedUsers.length === 0) {
      return { success: true, data: { list: [], total } };
    }

    const blockedIds = pagedBlockedUsers
      .map((item) => (typeof item === 'string' ? item : item.userId))
      .filter(Boolean);

    const MAX_LIMIT = 100;
    const tasks = [];
    for (let i = 0; i < blockedIds.length; i += MAX_LIMIT) {
      const batchIds = blockedIds.slice(i, i + MAX_LIMIT);
      tasks.push(
        db.collection('users').where({
          _id: db.command.in(batchIds)
        }).field({
          _id: true,
          nickname: true,
          avatar: true,
          isDelete: true
        }).get()
      );
    }

    const results = await Promise.all(tasks);
    const usersMap = {};
    for (const res of results) {
      if (res.data) {
        const users = Array.isArray(res.data) ? res.data : [res.data];
        users.forEach((u) => {
          usersMap[u._id] = u;
        });
      }
    }

    const list = pagedBlockedUsers
      .map((item) => {
        const id = typeof item === 'string' ? item : item.userId;
        const userDetail = usersMap[id] || {};
        return {
          _id: id,
          nickname: userDetail.nickname,
          avatar: userDetail.avatar,
          isDelete: userDetail.isDelete,
          blockedAt: typeof item === 'object' && item.blockedAt ? item.blockedAt : null,
        };
      })
      .filter((item) => !item.isDelete);

    return {
      success: true,
      data: {
        list,
        total,
      },
    };
  } catch (error) {
    console.error('Get blocked users list error:', error);
    return { success: false, message: error.message };
  }
};

// Get followers list
const getFollowersList = async (data) => {
  try {
    const { userId, page = 1, pageSize = 20 } = data;
    if (!userId) {
      return { success: false, message: 'userId is required' };
    }

    const userRes = await db.collection('users').doc(userId).get();
    const user = userRes.data ? (Array.isArray(userRes.data) ? userRes.data[0] : userRes.data) : null;
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    let followers = Array.isArray(user.followers) ? user.followers : [];
    
    // Reverse to get newest first
    followers.reverse();

    const total = followers.length;
    const skip = (page - 1) * pageSize;
    const pagedFollowers = followers.slice(skip, skip + pageSize);

    if (pagedFollowers.length === 0) {
      return { success: true, data: { list: [], total } };
    }

    // Extract userIds
    const followerIds = pagedFollowers.map(f => typeof f === 'string' ? f : f.userId);

    // Fetch user details in batch
    const MAX_LIMIT = 100; // tcb limit
    const tasks = [];
    for (let i = 0; i < followerIds.length; i += MAX_LIMIT) {
      const batchIds = followerIds.slice(i, i + MAX_LIMIT);
      tasks.push(
        db.collection('users').where({
          _id: db.command.in(batchIds)
        }).field({
          _id: true,
          nickname: true,
          avatar: true,
          isDelete: true
        }).get()
      );
    }

    const results = await Promise.all(tasks);
    const usersMap = {};
    for (const res of results) {
      if (res.data) {
        const users = Array.isArray(res.data) ? res.data : [res.data];
        users.forEach(u => {
          usersMap[u._id] = u;
        });
      }
    }

    // Map back to original order and attach followedAt
    const list = pagedFollowers.map(f => {
      const id = typeof f === 'string' ? f : f.userId;
      const userDetail = usersMap[id] || {};
      return {
        _id: id,
        nickname: userDetail.nickname,
        avatar: userDetail.avatar,
        isDelete: userDetail.isDelete,
        followedAt: typeof f === 'object' && f.followedAt ? f.followedAt : null
      };
    }).filter(u => !u.isDelete); // optionally filter out deleted users

    return {
      success: true,
      data: {
        list,
        total
      }
    };
  } catch (error) {
    console.error('Get followers list error:', error);
    return { success: false, message: error.message };
  }
};

exports.main = async (event, context) => {
  const { action, data } = event;

  if (action !== 'adminSetFreeze') {
    const frozenGuard = await ensureOperatorNotFrozen(data || {});
    if (frozenGuard) {
      return frozenGuard;
    }
  }

  switch (action) {
    case 'add':
      return await addUser(data);
    case 'update':
      return await updateUser(data);
    case 'get':
      return await getUser(data);
    case 'delete':
      return await deleteUser(data);
    case 'deactivateAccount':
      return await deactivateAccount(data);
    case 'list':
      return await listUsers(data);
    case 'adminList':
      return await adminListUsers(data);
    case 'adminSetFreeze':
      return await adminSetFreezeStatus(data);
    case 'syncVip':
      return await syncVipStatus(data);
    case 'verifyPurchase':
      return await verifyPurchase(data);
    case 'getProfile':
      return await getProfile(data);
    case 'follow':
      return await follow(data);
    case 'getFollowersList':
      return await getFollowersList(data);
    case 'blockUser':
      return await blockUser(data);
    case 'unblockUser':
      return await unblockUser(data);
    case 'getBlockedUserIds':
      return await getBlockedUserIds(data);
    case 'getBlockedUsersList':
      return await getBlockedUsersList(data);
    case 'bindAppleId':
      return await bindAppleId(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};

async function bindAppleId(data) {
  try {
    const { userId, appleId } = data || {};

    if (!userId || !appleId) {
      return { success: false, message: '缺少必要参数' };
    }

    // 检查这个 appleId 是否已经被其他账号绑定
    const existingUser = await db.collection('users').where({ appleId }).get();
    if (existingUser.data && existingUser.data.length > 0) {
      // 如果找到的账号不是当前账号，说明已经被别人绑定了
      const foundId = existingUser.data[0]._id || existingUser.data[0].id;
      if (foundId !== userId) {
        // 如果这个 appleId 对应的账号是一个没有绑定手机号的“空壳”账号（即刚才 Apple 登录自动创建的）
        // 我们可以允许合并：删除那个空壳账号，把 appleId 绑到当前老账号上
        if (!existingUser.data[0].phone) {
          await db.collection('users').doc(foundId).remove();
        } else {
          return { success: false, message: '该 Apple 账号已被其他用户绑定' };
        }
      } else {
        // 如果就是当前账号，直接返回成功
        return { success: true, message: '已绑定' };
      }
    }

    // 更新当前用户的 appleId
    await db.collection('users').doc(userId).update({
      appleId,
      updatedAt: db.serverDate(),
    });

    return { success: true, message: '绑定成功' };
  } catch (error) {
    console.error('Bind Apple ID error:', error);
    return { success: false, message: '绑定失败', error: error.message };
  }
}
