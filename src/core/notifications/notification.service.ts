import { apiClient } from '../api'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  Notification,
  NotificationDetail,
  NotificationListResponse,
  NotificationListParams,
  NotificationPreference,
  NotificationPreferenceUpdate,
  MarkReadRequest,
  MarkReadResponse,
  UnreadCountResponse,
  TestNotificationRequest,
  TestNotificationResponse,
} from './types'

/**
 * Notification Service
 * Handles all notification-related API calls
 */
class NotificationService {
  /**
   * Get list of notifications with optional filters
   */
  async getNotifications(params?: NotificationListParams): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>(
      API_ENDPOINTS.NOTIFICATIONS.LIST,
      { params }
    )
    return response.data
  }

  /**
   * Get notification detail by ID
   * Note: This automatically marks the notification as read
   */
  async getNotificationDetail(id: number): Promise<NotificationDetail> {
    const response = await apiClient.get<NotificationDetail>(
      API_ENDPOINTS.NOTIFICATIONS.DETAIL(id)
    )
    return response.data
  }

  /**
   * Mark notifications as read
   * Pass empty array to mark all as read
   */
  async markAsRead(notificationIds: number[]): Promise<MarkReadResponse> {
    const payload: MarkReadRequest = {
      notification_ids: notificationIds,
    }
    const response = await apiClient.post<MarkReadResponse>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_READ,
      payload
    )
    return response.data
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    return this.markAsRead([])
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
    )
    return response.data.unread_count
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<NotificationPreference[]>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES
    )
    return response.data
  }

  /**
   * Update notification preference
   */
  async updatePreference(
    notificationTypeId: number,
    isEnabled: boolean
  ): Promise<NotificationPreference> {
    const payload: NotificationPreferenceUpdate = {
      notification_type_id: notificationTypeId,
      is_enabled: isEnabled,
    }
    const response = await apiClient.post<NotificationPreference>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
      payload
    )
    return response.data
  }

  /**
   * Register device FCM token with backend
   */
  async registerDevice(fcmToken: string): Promise<{ message: string; device_id: number }> {
    const response = await apiClient.post<{ message: string; device_id: number }>(
      API_ENDPOINTS.NOTIFICATIONS.DEVICES.REGISTER,
      {
        fcm_token: fcmToken,
        device_type: 'WEB',
        device_info: navigator.userAgent,
      }
    )
    return response.data
  }

  /**
   * Unregister device FCM token from backend
   */
  async unregisterDevice(fcmToken: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.NOTIFICATIONS.DEVICES.UNREGISTER,
      { fcm_token: fcmToken }
    )
    return response.data
  }

  /**
   * Send test notification (development only)
   */
  async sendTestNotification(
    token: string,
    title: string,
    body: string
  ): Promise<TestNotificationResponse> {
    const payload: TestNotificationRequest = {
      token,
      title,
      body,
    }
    const response = await apiClient.post<TestNotificationResponse>(
      API_ENDPOINTS.NOTIFICATIONS.TEST,
      payload
    )
    return response.data
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

// Export types for convenience
export type { Notification, NotificationDetail, NotificationListResponse, NotificationPreference }
