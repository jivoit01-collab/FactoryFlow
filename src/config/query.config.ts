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

  // Gate In
  gateIn: {
    all: ['gateIn'] as const,
    lists: () => [...QUERY_KEYS.gateIn.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...QUERY_KEYS.gateIn.lists(), filters] as const,
    details: () => [...QUERY_KEYS.gateIn.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.gateIn.details(), id] as const,
  },

  // Quality Check
  qualityCheck: {
    all: ['qualityCheck'] as const,
    lists: () => [...QUERY_KEYS.qualityCheck.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...QUERY_KEYS.qualityCheck.lists(), filters] as const,
    details: () => [...QUERY_KEYS.qualityCheck.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.qualityCheck.details(), id] as const,
    items: () => [...QUERY_KEYS.qualityCheck.all, 'items'] as const,
    summary: () => [...QUERY_KEYS.qualityCheck.all, 'summary'] as const,
    inspection: (id: number) => [...QUERY_KEYS.qualityCheck.all, 'inspection', id] as const,
  },
} as const
