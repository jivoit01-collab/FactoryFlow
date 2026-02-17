import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
  Send,
  UserCheck,
  XCircle,
} from 'lucide-react';

import type { InspectionFinalStatus, InspectionListWorkflowStatus } from '../types';

// ============================================================================
// Workflow Status Constants
// ============================================================================

export const WORKFLOW_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  QA_CHEMIST_APPROVED: 'QA_CHEMIST_APPROVED',
  QAM_APPROVED: 'QAM_APPROVED',
  REJECTED: 'REJECTED',
} as const satisfies Record<string, InspectionListWorkflowStatus>;

// Re-export cross-module constants so existing qc-internal imports still work
export { ARRIVAL_SLIP_STATUS, FINAL_STATUS } from '@/config/constants';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export const WORKFLOW_STATUS_CONFIG: Record<InspectionListWorkflowStatus, StatusConfig> = {
  NOT_STARTED: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
  },
  DRAFT: {
    label: 'Draft',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: FileText,
  },
  SUBMITTED: {
    label: 'Awaiting Chemist',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Send,
  },
  QA_CHEMIST_APPROVED: {
    label: 'Awaiting Manager',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: UserCheck,
  },
  QAM_APPROVED: {
    label: 'Approved',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
};

export const FINAL_STATUS_CONFIG: Record<InspectionFinalStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  HOLD: {
    label: 'On Hold',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertCircle,
  },
};

export const PARAMETER_TYPE_LABELS = {
  NUMERIC: 'Numeric Value',
  TEXT: 'Text Value',
  BOOLEAN: 'Pass/Fail',
  RANGE: 'Numeric Range',
} as const;
