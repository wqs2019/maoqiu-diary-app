// React Query Provider
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { queryClient } from '../config/queryClient';

interface AppQueryProviderProps {
  children: React.ReactNode;
}

export const AppQueryProvider: React.FC<AppQueryProviderProps> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
