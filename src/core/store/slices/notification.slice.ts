import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { fcmService, notificationService } from '@/core/notifications'
import type {
  Notification,
  NotificationPreference,
  NotificationListParams,
} from '@/core/notifications'

// ============================================
// State Interface
// ============================================

interface NotificationState {
  // FCM State
  fcm: {
    isSupported: boolean
    isInitialized: boolean
    permission: NotificationPermission
    token: string | null
    isLoading: boolean
    error: string | null
  }
  // Notifications List State
  notifications: {
    items: Notification[]
    unreadCount: number
    totalCount: number
    isLoading: boolean
    error: string | null
  }
  // Preferences State
  preferences: {
    items: NotificationPreference[]
    isLoading: boolean
    error: string | null
  }
}

const initialState: NotificationState = {
  fcm: {
    isSupported: true,
    isInitialized: false,
    permission: 'default',
    token: null,
    isLoading: false,
    error: null,
  },
  notifications: {
    items: [],
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    error: null,
  },
  preferences: {
    items: [],
    isLoading: false,
    error: null,
  },
}

// ============================================
// FCM Async Thunks
// ============================================

/**
 * Initialize FCM service
 */
export const initializeFCM = createAsyncThunk(
  'notification/initializeFCM',
  async (_, { rejectWithValue }) => {
    try {
      const isSupported = fcmService.isSupported()
      if (!isSupported) {
        return { isSupported: false, permission: 'denied' as NotificationPermission }
      }

      const initialized = await fcmService.initialize()
      if (!initialized) {
        return rejectWithValue('FCM initialization failed')
      }

      const permission = fcmService.getPermissionStatus()
      const token = fcmService.getCurrentToken()

      return { isSupported: true, permission, token }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'FCM initialization failed')
    }
  }
)

/**
 * Setup push notifications (request permission, get token, register)
 */
export const setupPushNotifications = createAsyncThunk(
  'notification/setupPushNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fcmService.setupPushNotifications()

      if (!result.success) {
        if (result.permission === 'denied') {
          return rejectWithValue('Notification permission denied')
        }
        return rejectWithValue('Failed to setup push notifications')
      }

      return { permission: result.permission, token: result.token }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to setup push notifications'
      )
    }
  }
)

/**
 * Cleanup push notifications (unregister and delete token)
 */
export const cleanupPushNotifications = createAsyncThunk(
  'notification/cleanupPushNotifications',
  async () => {
    await fcmService.cleanupPushNotifications()
    return true
  }
)

// ============================================
// Notification List Async Thunks
// ============================================

/**
 * Fetch notifications list
 */
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async (params: NotificationListParams | undefined, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(params)
      return response
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch notifications'
      )
    }
  }
)

/**
 * Fetch unread count
 */
export const fetchUnreadCount = createAsyncThunk(
  'notification/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const count = await notificationService.getUnreadCount()
      return count
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch unread count')
    }
  }
)

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (notificationIds: number[], { rejectWithValue, dispatch }) => {
    try {
      await notificationService.markAsRead(notificationIds)
      // Refresh unread count after marking as read
      dispatch(fetchUnreadCount())
      return notificationIds
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to mark notifications as read'
      )
    }
  }
)

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await notificationService.markAllAsRead()
      // Refresh unread count and notifications
      dispatch(fetchUnreadCount())
      dispatch(fetchNotifications(undefined))
      return true
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to mark all as read'
      )
    }
  }
)

// ============================================
// Preferences Async Thunks
// ============================================

/**
 * Fetch notification preferences
 */
export const fetchPreferences = createAsyncThunk(
  'notification/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const preferences = await notificationService.getPreferences()
      return preferences
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch preferences'
      )
    }
  }
)

/**
 * Update notification preference
 */
export const updatePreference = createAsyncThunk(
  'notification/updatePreference',
  async (
    { notificationTypeId, isEnabled }: { notificationTypeId: number; isEnabled: boolean },
    { rejectWithValue }
  ) => {
    try {
      const updated = await notificationService.updatePreference(notificationTypeId, isEnabled)
      return updated
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update preference'
      )
    }
  }
)

