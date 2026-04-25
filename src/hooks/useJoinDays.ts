import { useMemo } from 'react';
import { UserInfo } from '../types';

/**
 * 计算用户加入天数
 * 注册当天算第 1 天
 */
export const useJoinDays = (user: UserInfo | null | undefined) => {
  return useMemo(() => {
    const createdAt = (user as any)?.createdAt;
    if (!createdAt) return 1;
    
    const joinDate = new Date(createdAt);
    const today = new Date();
    
    const joinDateOnly = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayOnly.getTime() - joinDateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays + 1); 
  }, [user]);
};
