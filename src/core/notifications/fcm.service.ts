import { deleteToken, getToken, type MessagePayload, onMessage } from 'firebase/messaging'

import {
  getFCMServiceWorkerRegistration,
  getFirebaseMessaging,
  initializeFirebase,
  isFirebaseConfigured,
} from '@/config/firebase.config'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

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
        if (import.meta.env.DEV) {
          console.log('[FCM] Foreground message received:', payload)
        }
        this.notifyListeners(payload)
      })

      this.initialized = true
      if (import.meta.env.DEV) {
        console.log('[FCM] Service initialized successfully')
      }
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
      if (import.meta.env.DEV) {
        console.log('[FCM] Permission status:', permission)
      }
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
        if (import.meta.env.DEV) {
          console.log('[FCM] Token obtained successfully')
        }
        this.currentToken = token
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
      if (import.meta.env.DEV) {
        console.log('[FCM] Token deleted successfully')
      }
      return true
    } catch (error) {
      console.error('[FCM] Failed to delete token:', error)
      return false
    }
  }

  /**
   * Full setup flow: initialize, request permission, and get token.
   */
  async setupPushNotifications(): Promise<{
    success: boolean
    permission: NotificationPermission
    token: string | null
  }> {
    const initialized = await this.initialize()
    if (!initialized) {
      return { success: false, permission: 'denied', token: null }
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      return { success: false, permission, token: null }
    }

    const token = await this.getDeviceToken()
    if (!token) {
      return { success: false, permission, token: null }
    }

    return { success: true, permission, token }
  }

  /**
   * Cleanup: delete FCM token on logout
   */
  async cleanupPushNotifications(): Promise<void> {
    try {
      await this.deleteDeviceToken()
      if (import.meta.env.DEV) {
        console.log('[FCM] Push notifications cleaned up')
      }
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
   * Get the current in-memory token
   */
  getCurrentToken(): string | null {
    return this.currentToken
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
}

// Export singleton instance
export const fcmService = new FCMService()
