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
    const { title, content, date, scenario, mood, weather, location, tags, media, userId, notebookId } = data;

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
      // 扩展字段（预留，后续实现）
      isFavorite: false, // TODO: 收藏功能 - 用户可标记重要日记
      isPrivate: false, // TODO: 私密日记 - 需要密码查看
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
    const { page = 1, pageSize = 10, scenario, mood, startDate, endDate, keyword, userId, notebookId, isFavorite } = data;
    const _ = db.command;

    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空',
      };
    }

    // 构建查询条件
    let query = {
      userId,
    };

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
    default:
      return {
        success: false,
        message: '无效的操作',
      };
  }
};
