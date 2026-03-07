import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  type LucideIcon,
  Moon,
  Sun,
  SunDim,
  XCircle,
} from 'lucide-react';

import type { StatusColorConfig } from '@/config/constants/status.constants';

import type { PlanStatus, SAPPostingStatus, Shift, WeeklyPlanStatus } from '../types';

// ============================================================================
// Plan Status
// ============================================================================

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const PLAN_STATUS_COLORS: Record<PlanStatus, StatusColorConfig> = {
  DRAFT: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
  OPEN: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
  },
  IN_PROGRESS: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  CLOSED: {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    darkBg: 'dark:bg-slate-800',
    darkText: 'dark:text-slate-300',
  },
  CANCELLED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
};

export const PLAN_STATUS_ICONS: Record<PlanStatus, LucideIcon> = {
  DRAFT: Circle,
  OPEN: Clock,
  IN_PROGRESS: AlertTriangle,
  COMPLETED: CheckCircle2,
  CLOSED: CheckCircle2,
  CANCELLED: XCircle,
};

// ============================================================================
// SAP Posting Status
// ============================================================================

export const SAP_POSTING_LABELS: Record<SAPPostingStatus, string> = {
  NOT_POSTED: 'Not Posted',
  POSTED: 'Posted to SAP',
  FAILED: 'SAP Failed',
};

export const SAP_POSTING_COLORS: Record<SAPPostingStatus, StatusColorConfig> = {
  NOT_POSTED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-400',
  },
  POSTED: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  FAILED: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
};

// ============================================================================
// Weekly Plan Status
// ============================================================================

export const WEEKLY_STATUS_LABELS: Record<WeeklyPlanStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const WEEKLY_STATUS_COLORS: Record<WeeklyPlanStatus, StatusColorConfig> = {
  PENDING: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-400',
  },
  IN_PROGRESS: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
  },
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
};

// ============================================================================
// Shift
// ============================================================================

export const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  NIGHT: 'Night',
};

export const SHIFT_ICONS: Record<Shift, LucideIcon> = {
  MORNING: Sun,
  AFTERNOON: SunDim,
  NIGHT: Moon,
};

export const SHIFT_COLORS: Record<Shift, StatusColorConfig> = {
  MORNING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    darkBg: 'dark:bg-yellow-900/30',
    darkText: 'dark:text-yellow-400',
  },
  AFTERNOON: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    darkBg: 'dark:bg-orange-900/30',
    darkText: 'dark:text-orange-400',
  },
  NIGHT: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    darkBg: 'dark:bg-indigo-900/30',
    darkText: 'dark:text-indigo-400',
  },
};
