import CloudService from './tcb';

export interface Notebook {
  _id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

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

export const createNotebook = async (userId: string, name: string): Promise<Notebook> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<Notebook>>('notebook', {
    action: 'create',
    data: { userId, name },
  });

  const cloudFunctionResult = result.data;
  if (cloudFunctionResult && cloudFunctionResult.success && cloudFunctionResult.data) {
    return cloudFunctionResult.data;
  }
  throw new Error(cloudFunctionResult?.message || '创建日记本失败');
};

export const updateNotebook = async (_id: string, name: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'update',
    data: { _id, name },
  });

  if (!result.data || !result.data.success) {
    throw new Error(result.data?.message || '更新日记本失败');
  }
};

export const deleteNotebook = async (_id: string): Promise<void> => {
  const result = await CloudService.callFunction<CloudFunctionResponse<any>>('notebook', {
    action: 'delete',
    data: { _id },
  });

  if (!result.data || !result.data.success) {
    throw new Error(result.data?.message || '删除日记本失败');
  }
};
