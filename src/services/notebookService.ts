import CloudService from './tcb';
import { Notebook } from '../types';

interface CloudFunctionResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export const getNotebookList = async (userId: string): Promise<Notebook[]> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<Notebook[]>>('notebook', {
    action: 'list',
    data: { userId },
  });

  const cloudFunctionResult = result.data;

  if (cloudFunctionResult && Array.isArray(cloudFunctionResult.data)) {
    return cloudFunctionResult.data;
  }

  if (cloudFunctionResult && Array.isArray((cloudFunctionResult as any).list)) {
    return (cloudFunctionResult as any).list;
  }

  return [];
};

export const createNotebook = async (
  userId: string,
  name: string,
  isDefault: boolean = false,
  cover?: string,
  desc?: string,
  type?: 'private' | 'shared',
  inviteePhone?: string
): Promise<Notebook> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<Notebook>>('notebook', {
    action: 'create',
    data: { userId, name, isDefault, cover, desc, type, inviteePhone },
  });

  const cloudFunctionResult = result.data;
  if (cloudFunctionResult && cloudFunctionResult.success && cloudFunctionResult.data) {
    return cloudFunctionResult.data;
  }
  throw new Error(cloudFunctionResult?.message || '创建日记本失败');
};

export const respondInvitation = async (invitationId: string, action: 'accept' | 'reject', userId: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'respondInvitation',
    data: { invitationId, action, userId },
  });

  if (!result.data?.success) {
    throw new Error(result.data?.message || '处理邀请失败');
  }
};

export const unbindSharedNotebook = async (notebookId: string, userId: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'unbindSharedNotebook',
    data: { notebookId, userId },
  });

  if (!result.data?.success) {
    throw new Error(result.data?.message || '解绑日记本失败');
  }
};

export const getInvitations = async (userId: string): Promise<any[]> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any[]>>('notebook', {
    action: 'getInvitations',
    data: { userId },
  });

  if (result.data?.success && Array.isArray(result.data.data)) {
    return result.data.data;
  }
  return [];
};

export const updateNotebook = async (_id: string, name: string, cover?: string, desc?: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'update',
    data: { _id, name, cover, desc },
  });

  if (!result.data?.success) {
    throw new Error(result.data?.message || '更新日记本失败');
  }
};

export const deleteNotebook = async (_id: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'delete',
    data: { _id },
  });

  if (!result.data?.success) {
    throw new Error(result.data?.message || '删除日记本失败');
  }
};
