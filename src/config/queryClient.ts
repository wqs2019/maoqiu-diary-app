// React Query 配置
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 默认配置
            staleTime: 1000 * 60 * 5, // 5 分钟内数据不失效
            retry: 3, // 失败重试 3 次
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
            refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
            refetchOnReconnect: true, // 重连时刷新
        },
        mutations: {
            retry: 1,
        },
    },
});

export default queryClient;
