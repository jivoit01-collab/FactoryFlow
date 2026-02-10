import { useEffect, useRef, useCallback } from 'react'
import { type MessagePayload } from 'firebase/messaging'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/core/store'
import { fcmService, notificationService } from '@/core/notifications'
import {
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
 * Flow:
 * Login → FCM setup (permission + token) → Register device with backend → ...
 * Company select → Fetch unread count
 * Logout → Unregister device → Delete FCM token
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const dispatch = useAppDispatch()
  const { isAuthenticated, currentCompany } = useAppSelector((state) => state.auth)
  const fcmState = useAppSelector(selectFCMState)
  const messageListenerRef = useRef<(() => void) | null>(null)
  const setupAttemptedRef = useRef(false)
  const deviceRegisteredTokenRef = useRef<string | null>(null)

  /**
   * Handle incoming foreground messages
   */
  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      if (import.meta.env.DEV) {
        console.log('[NotificationProvider] Foreground message:', payload)
      }

      const notification: Notification = {
        id: Date.now(),
        type_code: payload.data?.type_code || 'UNKNOWN',
        title: payload.notification?.title || payload.data?.title || 'New Notification',
        body: payload.notification?.body || payload.data?.body || '',
        is_read: false,
        created_at: new Date().toISOString(),
      }

      dispatch(addNotification(notification))

      if (document.visibilityState === 'visible') {
        toast.info(notification.title, {
          description: notification.body,
          action: payload.data?.url
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = payload.data!.url!
                },
              }
            : undefined,
        })
      } else if (globalThis.Notification?.permission === 'granted' && payload.notification) {
        const browserNotification = new globalThis.Notification(notification.title, {
          body: notification.body,
          icon: '/pwa-192x192.png',
          tag: payload.data?.tag || 'foreground',
          data: payload.data,
        })

        browserNotification.onclick = () => {
          window.focus()
          browserNotification.close()
          if (payload.data?.url) {
            window.location.href = payload.data.url
          }
        }
      }

      // Short delay to allow backend to finish storing the notification
      setTimeout(() => dispatch(fetchUnreadCount()), 200)
    },
    [dispatch]
  )

  /**
   * Setup FCM right after login: request permission, get token.
   * Does NOT wait for company selection.
   */
  useEffect(() => {
    if (
      !isAuthenticated ||
      fcmState.token ||
      fcmState.permission === 'denied' ||
      setupAttemptedRef.current
    ) {
      return
    }

    setupAttemptedRef.current = true

    dispatch(setupPushNotifications()).catch((error) => {
      console.warn('[NotificationProvider] Push notification setup failed:', error)
    })
  }, [isAuthenticated, fcmState.token, fcmState.permission, dispatch])

  /**
   * Setup message listener when FCM has a token (meaning it's initialized)
   */
  useEffect(() => {
    if (!fcmState.token || !isAuthenticated) {
      return
    }

    messageListenerRef.current = fcmService.onMessage(handleForegroundMessage)

    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current()
        messageListenerRef.current = null
      }
    }
  }, [fcmState.token, isAuthenticated, handleForegroundMessage])

  /**
   * Register device token with backend after obtaining FCM token.
   * Does NOT wait for company selection — the register endpoint only needs Bearer auth.
   */
  useEffect(() => {
    if (
      !fcmState.token ||
      !isAuthenticated ||
      deviceRegisteredTokenRef.current === fcmState.token
    ) {
      return
    }

    deviceRegisteredTokenRef.current = fcmState.token

    notificationService.registerDevice(fcmState.token).catch((error) => {
      console.warn('[NotificationProvider] Backend device registration failed:', error)
      deviceRegisteredTokenRef.current = null
    })
  }, [fcmState.token, isAuthenticated])

  /**
   * Fetch unread count once company is selected
   */
  useEffect(() => {
    if (!isAuthenticated || !currentCompany) {
      return
    }

    dispatch(fetchUnreadCount())
  }, [isAuthenticated, currentCompany, dispatch])

  /**
   * Reset flags on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setupAttemptedRef.current = false
      deviceRegisteredTokenRef.current = null
    }
  }, [isAuthenticated])

  return <>{children}</>
}