// ============================================
// Slice
// ============================================

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    // FCM reducers
    setFCMToken: (state, action: PayloadAction<string | null>) => {
      state.fcm.token = action.payload
    },
    setFCMPermission: (state, action: PayloadAction<NotificationPermission>) => {
      state.fcm.permission = action.payload
    },
    clearFCMError: (state) => {
      state.fcm.error = null
    },

    // Notification reducers
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add to beginning of list (newest first)
      state.notifications.items.unshift(action.payload)
      state.notifications.unreadCount += 1
      state.notifications.totalCount += 1
    },
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.notifications.unreadCount = action.payload
    },
    clearNotifications: (state) => {
      state.notifications.items = []
      state.notifications.unreadCount = 0
      state.notifications.totalCount = 0
    },

    // Reset state (e.g., on logout)
    resetNotificationState: () => initialState,
  },
  extraReducers: (builder) => {
    // ========== FCM Thunks ==========
    builder
      // initializeFCM
      .addCase(initializeFCM.pending, (state) => {
        state.fcm.isLoading = true
        state.fcm.error = null
      })
      .addCase(initializeFCM.fulfilled, (state, action) => {
        state.fcm.isLoading = false
        state.fcm.isInitialized = true
        state.fcm.isSupported = action.payload.isSupported
        state.fcm.permission = action.payload.permission
        if (action.payload.token) {
          state.fcm.token = action.payload.token
        }
      })
      .addCase(initializeFCM.rejected, (state, action) => {
        state.fcm.isLoading = false
        state.fcm.error = action.payload as string
      })

      // setupPushNotifications
      .addCase(setupPushNotifications.pending, (state) => {
        state.fcm.isLoading = true
        state.fcm.error = null
      })
      .addCase(setupPushNotifications.fulfilled, (state, action) => {
        state.fcm.isLoading = false
        state.fcm.permission = action.payload.permission
        state.fcm.token = action.payload.token
      })
      .addCase(setupPushNotifications.rejected, (state, action) => {
        state.fcm.isLoading = false
        state.fcm.error = action.payload as string
      })

      // cleanupPushNotifications
      .addCase(cleanupPushNotifications.fulfilled, (state) => {
        state.fcm.token = null
        state.fcm.isInitialized = false
      })

    // ========== Notification List Thunks ==========
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.notifications.isLoading = true
        state.notifications.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications.isLoading = false
        state.notifications.items = action.payload.results
        state.notifications.unreadCount = action.payload.unread_count
        state.notifications.totalCount = action.payload.count
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.notifications.isLoading = false
        state.notifications.error = action.payload as string
      })

      // fetchUnreadCount
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.notifications.unreadCount = action.payload
      })

      // markNotificationsAsRead
      .addCase(markNotificationsAsRead.fulfilled, (state, action) => {
        const readIds = action.payload
        state.notifications.items = state.notifications.items.map((notification) =>
          readIds.includes(notification.id) ? { ...notification, is_read: true } : notification
        )
      })

    // ========== Preferences Thunks ==========
    builder
      // fetchPreferences
      .addCase(fetchPreferences.pending, (state) => {
        state.preferences.isLoading = true
        state.preferences.error = null
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferences.isLoading = false
        state.preferences.items = action.payload
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.preferences.isLoading = false
        state.preferences.error = action.payload as string
      })

      // updatePreference
      .addCase(updatePreference.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.preferences.items.findIndex((p) => p.id === updated.id)
        if (index !== -1) {
          state.preferences.items[index] = updated
        }
      })
  },
})

// Export actions
export const {
  setFCMToken,
  setFCMPermission,
  clearFCMError,
  addNotification,
  updateUnreadCount,
  clearNotifications,
  resetNotificationState,
} = notificationSlice.actions

// Export reducer
export default notificationSlice.reducer

// ============================================
// Selectors
// ============================================

export const selectFCMState = (state: { notification: NotificationState }) => state.notification.fcm
export const selectNotificationsState = (state: { notification: NotificationState }) =>
  state.notification.notifications
export const selectPreferencesState = (state: { notification: NotificationState }) =>
  state.notification.preferences
export const selectUnreadCount = (state: { notification: NotificationState }) =>
  state.notification.notifications.unreadCount
export const selectIsFCMSupported = (state: { notification: NotificationState }) =>
  state.notification.fcm.isSupported
export const selectFCMPermission = (state: { notification: NotificationState }) =>
  state.notification.fcm.permission
