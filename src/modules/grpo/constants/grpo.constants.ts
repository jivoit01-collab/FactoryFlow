import { Clock, CheckCircle2, XCircle, AlertTriangle, type LucideIcon } from 'lucide-react'
import type { GRPOStatus } from '../types'

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: LucideIcon
}

export const GRPO_STATUS_CONFIG: Record<GRPOStatus, StatusConfig> = {
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
}

// Default SAP Branch ID (hardcoded)
export const DEFAULT_BRANCH_ID = 2
