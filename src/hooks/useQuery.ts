// 自定义 Hooks - React Query
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';

// 通用查询 Hook
export const useAppQuery = <TData, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
};

// 通用突变 Hook
export const useAppMutation = <
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationKey: unknown[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationKey' | 'mutationFn'
  >
) => {
  return useMutation({
    mutationKey,
    mutationFn,
    ...options,
  });
};

export { useQueryClient };
