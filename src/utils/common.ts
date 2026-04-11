export class CommonUtil {
  static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static isIos(): boolean {
    return !!(typeof window !== 'undefined' && window.navigator && window.navigator.platform && /iPad|iPhone|iPod/.test(window.navigator.platform));
  }

  static isAndroid(): boolean {
    return !!(typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && /Android/.test(window.navigator.userAgent));
  }

  static getDeviceType(): 'ios' | 'android' | 'web' {
    if (this.isIos()) return 'ios';
    if (this.isAndroid()) return 'android';
    return 'web';
  }

  static generateRandomId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CommonUtil;
