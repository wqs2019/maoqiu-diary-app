export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export class RequestService {
  async request<T = any>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Network request failed');
    }
  }

  async callFunction<T = any>(functionName: string, data?: any): Promise<ApiResponse<T>> {
    // 实际调用云函数逻辑
    // 调用 TCB 云函数
    return {
      code: 0,
      message: 'success',
      data: {} as T,
    };
  }
}

export default new RequestService();
