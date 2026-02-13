import { describe, it, expect } from 'vitest';
import { NotificationTypeCode } from '@/core/notifications/types';
import type {
  Platform,
  DeviceType,
  NotificationStatus,
  PermissionState,
  DeviceTokenRequest,
  DeviceTokenResponse,
  NotificationType,
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
  NotificationPayload,
  NotificationTypeCodeType,
} from '@/core/notifications/types';

// ═══════════════════════════════════════════════════════════════
// Notification Types (src/core/notifications/types.ts) — Direct Import
//
// Pure TS types + NotificationTypeCode const. Zero runtime deps.
// ═══════════════════════════════════════════════════════════════

describe('Notification Types', () => {
  // ─── NotificationTypeCode ─────────────────────────────────

  it('NotificationTypeCode has exactly 15 entries', () => {
    expect(Object.keys(NotificationTypeCode)).toHaveLength(15);
  });

  it('contains all person-related codes', () => {
    expect(NotificationTypeCode.PERSON_ENTRY).toBe('PERSON_ENTRY');
    expect(NotificationTypeCode.PERSON_EXIT).toBe('PERSON_EXIT');
    expect(NotificationTypeCode.LONG_DURATION_ALERT).toBe('LONG_DURATION_ALERT');
    expect(NotificationTypeCode.BLACKLISTED_PERSON).toBe('BLACKLISTED_PERSON');
  });

  it('contains all vehicle-related codes', () => {
    expect(NotificationTypeCode.VEHICLE_ENTRY).toBe('VEHICLE_ENTRY');
    expect(NotificationTypeCode.VEHICLE_EXIT).toBe('VEHICLE_EXIT');
  });

  it('contains all gate-in codes', () => {
    expect(NotificationTypeCode.RAW_MATERIAL_GATEIN).toBe('RAW_MATERIAL_GATEIN');
    expect(NotificationTypeCode.DAILY_NEEDS_GATEIN).toBe('DAILY_NEEDS_GATEIN');
    expect(NotificationTypeCode.MAINTENANCE_GATEIN).toBe('MAINTENANCE_GATEIN');
    expect(NotificationTypeCode.CONSTRUCTION_GATEIN).toBe('CONSTRUCTION_GATEIN');
  });

  it('contains all QC codes', () => {
    expect(NotificationTypeCode.QC_PENDING).toBe('QC_PENDING');
    expect(NotificationTypeCode.QC_COMPLETED).toBe('QC_COMPLETED');
    expect(NotificationTypeCode.QC_FAILED).toBe('QC_FAILED');
  });

  it('contains weighment and security codes', () => {
    expect(NotificationTypeCode.WEIGHMENT_COMPLETED).toBe('WEIGHMENT_COMPLETED');
    expect(NotificationTypeCode.SECURITY_ALERT).toBe('SECURITY_ALERT');
  });

  // ─── Type Aliases ─────────────────────────────────────────

  it('Platform type allows ANDROID, IOS, WEB', () => {
    const platforms: Platform[] = ['ANDROID', 'IOS', 'WEB'];
    expect(platforms).toHaveLength(3);
  });

  it('DeviceType allows browser and pwa', () => {
    const types: DeviceType[] = ['browser', 'pwa'];
    expect(types).toHaveLength(2);
  });

  it('NotificationStatus allows PENDING, SENT, FAILED, DELIVERED', () => {
    const statuses: NotificationStatus[] = ['PENDING', 'SENT', 'FAILED', 'DELIVERED'];
    expect(statuses).toHaveLength(4);
  });

  it('PermissionState allows default, granted, denied', () => {
    const states: PermissionState[] = ['default', 'granted', 'denied'];
    expect(states).toHaveLength(3);
  });

  // ─── Device Token Interfaces ──────────────────────────────

  it('DeviceTokenRequest has token and platform', () => {
    const req: DeviceTokenRequest = { token: 'abc', platform: 'WEB' };
    expect(req.token).toBe('abc');
    expect(req.device_name).toBeUndefined();
  });

  it('DeviceTokenResponse has all required fields', () => {
    const resp: DeviceTokenResponse = {
      id: 1,
      token: 'abc',
      platform: 'WEB',
      device_name: 'Chrome',
      is_active: true,
      created_at: '2024-01-01',
      last_used_at: '2024-01-02',
    };
    expect(resp.id).toBe(1);
    expect(resp.is_active).toBe(true);
  });

  // ─── Notification Interfaces ──────────────────────────────

  it('Notification has required fields', () => {
    const notif: Notification = {
      id: 1,
      type_code: 'QC_PENDING',
      title: 'Test',
      body: 'Body',
      is_read: false,
      created_at: '2024-01-01',
    };
    expect(notif.type_code).toBe('QC_PENDING');
    expect(notif.is_read).toBe(false);
  });

  it('NotificationDetail extends Notification with extra fields', () => {
    const detail: NotificationDetail = {
      id: 1,
      type_code: 'QC_PENDING',
      title: 'Test',
      body: 'Body',
      is_read: false,
      created_at: '2024-01-01',
      notification_type: {
        id: 1,
        code: 'QC_PENDING',
        name: 'QC Pending',
        description: 'Pending QC',
        is_active: true,
      },
      data: { key: 'value' },
      status: 'SENT',
      read_at: null,
    };
    expect(detail.notification_type.code).toBe('QC_PENDING');
    expect(detail.read_at).toBeNull();
  });

  it('NotificationListResponse has count, unread_count, results', () => {
    const resp: NotificationListResponse = { count: 10, unread_count: 3, results: [] };
    expect(resp.count).toBe(10);
    expect(resp.unread_count).toBe(3);
  });

  it('NotificationListParams has optional is_read, limit, offset', () => {
    const params: NotificationListParams = { is_read: false, limit: 20, offset: 0 };
    expect(params.limit).toBe(20);
  });

  // ─── Preference Interfaces ────────────────────────────────

  it('NotificationPreference has all fields', () => {
    const pref: NotificationPreference = {
      id: 1,
      code: 'QC_PENDING',
      name: 'QC',
      description: 'QC notifs',
      is_enabled: true,
    };
    expect(pref.is_enabled).toBe(true);
  });

  it('NotificationPreferenceUpdate has notification_type_id and is_enabled', () => {
    const update: NotificationPreferenceUpdate = { notification_type_id: 5, is_enabled: false };
    expect(update.notification_type_id).toBe(5);
  });

  // ─── Mark Read Interfaces ─────────────────────────────────

  it('MarkReadRequest has notification_ids array', () => {
    const req: MarkReadRequest = { notification_ids: [1, 2, 3] };
    expect(req.notification_ids).toHaveLength(3);
  });

  it('MarkReadResponse has message', () => {
    const resp: MarkReadResponse = { message: 'Marked as read' };
    expect(resp.message).toBe('Marked as read');
  });

  // ─── Unread Count ─────────────────────────────────────────

  it('UnreadCountResponse has unread_count', () => {
    const resp: UnreadCountResponse = { unread_count: 5 };
    expect(resp.unread_count).toBe(5);
  });

  // ─── Test Notification ────────────────────────────────────

  it('TestNotificationRequest has token, title, body', () => {
    const req: TestNotificationRequest = { token: 'tok', title: 'Hi', body: 'World' };
    expect(req.token).toBe('tok');
  });

  it('TestNotificationResponse has success, message_id, error', () => {
    const resp: TestNotificationResponse = { success: true, message_id: 'msg-1', error: null };
    expect(resp.success).toBe(true);
    expect(resp.error).toBeNull();
  });

  // ─── NotificationPayload ──────────────────────────────────

  it('NotificationPayload has title, body, and optional icon/data/tag', () => {
    const payload: NotificationPayload = {
      title: 'Alert',
      body: 'New item',
      icon: '/icon.png',
      data: { url: '/test' },
      tag: 'tag1',
    };
    expect(payload.title).toBe('Alert');
    expect(payload.data?.url).toBe('/test');
  });

  // ─── NotificationTypeCodeType ─────────────────────────────

  it('NotificationTypeCodeType can be any NotificationTypeCode value', () => {
    const code: NotificationTypeCodeType = 'QC_PENDING';
    expect(Object.values(NotificationTypeCode)).toContain(code);
  });
});
