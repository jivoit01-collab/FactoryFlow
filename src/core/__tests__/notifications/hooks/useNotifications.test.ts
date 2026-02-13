import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// notifications/hooks/useNotifications.ts — Notification Hooks
// (File Content Verification)
//
// Imports store hooks, notification slice actions/selectors, and
// types. Deep dependency chain through Redux store and slice —
// verify via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/core/notifications/hooks/useNotifications.ts'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('useNotifications.ts — Imports', () => {
  it('imports useCallback from react', () => {
    const content = readSource();
    expect(content).toContain('useCallback');
    expect(content).toContain("from 'react'");
  });

  it('imports useAppDispatch and useAppSelector from @/core/store', () => {
    const content = readSource();
    expect(content).toContain('useAppDispatch');
    expect(content).toContain('useAppSelector');
    expect(content).toContain("from '@/core/store'");
  });

  it('imports notification slice actions and selectors', () => {
    const content = readSource();
    const imports = [
      'setupPushNotifications',
      'fetchNotifications',
      'fetchUnreadCount',
      'markNotificationsAsRead',
      'markAllNotificationsAsRead',
      'fetchPreferences',
      'updatePreference',
      'selectFCMState',
      'selectNotificationsState',
      'selectPreferencesState',
    ];
    for (const name of imports) {
      expect(content).toContain(name);
    }
    expect(content).toContain("from '@/core/store/slices/notification.slice'");
  });

  it('imports NotificationListParams type from ../types', () => {
    const content = readSource();
    expect(content).toContain('NotificationListParams');
    expect(content).toContain("from '../types'");
  });
});

// ═══════════════════════════════════════════════════════════════
// usePushNotifications
// ═══════════════════════════════════════════════════════════════

describe('useNotifications.ts — usePushNotifications', () => {
  it('exports usePushNotifications as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+usePushNotifications\(\)/);
  });

  it('selects FCM state via selectFCMState', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector(selectFCMState)');
  });

  it('returns isSupported, isInitialized, permission, token, isLoading, error', () => {
    const content = readSource();
    expect(content).toContain('isSupported: fcmState.isSupported');
    expect(content).toContain('isInitialized: fcmState.isInitialized');
    expect(content).toContain('permission: fcmState.permission');
    expect(content).toContain('token: fcmState.token');
    expect(content).toContain('isLoading: fcmState.isLoading');
    expect(content).toContain('error: fcmState.error');
  });

  it('returns requestPermission callback that dispatches setupPushNotifications', () => {
    const content = readSource();
    expect(content).toContain('dispatch(setupPushNotifications()).unwrap()');
    expect(content).toContain('requestPermission');
  });
});

// ═══════════════════════════════════════════════════════════════
// useNotificationList
// ═══════════════════════════════════════════════════════════════

describe('useNotifications.ts — useNotificationList', () => {
  it('exports useNotificationList as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+useNotificationList\(\)/);
  });

  it('selects notifications state via selectNotificationsState', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector(selectNotificationsState)');
  });

  it('returns notifications, unreadCount, totalCount, isLoading, error', () => {
    const content = readSource();
    expect(content).toContain('notifications: notificationsState.items');
    expect(content).toContain('unreadCount: notificationsState.unreadCount');
    expect(content).toContain('totalCount: notificationsState.totalCount');
    expect(content).toContain('isLoading: notificationsState.isLoading');
    expect(content).toContain('error: notificationsState.error');
  });

  it('provides loadNotifications, refreshUnreadCount, markAsRead, markAllAsRead callbacks', () => {
    const content = readSource();
    expect(content).toContain('loadNotifications');
    expect(content).toContain('refreshUnreadCount');
    expect(content).toContain('markAsRead');
    expect(content).toContain('markAllAsRead');
  });
});

// ═══════════════════════════════════════════════════════════════
// useUnreadCount
// ═══════════════════════════════════════════════════════════════

describe('useNotifications.ts — useUnreadCount', () => {
  it('exports useUnreadCount as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+useUnreadCount\(\)/);
  });

  it('selects unread count via selectUnreadCount', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector(selectUnreadCount)');
  });

  it('returns unreadCount and refresh callback', () => {
    const content = readSource();
    expect(content).toMatch(/return\s*\{\s*unreadCount\s*,\s*refresh\s*\}/);
  });
});

// ═══════════════════════════════════════════════════════════════
// useNotificationPreferences
// ═══════════════════════════════════════════════════════════════

describe('useNotifications.ts — useNotificationPreferences', () => {
  it('exports useNotificationPreferences as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+useNotificationPreferences\(\)/);
  });

  it('selects preferences state via selectPreferencesState', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector(selectPreferencesState)');
  });

  it('returns preferences, isLoading, error, loadPreferences, togglePreference', () => {
    const content = readSource();
    expect(content).toContain('preferences: preferencesState.items');
    expect(content).toContain('isLoading: preferencesState.isLoading');
    expect(content).toContain('error: preferencesState.error');
    expect(content).toContain('loadPreferences');
    expect(content).toContain('togglePreference');
  });

  it('togglePreference dispatches updatePreference with notificationTypeId and isEnabled', () => {
    const content = readSource();
    expect(content).toContain('dispatch(updatePreference({ notificationTypeId, isEnabled }))');
  });
});
