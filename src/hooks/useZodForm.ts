// 表单处理 Hooks
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * 使用 Zod 验证的表单 Hook
 * @param schema Zod 验证模式
 * @param defaultValues 默认值
 * @param options 其他配置
 */
export function useZodForm<T extends z.ZodType<any>>(
    schema: T,
    defaultValues?: z.infer<T>,
    options?: any,
) {
    return useForm<z.infer<T>>({
        resolver: zodResolver(schema as any),
        defaultValues,
        ...options,
    });
}

export default useZodForm;
