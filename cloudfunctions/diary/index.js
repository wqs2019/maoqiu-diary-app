// Cloud function for diary management
// Supports create, update, get, delete, list operations

const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});
const db = app.database();

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

    return {
      success: true,
      data: {
        _id: result._id,
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
    const { _id, ...updateData } = data;

    if (!_id) {
      return {
        success: false,
        message: '日记 ID 不能为空',
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
    const { _id } = data;

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

    return {
      success: true,
      data: result.data,
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
      finalQuery = _.and([finalQuery, _.or([{ title: keywordRegex }, { content: keywordRegex }])]);
    }

    // 计算分页
    const skip = (page - 1) * pageSize;

    // 获取数据
    const result = await db
      .collection('diaries')
      .where(finalQuery)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 获取总数
    const countResult = await db.collection('diaries').where(finalQuery).count();

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
    const { _id } = data;

    if (!_id) {
      return {
        success: false,
        message: '日记 ID 不能为空',
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

    const likedUserIds = diaryRes.data.likedUserIds || [];
    
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
    if (!_id || !comment) {
      return { success: false, message: '日记 ID 或评论内容不能为空' };
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
