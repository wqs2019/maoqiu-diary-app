import { CloudService } from './tcb';
import { MediaResource } from '../types';

export interface FeedbackData {
  _id?: string;
  userId: string;
  type: 'bug' | 'feature' | 'other';
  content: string;
  contact?: string;
  status?: 'pending' | 'processing' | 'resolved';
  createdAt?: string;
  media?: MediaResource[];
}

export interface FeedbackListResponse {
  list: FeedbackData[];
  total: number;
  page: number;
  pageSize: number;
}

export class FeedbackService {
  /**
   * 提交反馈
   */
  async submitFeedback(data: Omit<FeedbackData, '_id' | 'status' | 'createdAt'>): Promise<FeedbackData> {
    try {
      const response: any = await CloudService.callFunction('feedback', {
        action: 'add',
        data,
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success && cloudResult.data) {
          return cloudResult.data;
        }
      }

      throw new Error(response.message || '提交反馈失败');
    } catch (error) {
      console.error('FeedbackService.submitFeedback error:', error);
      throw error;
    }
  }

  /**
   * 获取用户的反馈列表
   */
  async getMyFeedbacks(userId: string, page = 1, pageSize = 20): Promise<FeedbackListResponse> {
    try {
      const response: any = await CloudService.callFunction('feedback', {
        action: 'list',
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

      throw new Error(response.message || '获取反馈列表失败');
    } catch (error) {
      console.error('FeedbackService.getMyFeedbacks error:', error);
      throw error;
    }
  }

  /**
   * 删除反馈
   */
  async deleteFeedback(feedbackId: string, userId: string): Promise<boolean> {
    try {
      const response: any = await CloudService.callFunction('feedback', {
        action: 'delete',
        data: {
          _id: feedbackId,
          userId,
        },
      });

      if (response.code === 0 && response.data) {
        const cloudResult = response.data;
        if (cloudResult.success) {
          return true;
        }
      }

      throw new Error(response.message || '删除反馈失败');
    } catch (error) {
      console.error('FeedbackService.deleteFeedback error:', error);
      throw error;
    }
  }
}

export default new FeedbackService();
