import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import type { QueryClientConfig } from '@tanstack/react-query';

const queryClientConfigs: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: 60000,
      staleTime: 40000,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    },
  },
};

export const queryClient = new QueryClient(queryClientConfigs);
