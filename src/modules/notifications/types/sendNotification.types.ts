/**
 * Send Notification Types
 * Based on POST /api/v1/notifications/send/ API
 */

/** Minimal user type for the recipient selector */
export interface CompanyUser {
  id: number;
  email: string;
  full_name: string;
}

/** Notification type codes available for manual sending */
export const NOTIFICATION_TYPES = [
  { value: 'GENERAL_ANNOUNCEMENT', label: 'General Announcement' },
  { value: 'GATE_ENTRY_CREATED', label: 'Gate Entry Created' },
  { value: 'GATE_ENTRY_STATUS_CHANGED', label: 'Gate Entry Status Changed' },
  { value: 'SECURITY_CHECK_DONE', label: 'Security Check Done' },
  { value: 'WEIGHMENT_RECORDED', label: 'Weighment Recorded' },
  { value: 'ARRIVAL_SLIP_SUBMITTED', label: 'Arrival Slip Submitted' },
  { value: 'ARRIVAL_SLIP_SENT_BACK', label: 'Arrival Slip Sent Back' },
  { value: 'QC_INSPECTION_SUBMITTED', label: 'QC Inspection Submitted' },
  { value: 'QC_CHEMIST_APPROVED', label: 'QA Chemist Approved' },
  { value: 'QC_QAM_APPROVED', label: 'QAM Approved' },
  { value: 'QC_REJECTED', label: 'QC Rejected' },
  { value: 'QC_HOLD', label: 'QC On Hold' },
  { value: 'QC_COMPLETED', label: 'QC Completed' },
  { value: 'FACTORY_HEAD_DECISION_REQUIRED', label: 'Factory Head Decision Required' },
  { value: 'FACTORY_HEAD_DECISION_RECORDED', label: 'Factory Head Decision Recorded' },
  { value: 'PO_RECEIVED', label: 'PO Received' },
  { value: 'GATE_ENTRY_COMPLETED', label: 'Gate Entry Completed' },
  { value: 'GRPO_POSTED', label: 'GRPO Posted' },
  { value: 'GRPO_FAILED', label: 'GRPO Failed' },
  { value: 'SERVICE_GRPO_POSTED', label: 'Service GRPO Posted' },
  { value: 'SERVICE_GRPO_FAILED', label: 'Service GRPO Failed' },
  { value: 'STOCK_ALERT', label: 'Stock Alert' },
  { value: 'DOCKING_SCAN_SKIP_REQUESTED', label: 'Docking Scan Skip Requested' },
  { value: 'DOCKING_SCAN_SKIP_REVIEWED', label: 'Docking Scan Skip Reviewed' },
] as const;

export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number]['value'];

/** Request body for POST /api/v1/notifications/send/ */
export interface SendNotificationRequest {
  title: string;
  body: string;
  notification_type?: string;
  click_action_url?: string;
  recipient_user_ids?: number[];
  role_filter?: string;
}

/** Response from POST /api/v1/notifications/send/ */
export interface SendNotificationResponse {
  message: string;
  recipients_count: number;
}
