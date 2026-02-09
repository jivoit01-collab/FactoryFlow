import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  SendNotificationRequest,
  SendNotificationResponse,
} from '../types/sendNotification.types'

export const sendNotificationApi = {
  async send(data: SendNotificationRequest): Promise<SendNotificationResponse> {
    const response = await apiClient.post<SendNotificationResponse>(
      API_ENDPOINTS.NOTIFICATIONS.SEND,
      data
    )
    return response.data
  },
}
