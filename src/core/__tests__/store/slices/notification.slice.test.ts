import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Notification Slice (src/core/store/slices/notification.slice.ts)
// Direct Import + Mock
//
// Mock @/core/notifications before import.
// ═══════════════════════════════════════════════════════════════

const { mockFcmService, mockNotificationService } = vi.hoisted(() => ({
  mockFcmService: {
    setupPushNotifications: vi.fn(),
    cleanupPushNotifications: vi.fn(),
    getCurrentToken: vi.fn(),
    onMessage: vi.fn(),
  },
  mockNotificationService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getPreferences: vi.fn(),
    updatePreference: vi.fn(),
    registerDevice: vi.fn(),
    unregisterDevice: vi.fn(),
  },
}));

vi.mock('@/core/notifications', () => ({
  fcmService: mockFcmService,
  notificationService: mockNotificationService,
}));

import reducer, {
  setFCMToken,
  setFCMPermission,
  clearFCMError,
  addNotification,
  updateUnreadCount,
  clearNotifications,
  resetNotificationState,
  setupPushNotifications,
  cleanupPushNotifications,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  fetchPreferences,
  updatePreference,
  selectFCMState,
  selectNotificationsState,
  selectPreferencesState,
  selectUnreadCount,
  selectIsFCMSupported,
  selectFCMPermission,
} from '@/core/store/slices/notification.slice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('Notification Slice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Initial State ────────────────────────────────────────

  it('has correct initial FCM state', () => {
    expect(initialState.fcm).toEqual({
      isSupported: true,
      isInitialized: false,
      permission: 'default',
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it('has correct initial notifications state', () => {
    expect(initialState.notifications).toEqual({
      items: [],
      unreadCount: 0,
      totalCount: 0,
      isLoading: false,
      error: null,
    });
  });

  it('has correct initial preferences state', () => {
    expect(initialState.preferences).toEqual({
      items: [],
      isLoading: false,
      error: null,
    });
  });

  // ─── Sync Reducers ───────────────────────────────────────

  it('setFCMToken sets fcm.token', () => {
    const state = reducer(initialState, setFCMToken('new-token'));
    expect(state.fcm.token).toBe('new-token');
  });

  it('setFCMToken sets token to null', () => {
    const withToken = reducer(initialState, setFCMToken('tok'));
    const state = reducer(withToken, setFCMToken(null));
    expect(state.fcm.token).toBeNull();
  });

  it('setFCMPermission sets fcm.permission', () => {
    const state = reducer(initialState, setFCMPermission('granted'));
    expect(state.fcm.permission).toBe('granted');
  });

  it('clearFCMError clears fcm.error', () => {
    const withError = { ...initialState, fcm: { ...initialState.fcm, error: 'some error' } };
    const state = reducer(withError, clearFCMError());
    expect(state.fcm.error).toBeNull();
  });

  it('addNotification prepends to items and increments counts', () => {
    const notification = {
      id: 1,
      type_code: 'QC_PENDING',
      title: 'T',
      body: 'B',
      is_read: false,
      created_at: '2024-01-01',
    };
    const state = reducer(initialState, addNotification(notification as any));
    expect(state.notifications.items[0]).toEqual(notification);
    expect(state.notifications.unreadCount).toBe(1);
    expect(state.notifications.totalCount).toBe(1);
  });

  it('updateUnreadCount sets unreadCount', () => {
    const state = reducer(initialState, updateUnreadCount(42));
    expect(state.notifications.unreadCount).toBe(42);
  });

  it('clearNotifications empties items and resets counts', () => {
    const withItems = {
      ...initialState,
      notifications: {
        ...initialState.notifications,
        items: [{ id: 1 }] as any,
        unreadCount: 5,
        totalCount: 10,
      },
    };
    const state = reducer(withItems, clearNotifications());
    expect(state.notifications.items).toEqual([]);
    expect(state.notifications.unreadCount).toBe(0);
    expect(state.notifications.totalCount).toBe(0);
  });

  it('resetNotificationState returns to initial', () => {
    const modified = reducer(initialState, setFCMToken('tok'));
    const state = reducer(modified, resetNotificationState());
    expect(state).toEqual(initialState);
  });

  // ─── setupPushNotifications Thunk ─────────────────────────

  it('setupPushNotifications.pending sets isLoading and clears error', () => {
    const state = reducer(initialState, { type: setupPushNotifications.pending.type });
    expect(state.fcm.isLoading).toBe(true);
    expect(state.fcm.error).toBeNull();
  });

  it('setupPushNotifications.fulfilled sets token, permission, isInitialized', () => {
    const state = reducer(initialState, {
      type: setupPushNotifications.fulfilled.type,
      payload: { permission: 'granted', token: 'fcm-token' },
    });
    expect(state.fcm.isLoading).toBe(false);
    expect(state.fcm.isInitialized).toBe(true);
    expect(state.fcm.permission).toBe('granted');
    expect(state.fcm.token).toBe('fcm-token');
  });

  it('setupPushNotifications.rejected sets error', () => {
    const state = reducer(initialState, {
      type: setupPushNotifications.rejected.type,
      payload: 'Notification permission denied',
    });
    expect(state.fcm.isLoading).toBe(false);
    expect(state.fcm.error).toBe('Notification permission denied');
  });

  // ─── cleanupPushNotifications Thunk ───────────────────────

  it('cleanupPushNotifications.fulfilled resets token and isInitialized', () => {
    const withToken = {
      ...initialState,
      fcm: { ...initialState.fcm, token: 'tok', isInitialized: true },
    };
    const state = reducer(withToken, { type: cleanupPushNotifications.fulfilled.type });
    expect(state.fcm.token).toBeNull();
    expect(state.fcm.isInitialized).toBe(false);
  });

  // ─── fetchNotifications Thunk ─────────────────────────────

  it('fetchNotifications.pending sets isLoading', () => {
    const state = reducer(initialState, { type: fetchNotifications.pending.type });
    expect(state.notifications.isLoading).toBe(true);
    expect(state.notifications.error).toBeNull();
  });

  it('fetchNotifications.fulfilled sets items, unreadCount, totalCount', () => {
    const state = reducer(initialState, {
      type: fetchNotifications.fulfilled.type,
      payload: { results: [{ id: 1 }], unread_count: 3, count: 10 },
    });
    expect(state.notifications.isLoading).toBe(false);
    expect(state.notifications.items).toEqual([{ id: 1 }]);
    expect(state.notifications.unreadCount).toBe(3);
    expect(state.notifications.totalCount).toBe(10);
  });

  it('fetchNotifications.rejected sets error', () => {
    const state = reducer(initialState, {
      type: fetchNotifications.rejected.type,
      payload: 'Failed to fetch',
    });
    expect(state.notifications.isLoading).toBe(false);
    expect(state.notifications.error).toBe('Failed to fetch');
  });

  // ─── fetchUnreadCount Thunk ───────────────────────────────

  it('fetchUnreadCount.fulfilled sets unreadCount', () => {
    const state = reducer(initialState, {
      type: fetchUnreadCount.fulfilled.type,
      payload: 7,
    });
    expect(state.notifications.unreadCount).toBe(7);
  });

  // ─── markNotificationsAsRead Thunk ────────────────────────

  it('markNotificationsAsRead.fulfilled marks items as read', () => {
    const withItems = {
      ...initialState,
      notifications: {
        ...initialState.notifications,
        items: [
          { id: 1, is_read: false },
          { id: 2, is_read: false },
          { id: 3, is_read: false },
        ] as any,
      },
    };
    const state = reducer(withItems, {
      type: markNotificationsAsRead.fulfilled.type,
      payload: [1, 3],
    });
    expect(state.notifications.items[0].is_read).toBe(true);
    expect(state.notifications.items[1].is_read).toBe(false);
    expect(state.notifications.items[2].is_read).toBe(true);
  });

  // ─── fetchPreferences Thunk ───────────────────────────────

  it('fetchPreferences.pending sets isLoading', () => {
    const state = reducer(initialState, { type: fetchPreferences.pending.type });
    expect(state.preferences.isLoading).toBe(true);
    expect(state.preferences.error).toBeNull();
  });

  it('fetchPreferences.fulfilled sets items', () => {
    const prefs = [{ id: 1, code: 'QC', name: 'QC', description: 'D', is_enabled: true }];
    const state = reducer(initialState, {
      type: fetchPreferences.fulfilled.type,
      payload: prefs,
    });
    expect(state.preferences.isLoading).toBe(false);
    expect(state.preferences.items).toEqual(prefs);
  });

  it('fetchPreferences.rejected sets error', () => {
    const state = reducer(initialState, {
      type: fetchPreferences.rejected.type,
      payload: 'Failed',
    });
    expect(state.preferences.isLoading).toBe(false);
    expect(state.preferences.error).toBe('Failed');
  });

  // ─── updatePreference Thunk ───────────────────────────────

  it('updatePreference.fulfilled updates matching preference', () => {
    const withPrefs = {
      ...initialState,
      preferences: {
        ...initialState.preferences,
        items: [{ id: 1, code: 'QC', name: 'QC', description: 'D', is_enabled: true }],
      },
    };
    const state = reducer(withPrefs, {
      type: updatePreference.fulfilled.type,
      payload: { id: 1, code: 'QC', name: 'QC', description: 'D', is_enabled: false },
    });
    expect(state.preferences.items[0].is_enabled).toBe(false);
  });

  // ─── Selectors ────────────────────────────────────────────

  it('selectFCMState returns fcm', () => {
    const root = { notification: initialState };
    expect(selectFCMState(root)).toEqual(initialState.fcm);
  });

  it('selectNotificationsState returns notifications', () => {
    const root = { notification: initialState };
    expect(selectNotificationsState(root)).toEqual(initialState.notifications);
  });

  it('selectPreferencesState returns preferences', () => {
    const root = { notification: initialState };
    expect(selectPreferencesState(root)).toEqual(initialState.preferences);
  });

  it('selectUnreadCount returns unreadCount', () => {
    const root = { notification: initialState };
    expect(selectUnreadCount(root)).toBe(0);
  });

  it('selectIsFCMSupported returns isSupported', () => {
    const root = { notification: initialState };
    expect(selectIsFCMSupported(root)).toBe(true);
  });

  it('selectFCMPermission returns permission', () => {
    const root = { notification: initialState };
    expect(selectFCMPermission(root)).toBe('default');
  });

  // ─── Exports ──────────────────────────────────────────────

  it('exports default reducer', () => {
    expect(typeof reducer).toBe('function');
  });
});
