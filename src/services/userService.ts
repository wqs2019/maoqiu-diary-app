import authService, { UserInfo } from './auth';
import { CloudService } from './tcb';

export class UserService {
  /**
   * 更新用户信息
   */
  async updateUserInfo(userId: string, data: Partial<UserInfo>): Promise<UserInfo> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'update',
        data: {
          _id: userId,
          ...data,
        },
      });

      if (response.code !== 0) {
        throw new Error(response.message || '更新用户信息失败');
      }

      // 获取更新后的最新用户信息
      const fetchResponse: any = await CloudService.callFunction('user', {
        action: 'get',
        data: {
          _id: userId,
        },
      });

      if (fetchResponse.code === 0 && fetchResponse.data) {
        // tcb.ts 会将云函数的返回包裹在 data 中
        // 所以真实的云函数返回体是 fetchResponse.data
        const cloudResult = fetchResponse.data;
        if (cloudResult.success && cloudResult.data) {
          const updatedUser = cloudResult.data;
          await authService.saveUserInfo(updatedUser); // 在服务层处理本地持久化
          return updatedUser;
        }
      }

      throw new Error('更新成功，但未返回用户数据');
    } catch (error) {
      console.error('UserService.updateUserInfo error:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<UserInfo> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'get',
        data: {
          _id: userId,
        },
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success && cloudResult.data) {
          return cloudResult.data;
        }
      }

      throw new Error(response.message || '获取用户信息失败');
    } catch (error) {
      console.error('UserService.getUserInfo error:', error);
      throw error;
    }
  }

  /**
   * 获取用户公开主页信息
   */
  async getProfile(targetUserId: string, currentUserId?: string): Promise<any> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'getProfile',
        data: {
          targetUserId,
          currentUserId,
        },
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success && cloudResult.data) {
          return cloudResult.data;
        }
        if (cloudResult.success === false) {
          throw new Error(cloudResult.message || '获取用户主页失败');
        }
      }

      throw new Error(response.message || '获取用户主页失败');
    } catch (error) {
      console.error('UserService.getProfile error:', error);
      throw error;
    }
  }

  /**
   * 关注/取消关注用户
   */
  async follow(followerId: string, followingId: string, action: 'follow' | 'unfollow'): Promise<boolean> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'follow',
        data: {
          followerId,
          followingId,
          action,
        },
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success) {
          return true;
        }
      }

      throw new Error(response.message || '操作失败');
    } catch (error) {
      console.error('UserService.follow error:', error);
      throw error;
    }
  }

  /**
   * 获取粉丝列表
   */
  async getFollowers(userId: string, page = 1, pageSize = 20): Promise<any> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'getFollowersList',
        data: {
          userId,
          page,
          pageSize,
        },
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success && cloudResult.data) {
          return cloudResult.data;
        }
      }
      return { list: [], total: 0 };
    } catch (error) {
      console.error('UserService.getFollowers error:', error);
      return { list: [], total: 0 };
    }
  }
}

export default new UserService();
