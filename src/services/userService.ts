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
}

export default new UserService();
