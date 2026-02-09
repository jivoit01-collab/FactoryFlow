import { useQuery, useMutation } from '@tanstack/react-query'
import { usersApi } from './users.api'
import { sendNotificationApi } from './sendNotification.api'
import type { SendNotificationRequest } from '../types/sendNotification.types'

export const NOTIFICATION_QUERY_KEYS = {
  users: ['company-users'] as const,
}

export function useCompanyUsers() {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.users,
    queryFn: () => usersApi.getUsers(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (data: SendNotificationRequest) => sendNotificationApi.send(data),
  })
}
