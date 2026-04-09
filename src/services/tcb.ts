// TCB 单例初始化封装
import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-rn';
import { TCB_CONFIG } from '../config/tcb';

// 使用适配器
cloudbase.useAdapters(adapter);

class TCBService {
  private static instance: TCBService;
  private app: any = null;

  private constructor() {}

  public static getInstance(): TCBService {
    if (!TCBService.instance) {
      TCBService.instance = new TCBService();
    }
    return TCBService.instance;
  }

  public init(env?: string, region?: string): void {
    const envId = env || TCB_CONFIG.env;
    const regionId = region || TCB_CONFIG.region;
    
    this.app = cloudbase.init({
      env: envId,
      region: regionId,
    });
  }

  public getApp() {
    return this.app;
  }

  public getDb() {
    return this.app?.database();
  }

  public getFunctions() {
    return this.app?.functions();
  }

  public getAuth() {
    return this.app?.auth();
  }

  public getStorage() {
    return this.app?.storage();
  }
}

export default TCBService.getInstance();
