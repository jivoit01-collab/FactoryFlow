import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Notification Service (src/core/notifications/notification.service.ts)
// Direct Import + Mock
//
// Mock @/core/api (apiClient) and @/config/constants (API_ENDPOINTS).
// ═══════════════════════════════════════════════════════════════

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/core/api', () => ({
  apiClient: { get: mockGet, post: mockPost },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    NOTIFICATIONS: {
      LIST: '/notifications/',
      DETAIL: (id: number) => `/notifications/${id}/`,
      UNREAD_COUNT: '/notifications/unread-count/',
      MARK_READ: '/notifications/mark-read/',
      PREFERENCES: '/notifications/preferences/',
      TEST: '/notifications/test/',
      DEVICES: {
        REGISTER: '/notifications/devices/register/',
        UNREGISTER: '/notifications/devices/unregister/',
      },
    },
  },
}));

import { notificationService } from '@/core/notifications/notification.service';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getNotifications ─────────────────────────────────────

  it('getNotifications calls GET with LIST endpoint', async () => {
    mockGet.mockResolvedValue({ data: { results: [], count: 0, unread_count: 0 } });
    const result = await notificationService.getNotifications();
    expect(mockGet).toHaveBeenCalledWith('/notifications/', { params: undefined });
    expect(result).toEqual({ results: [], count: 0, unread_count: 0 });
  });

  it('getNotifications passes params', async () => {
    mockGet.mockResolvedValue({ data: { results: [], count: 0, unread_count: 0 } });
    await notificationService.getNotifications({ is_read: false, limit: 10 });
    expect(mockGet).toHaveBeenCalledWith('/notifications/', {
      params: { is_read: false, limit: 10 },
    });
  });

  // ─── getNotificationDetail ────────────────────────────────

  it('getNotificationDetail calls GET with DETAIL endpoint', async () => {
    mockGet.mockResolvedValue({ data: { id: 5, title: 'Test' } });
    const result = await notificationService.getNotificationDetail(5);
    expect(mockGet).toHaveBeenCalledWith('/notifications/5/');
    expect(result.id).toBe(5);
  });

  // ─── markAsRead ───────────────────────────────────────────

  it('markAsRead calls POST with notification_ids', async () => {
    mockPost.mockResolvedValue({ data: { message: 'OK' } });
    const result = await notificationService.markAsRead([1, 2, 3]);
    expect(mockPost).toHaveBeenCalledWith('/notifications/mark-read/', {
      notification_ids: [1, 2, 3],
    });
    expect(result.message).toBe('OK');
  });

  // ─── markAllAsRead ────────────────────────────────────────

  it('markAllAsRead calls markAsRead with empty array', async () => {
    mockPost.mockResolvedValue({ data: { message: 'All read' } });
    const result = await notificationService.markAllAsRead();
    expect(mockPost).toHaveBeenCalledWith('/notifications/mark-read/', { notification_ids: [] });
    expect(result.message).toBe('All read');
  });

  // ─── getUnreadCount ───────────────────────────────────────

  it('getUnreadCount returns the unread_count number', async () => {
    mockGet.mockResolvedValue({ data: { unread_count: 7 } });
    const result = await notificationService.getUnreadCount();
    expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count/');
    expect(result).toBe(7);
  });

  // ─── getPreferences ───────────────────────────────────────

  it('getPreferences calls GET PREFERENCES endpoint', async () => {
    const prefs = [{ id: 1, code: 'QC', name: 'QC', description: 'D', is_enabled: true }];
    mockGet.mockResolvedValue({ data: prefs });
    const result = await notificationService.getPreferences();
    expect(mockGet).toHaveBeenCalledWith('/notifications/preferences/');
    expect(result).toEqual(prefs);
  });

  // ─── updatePreference ─────────────────────────────────────

  it('updatePreference calls POST with preference update', async () => {
    const updated = { id: 1, code: 'QC', name: 'QC', description: 'D', is_enabled: false };
    mockPost.mockResolvedValue({ data: updated });
    const result = await notificationService.updatePreference(1, false);
    expect(mockPost).toHaveBeenCalledWith('/notifications/preferences/', {
      notification_type_id: 1,
      is_enabled: false,
    });
    expect(result.is_enabled).toBe(false);
  });

  // ─── registerDevice ───────────────────────────────────────

  it('registerDevice sends fcm_token and device_type', async () => {
    mockPost.mockResolvedValue({ data: { message: 'Registered', device_id: 10 } });
    const result = await notificationService.registerDevice('fcm-token-123');
    expect(mockPost).toHaveBeenCalledWith('/notifications/devices/register/', {
      fcm_token: 'fcm-token-123',
      device_type: 'WEB',
      device_info: navigator.userAgent,
    });
    expect(result.device_id).toBe(10);
  });

  // ─── unregisterDevice ─────────────────────────────────────

  it('unregisterDevice sends fcm_token', async () => {
    mockPost.mockResolvedValue({ data: { message: 'Unregistered' } });
    const result = await notificationService.unregisterDevice('fcm-token-123');
    expect(mockPost).toHaveBeenCalledWith('/notifications/devices/unregister/', {
      fcm_token: 'fcm-token-123',
    });
    expect(result.message).toBe('Unregistered');
  });

  // ─── sendTestNotification ─────────────────────────────────

  it('sendTestNotification sends token, title, body', async () => {
    mockPost.mockResolvedValue({ data: { success: true, message_id: 'msg-1', error: null } });
    const result = await notificationService.sendTestNotification('tok', 'Title', 'Body');
    expect(mockPost).toHaveBeenCalledWith('/notifications/test/', {
      token: 'tok',
      title: 'Title',
      body: 'Body',
    });
    expect(result.success).toBe(true);
  });

  // ─── Singleton ────────────────────────────────────────────

  it('exports notificationService as singleton', () => {
    expect(notificationService).toBeDefined();
    expect(typeof notificationService.getNotifications).toBe('function');
  });
});
