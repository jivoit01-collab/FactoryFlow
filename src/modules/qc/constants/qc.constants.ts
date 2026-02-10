import {
  FileText,
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import type { InspectionWorkflowStatus, InspectionFinalStatus, ArrivalSlipStatus } from '../types'

// ============================================================================
// Workflow Status Constants
// ============================================================================

export const WORKFLOW_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  QA_CHEMIST_APPROVED: 'QA_CHEMIST_APPROVED',
  QAM_APPROVED: 'QAM_APPROVED',
  COMPLETED: 'COMPLETED',
} as const satisfies Record<string, InspectionWorkflowStatus>

// ============================================================================
// Final Status Constants
// ============================================================================

export const FINAL_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  HOLD: 'HOLD',
} as const satisfies Record<string, InspectionFinalStatus>

// ============================================================================
// Arrival Slip Status Constants
// ============================================================================

export const ARRIVAL_SLIP_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REJECTED: 'REJECTED',
} as const satisfies Record<string, ArrivalSlipStatus>

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: LucideIcon
}

export const WORKFLOW_STATUS_CONFIG: Record<InspectionWorkflowStatus, StatusConfig> = {
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
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
}

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
    icon: Clock,
  },
}

export const PARAMETER_TYPE_LABELS = {
  NUMERIC: 'Numeric Value',
  TEXT: 'Text Value',
  BOOLEAN: 'Pass/Fail',
  RANGE: 'Numeric Range',
} as const
