import { QueryClient } from '@tanstack/react-query'
import { QUERY_CONFIG } from '@/config/query.config'

export const queryClient = new QueryClient(QUERY_CONFIG)
