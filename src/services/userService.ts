import authService, { UserInfo } from './auth';
import { CloudService } from './tcb';

export interface UserProfileData {
  _id: string;
  nickname?: string;
  avatar?: string;
  profileBackground?: string;
  publicDiariesCount: number;
  followersCount: number;
  totalLikes: number;
  isFollowing: boolean;
  isBlockedByCurrentUser?: boolean;
  blockedByTargetUser?: boolean;
}

export interface BlockedUserListItem {
  _id: string;
  nickname?: string;
  avatar?: string;
  blockedAt?: number | null;
}

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
          const cachedUser = await authService.getUserInfo();
          const updatedUser = {
            ...cloudResult.data,
            isAdmin: cloudResult.data.isAdmin ?? cachedUser?.isAdmin ?? false,
          };
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
  async getProfile(targetUserId: string, currentUserId?: string): Promise<UserProfileData> {
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

      // #region debug-point A:user-service-follow-response
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'follow-red-dot',runId:'pre',hypothesisId:'A',location:'userService.follow:response',msg:'[DEBUG] user follow response',data:{followerId,followingId,action,responseCode:response?.code,cloudResult:response?.data},ts:Date.now()})}).catch(()=>{});
      // #endregion

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

  async blockUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'blockUser',
        data: {
          userId,
          targetUserId,
        },
      });

      if (response.code === 0 && response.data?.success) {
        return true;
      }

      throw new Error(response.data?.message || response.message || '拉黑失败');
    } catch (error) {
      console.error('UserService.blockUser error:', error);
      throw error;
    }
  }

  async unblockUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'unblockUser',
        data: {
          userId,
          targetUserId,
        },
      });

      if (response.code === 0 && response.data?.success) {
        return true;
      }

      throw new Error(response.data?.message || response.message || '取消拉黑失败');
    } catch (error) {
      console.error('UserService.unblockUser error:', error);
      throw error;
    }
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'getBlockedUserIds',
        data: {
          userId,
        },
      });

      if (response.code === 0 && response.data?.success) {
        return response.data.data?.blockedUserIds || [];
      }

      return [];
    } catch (error) {
      console.error('UserService.getBlockedUserIds error:', error);
      return [];
    }
  }

  async getBlockedUsers(userId: string, page = 1, pageSize = 20): Promise<{ list: BlockedUserListItem[]; total: number }> {
    try {
      const response: any = await CloudService.callFunction('user', {
        action: 'getBlockedUsersList',
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
      console.error('UserService.getBlockedUsers error:', error);
      return { list: [], total: 0 };
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
