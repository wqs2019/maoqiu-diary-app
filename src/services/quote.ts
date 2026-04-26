import CloudService from './tcb';

export interface Quote {
  author: {
    en: string;
    zh: string;
  };
  content: {
    en: string;
    zh: string;
  };
}

export const getRandomQuote = async (): Promise<Quote | null> => {
  try {
    const app = CloudService.getApp();
    if (!app) {
      console.warn('[QuoteService] TCB app not initialized');
      return null;
    }

    await CloudService.ensureAuth(app);
    const db = app.database();

    // 获取总数
    const countRes = await db.collection('quote').count();
    const total = countRes.total;

    if (total === 0) {
      return null;
    }

    // 随机一个偏移量
    const randomSkip = Math.floor(Math.random() * total);

    // 获取随机一条数据
    const res = await db.collection('quote').skip(randomSkip).limit(1).get();

    if (res.data && res.data.length > 0) {
      return res.data[0] as Quote;
    }

    return null;
  } catch (error) {
    console.error('[QuoteService] Get random quote error:', error);
    return null;
  }
};
