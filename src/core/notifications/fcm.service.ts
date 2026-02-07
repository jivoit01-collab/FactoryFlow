import { getToken, onMessage, deleteToken, type MessagePayload } from 'firebase/messaging'
import {
  initializeFirebase,
  getFirebaseMessaging,
  getFCMServiceWorkerRegistration,
  isFirebaseConfigured,
} from '@/config/firebase.config'
import { apiClient } from '../api'
import { API_ENDPOINTS } from '@/config/constants'
import type { DeviceTokenResponse, DeviceTokenRequest } from './types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const FCM_TOKEN_KEY = 'fcm_token'

type MessageListener = (payload: MessagePayload) => void

class FCMService {
  private initialized = false
  private messageListeners: MessageListener[] = []
  private currentToken: string | null = null

  /**
   * Check if FCM is supported in the current environment
   */
  isSupported(): boolean {
    return (
      isFirebaseConfigured() &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  }

  /**
   * Check if running as installed PWA
   */
  isPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  }

  /**
   * Get the current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * Initialize Firebase Cloud Messaging
   * Sets up message listeners for foreground notifications
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true

    if (!this.isSupported()) {
      console.warn('[FCM] Push notifications are not supported in this browser')
      return false
    }

    try {
      const { messaging } = await initializeFirebase()

      if (!messaging) {
        console.warn('[FCM] Firebase messaging not available')
        return false
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload)
        this.notifyListeners(payload)
      })

      // Load stored token
      this.currentToken = this.getStoredToken()

      this.initialized = true
      console.log('[FCM] Service initialized successfully')
      return true
    } catch (error) {
      console.error('[FCM] Initialization failed:', error)
      return false
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      console.log('[FCM] Permission status:', permission)
      return permission
    } catch (error) {
      console.error('[FCM] Permission request failed:', error)
      return 'denied'
    }
  }

  /**
   * Get FCM device token
   * Requires notification permission to be granted
   */
  async getDeviceToken(): Promise<string | null> {
    const messaging = getFirebaseMessaging()
    if (!messaging) {
      console.warn('[FCM] Messaging not initialized')
      return null
    }

    if (Notification.permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted')
      return null
    }

    try {
      const swRegistration = getFCMServiceWorkerRegistration()

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration || undefined,
      })

      if (token) {
        console.log('[FCM] Token obtained successfully')
        this.currentToken = token
        this.storeToken(token)
      }

      return token
    } catch (error) {
      console.error('[FCM] Failed to get token:', error)

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('messaging/permission-blocked')) {
          console.warn('[FCM] Notifications are blocked by the browser')
        } else if (error.message.includes('messaging/unsupported-browser')) {
          console.warn('[FCM] Browser does not support push notifications')
        }
      }

      return null
    }
  }

  /**
   * Delete the current FCM token
   * Call this when user logs out or disables notifications
   */
  async deleteDeviceToken(): Promise<boolean> {
    const messaging = getFirebaseMessaging()
    if (!messaging) return false

    try {
      await deleteToken(messaging)
      this.currentToken = null
      this.clearStoredToken()
      console.log('[FCM] Token deleted successfully')
      return true
    } catch (error) {
      console.error('[FCM] Failed to delete token:', error)
      return false
    }
  }

  /**
   * Register the device token with the backend
   */
  async registerWithBackend(token: string, deviceName?: string): Promise<DeviceTokenResponse | null> {
    try {
      const payload: DeviceTokenRequest = {
        token,
        platform: 'WEB',
        device_name: deviceName || this.getDeviceName(),
      }

      const response = await apiClient.post<DeviceTokenResponse>(
        API_ENDPOINTS.NOTIFICATIONS.DEVICE_TOKENS,
        payload
      )

      console.log('[FCM] Device registered with backend:', response.data)
      return response.data
    } catch (error) {
      console.error('[FCM] Backend registration failed:', error)
      return null
    }
  }

  /**
   * Unregister the device token from the backend
   */
  async unregisterFromBackend(token?: string): Promise<boolean> {
    const tokenToUnregister = token || this.currentToken || this.getStoredToken()

    if (!tokenToUnregister) {
      console.warn('[FCM] No token to unregister')
      return false
    }

    try {
      await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DEVICE_TOKENS, {
        data: { token: tokenToUnregister },
      })

      console.log('[FCM] Device unregistered from backend')
      return true
    } catch (error) {
      console.error('[FCM] Backend unregistration failed:', error)
      return false
    }
  }

  /**
   * Full setup flow: request permission, get token, register with backend
   */
  async setupPushNotifications(): Promise<{
    success: boolean
    permission: NotificationPermission
    token: string | null
  }> {
    // Initialize FCM
    const initialized = await this.initialize()
    if (!initialized) {
      return { success: false, permission: 'denied', token: null }
    }

    // Request permission
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      return { success: false, permission, token: null }
    }

    // Get FCM token
    const token = await this.getDeviceToken()
    if (!token) {
      return { success: false, permission, token: null }
    }

    // Register with backend
    const registered = await this.registerWithBackend(token)
    if (!registered) {
      return { success: false, permission, token }
    }

    return { success: true, permission, token }
  }

  /**
   * Full cleanup flow: unregister from backend, delete token
   * Call this on logout or when disabling notifications
   */
  async cleanupPushNotifications(): Promise<void> {
    try {
      // Unregister from backend first
      await this.unregisterFromBackend()

      // Then delete the FCM token
      await this.deleteDeviceToken()

      console.log('[FCM] Push notifications cleaned up')
    } catch (error) {
      console.error('[FCM] Cleanup failed:', error)
    }
  }

  /**
   * Subscribe to foreground messages
   * Returns an unsubscribe function
   */
  onMessage(callback: MessageListener): () => void {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== callback)
    }
  }

  /**
   * Get the current stored token
   */
  getCurrentToken(): string | null {
    return this.currentToken || this.getStoredToken()
  }

  // Private methods

  private notifyListeners(payload: MessagePayload): void {
    this.messageListeners.forEach((listener) => {
      try {
        listener(payload)
      } catch (error) {
        console.error('[FCM] Message listener error:', error)
      }
    })
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent
    const platform = this.isPWA() ? 'PWA' : 'Browser'

    if (ua.includes('Chrome')) return `Chrome ${platform}`
    if (ua.includes('Firefox')) return `Firefox ${platform}`
    if (ua.includes('Safari')) return `Safari ${platform}`
    if (ua.includes('Edge')) return `Edge ${platform}`

    return `Web ${platform}`
  }

  private storeToken(token: string): void {
    try {
      localStorage.setItem(FCM_TOKEN_KEY, token)
    } catch (error) {
      console.warn('[FCM] Failed to store token:', error)
    }
  }

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(FCM_TOKEN_KEY)
    } catch {
      return null
    }
  }

  private clearStoredToken(): void {
    try {
      localStorage.removeItem(FCM_TOKEN_KEY)
    } catch (error) {
      console.warn('[FCM] Failed to clear stored token:', error)
    }
  }
}

// Export singleton instance
export const fcmService = new FCMService()
