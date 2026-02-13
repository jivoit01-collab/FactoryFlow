/**
 * Notification Types
 * Based on backend API documentation
 */

// Platform types
export type Platform = 'ANDROID' | 'IOS' | 'WEB';
export type DeviceType = 'browser' | 'pwa';

// Notification status
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';

// Permission state
export type PermissionState = 'default' | 'granted' | 'denied';

// ============================================
// Device Token Types
// ============================================

export interface DeviceTokenRequest {
  token: string;
  platform: Platform;
  device_name?: string;
}

export interface DeviceTokenResponse {
  id: number;
  token: string;
  platform: Platform;
  device_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string;
}

// ============================================
// Notification Types
// ============================================

export interface NotificationType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface Notification {
  id: number;
  type_code: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationDetail extends Notification {
  notification_type: NotificationType;
  data: Record<string, string>;
  status: NotificationStatus;
  read_at: string | null;
}

export interface NotificationListResponse {
  count: number;
  unread_count: number;
  results: Notification[];
}

export interface NotificationListParams {
  is_read?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Notification Preference Types
// ============================================

export interface NotificationPreference {
  id: number;
  code: string;
  name: string;
  description: string;
  is_enabled: boolean;
}

export interface NotificationPreferenceUpdate {
  notification_type_id: number;
  is_enabled: boolean;
}

// ============================================
// Mark Read Types
// ============================================

export interface MarkReadRequest {
  notification_ids: number[];
}

export interface MarkReadResponse {
  message: string;
}

// ============================================
// Unread Count Types
// ============================================

export interface UnreadCountResponse {
  unread_count: number;
}

// ============================================
// Test Notification Types
// ============================================

export interface TestNotificationRequest {
  token: string;
  title: string;
  body: string;
}

export interface TestNotificationResponse {
  success: boolean;
  message_id: string | null;
  error: string | null;
}

// ============================================
// FCM Message Payload (from Firebase SDK)
// ============================================

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
  tag?: string;
}

// ============================================
// Notification Type Codes (from backend enum)
// ============================================

export const NotificationTypeCode = {
  PERSON_ENTRY: 'PERSON_ENTRY',
  PERSON_EXIT: 'PERSON_EXIT',
  LONG_DURATION_ALERT: 'LONG_DURATION_ALERT',
  BLACKLISTED_PERSON: 'BLACKLISTED_PERSON',
  VEHICLE_ENTRY: 'VEHICLE_ENTRY',
  VEHICLE_EXIT: 'VEHICLE_EXIT',
  RAW_MATERIAL_GATEIN: 'RAW_MATERIAL_GATEIN',
  DAILY_NEEDS_GATEIN: 'DAILY_NEEDS_GATEIN',
  MAINTENANCE_GATEIN: 'MAINTENANCE_GATEIN',
  CONSTRUCTION_GATEIN: 'CONSTRUCTION_GATEIN',
  QC_PENDING: 'QC_PENDING',
  QC_COMPLETED: 'QC_COMPLETED',
  QC_FAILED: 'QC_FAILED',
  WEIGHMENT_COMPLETED: 'WEIGHMENT_COMPLETED',
  SECURITY_ALERT: 'SECURITY_ALERT',
} as const;

export type NotificationTypeCodeType =
  (typeof NotificationTypeCode)[keyof typeof NotificationTypeCode];
