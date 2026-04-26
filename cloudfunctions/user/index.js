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
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: {
        _id: result._id,
        phoneNumber,
        nickname,
        avatar,
        isVip: isVip || false,
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
        ...updateData,
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

// 客户端购买成功后，上传收据进行校验并开通 VIP
const verifyPurchase = async (data) => {
  try {
    const { _id, receiptData } = data;
    if (!_id || !receiptData) return { success: false, message: 'Missing parameters' };

    const verifyResult = await verifyAppleReceipt(receiptData);
    
    if (verifyResult.isValid && verifyResult.latestExpireMs > Date.now()) {
      const expireDate = new Date(verifyResult.latestExpireMs);
      // 更新数据库
      await db.collection('users').doc(_id).update({
        isVip: true,
        vipExpireAt: expireDate,
        latestReceipt: receiptData, // 保存最新的收据用于以后主动同步兜底
        updatedAt: db.serverDate(),
      });
      return { success: true, data: { isVip: true, expireDate } };
    } else {
      return { success: false, message: 'Receipt invalid or expired' };
    }
  } catch (error) {
    return { success: false, error: error.message };
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
      if (verifyResult.isValid && verifyResult.latestExpireMs > Date.now()) {
        isVip = true;
        await db.collection('users').doc(_id).update({
          isVip: true,
          vipExpireAt: new Date(verifyResult.latestExpireMs),
          updatedAt: db.serverDate(),
        });
      } else {
        // 过期了
        await db.collection('users').doc(_id).update({
          isVip: false,
          updatedAt: db.serverDate(),
        });
      }
    } else if (user.vipExpireAt && user.vipExpireAt > new Date()) {
       // 如果没有 receipt 但过期时间没到，做个备用兼容
       isVip = true; 
    }

    return {
      success: true,
      data: { _id, isVip },
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

    // Soft delete the user and scramble the phone number to free it up for re-registration
    await db.collection('users').doc(_id).update({
      isDelete: true,
      phone: `deleted_${Date.now()}_${originalPhone}`,
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      message: 'Account deactivated successfully',
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
      isFollowing = userData.followers.includes(currentUserId);
    }

    return {
      success: true,
      data: {
        _id: userData._id,
        nickname: userData.nickname,
        avatar: userData.avatar,
        publicDiariesCount: publicDiariesCount,
        followersCount: followersCount,
        totalLikes: totalLikes,
        isFollowing,
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

    let followers = Array.isArray(followingUser.followers) ? followingUser.followers : [];
    let following = Array.isArray(followerUser.following) ? followerUser.following : [];

    if (action === 'follow') {
      if (!followers.includes(followerId)) followers.push(followerId);
      if (!following.includes(followingId)) following.push(followingId);
    } else {
      followers = followers.filter(id => id !== followerId);
      following = following.filter(id => id !== followingId);
    }

    await usersColl.doc(followingId).update({ followers, updatedAt: db.serverDate() });
    await usersColl.doc(followerId).update({ following, updatedAt: db.serverDate() });

    return { success: true };
  } catch (error) {
    console.error('Follow error:', error);
    return { success: false, message: error.message };
  }
};

exports.main = async (event, context) => {
  const { action, data } = event;

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
    case 'syncVip':
      return await syncVipStatus(data);
    case 'verifyPurchase':
      return await verifyPurchase(data);
    case 'getProfile':
      return await getProfile(data);
    case 'follow':
      return await follow(data);
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
