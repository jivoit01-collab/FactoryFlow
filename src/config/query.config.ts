import type { QueryClientConfig } from '@tanstack/react-query'

export const QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
}

export const QUERY_KEYS = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
  },

} as const
