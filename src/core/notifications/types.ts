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
  notification_type?: string;
  title: string;
  body: string;
  click_action_url?: string;
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
  total_count?: number;
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
  GATE_ENTRY_CREATED: 'GATE_ENTRY_CREATED',
  GATE_ENTRY_STATUS_CHANGED: 'GATE_ENTRY_STATUS_CHANGED',
  SECURITY_CHECK_DONE: 'SECURITY_CHECK_DONE',
  WEIGHMENT_RECORDED: 'WEIGHMENT_RECORDED',
  ARRIVAL_SLIP_SUBMITTED: 'ARRIVAL_SLIP_SUBMITTED',
  ARRIVAL_SLIP_SENT_BACK: 'ARRIVAL_SLIP_SENT_BACK',
  QC_INSPECTION_SUBMITTED: 'QC_INSPECTION_SUBMITTED',
  QC_CHEMIST_APPROVED: 'QC_CHEMIST_APPROVED',
  QC_QAM_APPROVED: 'QC_QAM_APPROVED',
  QC_REJECTED: 'QC_REJECTED',
  QC_HOLD: 'QC_HOLD',
  QC_COMPLETED: 'QC_COMPLETED',
  FACTORY_HEAD_DECISION_REQUIRED: 'FACTORY_HEAD_DECISION_REQUIRED',
  FACTORY_HEAD_DECISION_RECORDED: 'FACTORY_HEAD_DECISION_RECORDED',
  PO_RECEIVED: 'PO_RECEIVED',
  GATE_ENTRY_COMPLETED: 'GATE_ENTRY_COMPLETED',
  GRPO_POSTED: 'GRPO_POSTED',
  GRPO_FAILED: 'GRPO_FAILED',
  SERVICE_GRPO_POSTED: 'SERVICE_GRPO_POSTED',
  SERVICE_GRPO_FAILED: 'SERVICE_GRPO_FAILED',
  STOCK_ALERT: 'STOCK_ALERT',
  DOCKING_SCAN_SKIP_REQUESTED: 'DOCKING_SCAN_SKIP_REQUESTED',
  DOCKING_SCAN_SKIP_REVIEWED: 'DOCKING_SCAN_SKIP_REVIEWED',
  GENERAL_ANNOUNCEMENT: 'GENERAL_ANNOUNCEMENT',
} as const;

export type NotificationTypeCodeType =
  (typeof NotificationTypeCode)[keyof typeof NotificationTypeCode];
