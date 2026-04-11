// Cloud function for user management
// Supports add, update, get, delete, list operations
// User ID is based on database _id field
// Author: Trae AI | Version: 1.0

const cloud = require('@cloudbase/node-sdk');

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
    const result = await db.collection("users").add(
      {
        phoneNumber,
        nickname,
        avatar,
        isVip: isVip || false,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    );

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
    console.error("Add user error:", error);
    return {
      success: false,
      message: "Failed to add user",
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
        message: "User ID is required",
      };
    }

    // Update user data
    const result = await db
      .collection("users")
      .doc(_id)
      .update({
        data: {
          ...updateData,
          updatedAt: db.serverDate(),
        },
      });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      success: false,
      message: "Failed to update user",
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
        message: "User ID is required",
      };
    }

    const result = await db.collection("users").doc(_id).get();

    return {
      success: true,
      data: result.data || {},
    };
  } catch (error) {
    console.error("Get user error:", error);
    return {
      success: false,
      message: "Failed to get user",
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
        message: "User ID is required",
      };
    }

    const result = await db.collection("users").doc(_id).remove();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: "Failed to delete user",
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
    const result = await db.collection("users").where(filter).skip(skip).limit(pageSize).orderBy("createdAt", "desc").get();

    // Get total count
    const countResult = await db.collection("users").where(filter).count();

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
    console.error("List users error:", error);
    return {
      success: false,
      message: "Failed to list users",
      error: error.message,
    };
  }
};

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case "add":
      return await addUser(data);
    case "update":
      return await updateUser(data);
    case "get":
      return await getUser(data);
    case "delete":
      return await deleteUser(data);
    case "list":
      return await listUsers(data);
    default:
      return {
        success: false,
        message: "无效的操作",
      };
  }
};
