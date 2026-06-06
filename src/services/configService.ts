import CloudService from '@/services/tcb';

export const APP_CONFIG_KEY = 'global_app_config';

export type RemoteAppConfig = {
  _id?: string;
  configKey?: string;
  show_ai_chat?: boolean;
  show_circle?: boolean;
  updatedAt?: string;
};

export type AppConfigPayload = {
  show_ai_chat: boolean;
  show_circle: boolean;
};

export const normalizeAppConfig = (config?: RemoteAppConfig | null): AppConfigPayload => ({
  show_ai_chat: config?.show_ai_chat ?? true,
  show_circle: config?.show_circle ?? true,
});

export const fetchRemoteAppConfig = async (): Promise<{
  doc: RemoteAppConfig | null;
  config: AppConfigPayload;
}> => {
  const result = await CloudService.callFunction<{
    success: boolean;
    data?: RemoteAppConfig & { docId?: string | null };
    message?: string;
  }>('config', {
    action: 'get',
    data: {},
  });

  if (result.code !== 0 || result.data?.success === false) {
    throw new Error(result.data?.message || result.message || '获取系统配置失败');
  }

  const responseDoc = result.data?.data || null;
  const doc = responseDoc
    ? {
        ...responseDoc,
        _id: responseDoc.docId || responseDoc._id,
      }
    : null;

  return {
    doc,
    config: normalizeAppConfig(doc),
  };
};

export const saveRemoteAppConfig = async (
  config: AppConfigPayload,
  adminUserId: string
): Promise<{ docId: string | null }> => {
  const result = await CloudService.callFunction<{
    success: boolean;
    data?: RemoteAppConfig & { docId?: string | null };
    message?: string;
  }>('config', {
    action: 'update',
    data: {
      adminUserId,
      ...config,
    },
  });

  if (result.code !== 0 || result.data?.success === false) {
    throw new Error(result.data?.message || result.message || '更新系统配置失败');
  }

  return {
    docId: result.data?.data?.docId || null,
  };
};
