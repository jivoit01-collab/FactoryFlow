import { useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '@/core/store';
import {
  fetchNotifications,
  fetchPreferences,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  selectFCMState,
  selectNotificationsState,
  selectPreferencesState,
  selectUnreadCount,
  setupPushNotifications,
  updatePreference,
} from '@/core/store/slices/notification.slice';

import type { NotificationListParams } from '../types';

/**
 * Hook for managing push notification permissions and setup
 */
export function usePushNotifications() {
  const dispatch = useAppDispatch();
  const fcmState = useAppSelector(selectFCMState);

  const requestPermission = useCallback(async () => {
    return dispatch(setupPushNotifications()).unwrap();
  }, [dispatch]);

  return {
    isSupported: fcmState.isSupported,
    isInitialized: fcmState.isInitialized,
    permission: fcmState.permission,
    token: fcmState.token,
    isLoading: fcmState.isLoading,
    error: fcmState.error,
    requestPermission,
  };
}

/**
 * Hook for managing notification list
 */
export function useNotificationList() {
  const dispatch = useAppDispatch();
  const notificationsState = useAppSelector(selectNotificationsState);

  const loadNotifications = useCallback(
    (params?: NotificationListParams) => {
      return dispatch(fetchNotifications(params));
    },
    [dispatch],
  );

  const refreshUnreadCount = useCallback(() => {
    return dispatch(fetchUnreadCount());
  }, [dispatch]);

  const markAsRead = useCallback(
    (notificationIds: number[]) => {
      return dispatch(markNotificationsAsRead(notificationIds));
    },
    [dispatch],
  );

  const markAllAsRead = useCallback(() => {
    return dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  return {
    notifications: notificationsState.items,
    unreadCount: notificationsState.unreadCount,
    totalCount: notificationsState.totalCount,
    isLoading: notificationsState.isLoading,
    error: notificationsState.error,
    loadNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * Hook for getting just the unread count
 */
export function useUnreadCount() {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadCount);

  const refresh = useCallback(() => {
    return dispatch(fetchUnreadCount());
  }, [dispatch]);

  return { unreadCount, refresh };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences() {
  const dispatch = useAppDispatch();
  const preferencesState = useAppSelector(selectPreferencesState);

  const loadPreferences = useCallback(() => {
    return dispatch(fetchPreferences());
  }, [dispatch]);

  const togglePreference = useCallback(
    (notificationTypeId: number, isEnabled: boolean) => {
      return dispatch(updatePreference({ notificationTypeId, isEnabled }));
    },
    [dispatch],
  );

  return {
    preferences: preferencesState.items,
    isLoading: preferencesState.isLoading,
    error: preferencesState.error,
    loadPreferences,
    togglePreference,
  };
}
