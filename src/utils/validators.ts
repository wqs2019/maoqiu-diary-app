// Zod 验证模式
import { z } from 'zod';

// 手机号验证模式
export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号');

// 验证码验证模式
export const codeSchema = z.string().length(6, '验证码必须是 6 位数字');

// 登录表单验证模式
export const loginFormSchema = z.object({
  phone: phoneSchema,
  code: codeSchema,
});

// 用户资料验证模式
export const userProfileSchema = z.object({
  nickname: z.string().min(2, '昵称至少 2 个字符').max(20, '昵称最多 20 个字符').optional(),
  avatar: z.string().url('请输入有效的 URL').optional(),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;
export type UserProfileSchema = z.infer<typeof userProfileSchema>;
