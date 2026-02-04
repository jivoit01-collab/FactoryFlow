import { useEffect, useRef, useCallback } from 'react'
import { type MessagePayload } from 'firebase/messaging'
import { useAppDispatch, useAppSelector } from '@/core/store'
import { fcmService } from '@/core/notifications'
import {
  initializeFCM,
  setupPushNotifications,
  fetchUnreadCount,
  addNotification,
  selectFCMState,
} from '@/core/store/slices/notification.slice'
import type { Notification } from '@/core/notifications'

interface NotificationProviderProps {
  children: React.ReactNode
}

/**
 * NotificationProvider
 *
 * Handles FCM initialization and foreground message handling.
 * Should be placed inside Redux Provider but can be anywhere in the component tree.
 *
 * Features:
 * - Initializes FCM when user is authenticated
 * - Sets up foreground message listener
 * - Automatically requests permission if not already granted
 * - Handles incoming notifications and updates Redux state
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const fcmState = useAppSelector(selectFCMState)
  const messageListenerRef = useRef<(() => void) | null>(null)
  const initAttemptedRef = useRef(false)

  /**
   * Handle incoming foreground messages
   */
  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      console.log('[NotificationProvider] Foreground message:', payload)

      // Extract notification data
      const notification: Notification = {
        id: Date.now(), // Temporary ID until we fetch from server
        type_code: payload.data?.type_code || 'UNKNOWN',
        title: payload.notification?.title || payload.data?.title || 'New Notification',
        body: payload.notification?.body || payload.data?.body || '',
        is_read: false,
        created_at: new Date().toISOString(),
      }

      // Add to Redux state
      dispatch(addNotification(notification))

      // Show browser notification for foreground messages (optional)
      // The user is in the app, so we might want to show an in-app toast instead
      if (Notification.permission === 'granted' && payload.notification) {
        // Only show browser notification if app is not visible
        if (document.visibilityState !== 'visible') {
          const browserNotification = new Notification(notification.title, {
            body: notification.body,
            icon: '/pwa-192x192.png',
            tag: payload.data?.tag || 'foreground',
            data: payload.data,
          })

          browserNotification.onclick = () => {
            window.focus()
            browserNotification.close()

            // Navigate to notification URL if provided
            if (payload.data?.url) {
              window.location.href = payload.data.url
            }
          }
        }
      }

      // Refresh unread count from server
      dispatch(fetchUnreadCount())
    },
    [dispatch]
  )

  /**
   * Initialize FCM when authenticated
   */
  useEffect(() => {
    // Only initialize once per auth session
    if (!isAuthenticated || initAttemptedRef.current) {
      return
    }

    initAttemptedRef.current = true

    const initFCM = async () => {
      try {
        // Initialize FCM service
        await dispatch(initializeFCM()).unwrap()

        // Fetch initial unread count
        dispatch(fetchUnreadCount())
      } catch (error) {
        console.warn('[NotificationProvider] FCM initialization failed:', error)
      }
    }

    initFCM()
  }, [isAuthenticated, dispatch])

  /**
   * Setup message listener when FCM is initialized
   */
  useEffect(() => {
    if (!fcmState.isInitialized || !isAuthenticated) {
      return
    }

    // Setup foreground message listener
    messageListenerRef.current = fcmService.onMessage(handleForegroundMessage)

    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current()
        messageListenerRef.current = null
      }
    }
  }, [fcmState.isInitialized, isAuthenticated, handleForegroundMessage])

  /**
   * Auto-setup push notifications if permission is already granted
   */
  useEffect(() => {
    if (!fcmState.isInitialized || !isAuthenticated) {
      return
    }

    // If permission is already granted but we don't have a token, get one
    if (fcmState.permission === 'granted' && !fcmState.token) {
      dispatch(setupPushNotifications())
    }
  }, [fcmState.isInitialized, fcmState.permission, fcmState.token, isAuthenticated, dispatch])

  /**
   * Reset init flag on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      initAttemptedRef.current = false
    }
  }, [isAuthenticated])

  return <>{children}</>
}
