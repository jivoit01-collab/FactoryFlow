import { AlertTriangle, CheckCircle2, Clock, type LucideIcon, XCircle } from 'lucide-react';

// ============================================================================
// Entry Status Constants
// ============================================================================

export const ENTRY_STATUS = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  QC_COMPLETED: 'QC_COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export type EntryStatus = (typeof ENTRY_STATUS)[keyof typeof ENTRY_STATUS];

// ============================================================================
// Security Approval Status Constants
// ============================================================================

export const SECURITY_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type SecurityApprovalStatus =
  (typeof SECURITY_APPROVAL_STATUS)[keyof typeof SECURITY_APPROVAL_STATUS];

// ============================================================================
// GRPO Status Constants
// ============================================================================

export const GRPO_STATUS = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  PARTIALLY_POSTED: 'PARTIALLY_POSTED',
} as const;

export type GRPOStatus = (typeof GRPO_STATUS)[keyof typeof GRPO_STATUS];

// ============================================================================
// Inspection Status Constants
// ============================================================================

export const INSPECTION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type InspectionStatus = (typeof INSPECTION_STATUS)[keyof typeof INSPECTION_STATUS];

// ============================================================================
// QC Final Status Constants (cross-module: used by gate, grpo, qc)
// ============================================================================

export const FINAL_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  HOLD: 'HOLD',
} as const;

export type FinalStatus = (typeof FINAL_STATUS)[keyof typeof FINAL_STATUS];

// ============================================================================
// Arrival Slip Status Constants (cross-module: used by gate, qc)
// ============================================================================

export const ARRIVAL_SLIP_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REJECTED: 'REJECTED',
} as const;

export type ArrivalSlipStatus = (typeof ARRIVAL_SLIP_STATUS)[keyof typeof ARRIVAL_SLIP_STATUS];

// ============================================================================
// Status Color Configurations
// ============================================================================

export interface StatusColorConfig {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

export const ENTRY_STATUS_COLORS: Record<EntryStatus, StatusColorConfig> = {
  DRAFT: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    darkBg: 'dark:bg-yellow-900/30',
    darkText: 'dark:text-yellow-400',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  CANCELLED: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
  QC_COMPLETED: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    darkBg: 'dark:bg-purple-900/30',
    darkText: 'dark:text-purple-400',
  },
  REJECTED: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    darkBg: 'dark:bg-orange-900/30',
    darkText: 'dark:text-orange-400',
  },
};

export const SECURITY_APPROVAL_COLORS: Record<SecurityApprovalStatus, StatusColorConfig> = {
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    darkBg: 'dark:bg-yellow-900/20',
    darkText: 'dark:text-yellow-400',
  },
  APPROVED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/20',
    darkText: 'dark:text-green-400',
  },
  REJECTED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/20',
    darkText: 'dark:text-red-400',
  },
};

// ============================================================================
// Status Config with Icons (for dashboards)
// ============================================================================

export interface StatusConfigWithIcon {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const GRPO_STATUS_CONFIG: Record<GRPOStatus, StatusConfigWithIcon> = {
  PENDING: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
  },
  POSTED: {
    label: 'Posted',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  PARTIALLY_POSTED: {
    label: 'Partially Posted',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle,
  },
};

// ============================================================================
// GRPO Attachment Status Constants
// ============================================================================

export const ATTACHMENT_STATUS = {
  PENDING: 'PENDING',
  LINKED: 'LINKED',
  FAILED: 'FAILED',
} as const;

export type AttachmentStatusType = (typeof ATTACHMENT_STATUS)[keyof typeof ATTACHMENT_STATUS];

export const ATTACHMENT_STATUS_CONFIG: Record<AttachmentStatusType, StatusConfigWithIcon> = {
  PENDING: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
  },
  LINKED: {
    label: 'Linked',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the CSS classes for an entry status badge
 */
export function getEntryStatusClasses(status: string): string {
  const normalizedStatus = status?.toUpperCase() as EntryStatus;
  const config = ENTRY_STATUS_COLORS[normalizedStatus] || ENTRY_STATUS_COLORS.CANCELLED;
  return `${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`;
}

/**
 * Gets the CSS classes for a security approval badge
 */
export function getSecurityApprovalClasses(status: string): string {
  const normalizedStatus = status?.toUpperCase() as SecurityApprovalStatus;
  const config = SECURITY_APPROVAL_COLORS[normalizedStatus] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-900/20',
    darkText: 'dark:text-gray-400',
  };
  return `${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`;
}

/**
 * Default status color classes for unknown statuses
 */
export const DEFAULT_STATUS_CLASSES =
  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
