// Cloud function for diary management
// Supports create, update, get, delete, list operations

const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

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
    const result = await db.collection('diaries').add({
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
      isPrivate: false, // TODO: 私密日记 - 需要密码查看
      likedUserIds: [],
      comments: [],
      authorInfo: data.authorInfo || null,
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
        isPrivate: false,
        authorInfo: data.authorInfo || null,
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

    const diaryRes = await db.collection('diaries').doc(_id).get();
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
    await db
      .collection('diaries')
      .doc(_id)
      .update({
        ...updateData,
        updatedAt: db.serverDate(),
      });

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

    const result = await db.collection('diaries').doc(_id).get();

    if (!result.data) {
      return {
        success: false,
        message: '日记不存在',
      };
    }

    // 校验权限：只能查看自己的日记或公开日记
    const diaryDataRaw = Array.isArray(result.data) ? result.data[0] : result.data;
    if (diaryDataRaw.userId !== userId && !diaryDataRaw.isPublic) {
      return {
        success: false,
        message: '无权查看他人的日记',
      };
    }

    // 动态填充用户信息（因为前端期望数组，这里保持外层是数组，或者如果result.data本身是数组就直接传）
    const diaryData = Array.isArray(result.data) ? result.data : [result.data];
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
    const { page = 1, pageSize = 10, scenario, mood, startDate, endDate, keyword, userId, notebookId, isFavorite, isPublic } = data;
    const _ = db.command;

    if (!userId && !isPublic) {
      return {
        success: false,
        message: '用户ID或isPublic标识不能为空',
      };
    }

    // 构建查询条件
    let query = {};
    
    // 如果指定了 userId 且不是查询全局公开，则限制为当前用户
    // 如果既有 userId 又有 isPublic，可以认为是查询某个用户的公开日记，或者根据业务需要调整
    if (userId) {
      query.userId = userId;
    } else if (isPublic) {
      // 全局公开查询不需要限制 userId
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic;
      if (isPublic === true) {
        delete query.userId; // 确保世界频道展示所有人
      }
    }

    if (scenario) {
      query.scenario = scenario;
    }

    if (mood) {
      query.mood = mood;
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = startDate;
      }
      if (endDate) {
        query.date.$lte = endDate;
      }
    }

    let finalQuery = query;

    if (notebookId) {
      finalQuery.notebookId = notebookId;
    }

    if (keyword) {
      const keywordRegex = db.RegExp({
        regexp: keyword,
        options: 'i',
      });
      
      const orQuery = _.or([
        { title: keywordRegex },
        { content: keywordRegex }
      ]);
      
      // 如果 finalQuery 为空对象，直接赋值；否则使用 _.and
      if (Object.keys(finalQuery).length === 0) {
        finalQuery = orQuery;
      } else {
        finalQuery = _.and([finalQuery, orQuery]);
      }
    }

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
    const populatedList = await populateUserInfo(result.data || [], db);

    // 获取总数
    const countResult = await db.collection('diaries').where(finalQuery).count();

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

    const diaryRes = await db.collection('diaries').doc(_id).get();
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

    await db.collection('diaries').doc(_id).remove();

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
    
    const diaryRes = await db.collection('diaries').doc(_id).get();
    if (!diaryRes.data) {
      return { success: false, message: '日记不存在' };
    }

    const diaryDataRaw = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (diaryDataRaw.userId !== userId && !diaryDataRaw.isPublic) {
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
      await db.collection('diaries').doc(_id).update({
        likedUserIds: newLikedUserIds,
        updatedAt: db.serverDate(),
      });
      return { success: true, message: '取消点赞成功', data: { action: 'unlike' } };
    } else {
      // 点赞：添加目标 userId（并去重）
      const newLikedUserIds = [...new Set([...validLikedUserIds, userId])];
      await db.collection('diaries').doc(_id).update({
        likedUserIds: newLikedUserIds,
        updatedAt: db.serverDate(),
      });
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

    const diaryRes = await db.collection('diaries').doc(_id).get();
    if (!diaryRes.data) {
      return { success: false, message: '日记不存在' };
    }

    const diaryDataRaw = Array.isArray(diaryRes.data) ? diaryRes.data[0] : diaryRes.data;
    if (diaryDataRaw.userId !== comment.userId && !diaryDataRaw.isPublic) {
      return { success: false, message: '无权评论他人的私密日记' };
    }

    const _ = db.command;
    await db.collection('diaries').doc(_id).update({
      comments: _.push([comment]),
      updatedAt: db.serverDate(),
    });

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
