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

import type {
  ChecklistFrequency,
  ChecklistStatus,
  ClearanceResult,
  ClearanceStatus,
  FinalQCResult,
  MachineType,
  QCResult,
  RunStatus,
  Shift,
  WasteApprovalStatus,
} from '../types';

// ============================================================================
// Run Status
// ============================================================================

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const RUN_STATUS_COLORS: Record<RunStatus, StatusColorConfig> = {
  DRAFT: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
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
};

export const RUN_STATUS_ICONS: Record<RunStatus, LucideIcon> = {
  DRAFT: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
};

// ============================================================================
// Machine Type
// ============================================================================

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  FILLER: 'Filler',
  CAPPER: 'Capper',
  CONVEYOR: 'Conveyor',
  LABELER: 'Labeler',
  CODING: 'Coding',
  SHRINK_PACK: 'Shrink Pack',
  STICKER_LABELER: 'Sticker Labeler',
  TAPPING_MACHINE: 'Tapping Machine',
};

// ============================================================================
// Checklist Frequency
// ============================================================================

export const FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

// ============================================================================
// Checklist Status
// ============================================================================

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  OK: 'OK',
  NOT_OK: 'Not OK',
  NA: 'N/A',
};

export const CHECKLIST_STATUS_COLORS: Record<ChecklistStatus, StatusColorConfig> = {
  OK: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  NOT_OK: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
  NA: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
};

// ============================================================================
// Clearance Status
// ============================================================================

export const CLEARANCE_STATUS_LABELS: Record<ClearanceStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CLEARED: 'Cleared',
  NOT_CLEARED: 'Not Cleared',
};

export const CLEARANCE_STATUS_COLORS: Record<ClearanceStatus, StatusColorConfig> = {
  DRAFT: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
  SUBMITTED: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
  },
  CLEARED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  NOT_CLEARED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
};

export const CLEARANCE_STATUS_ICONS: Record<ClearanceStatus, LucideIcon> = {
  DRAFT: Circle,
  SUBMITTED: Clock,
  CLEARED: CheckCircle2,
  NOT_CLEARED: XCircle,
};

// ============================================================================
// Clearance Result
// ============================================================================

export const CLEARANCE_RESULT_LABELS: Record<ClearanceResult, string> = {
  YES: 'Yes',
  NO: 'No',
  NA: 'N/A',
};

// ============================================================================
// Waste Approval Status
// ============================================================================

export const WASTE_APPROVAL_LABELS: Record<WasteApprovalStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_APPROVED: 'Partially Approved',
  FULLY_APPROVED: 'Fully Approved',
};

export const WASTE_APPROVAL_COLORS: Record<WasteApprovalStatus, StatusColorConfig> = {
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    darkBg: 'dark:bg-yellow-900/30',
    darkText: 'dark:text-yellow-400',
  },
  PARTIALLY_APPROVED: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
  },
  FULLY_APPROVED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
};

export const WASTE_APPROVAL_ICONS: Record<WasteApprovalStatus, LucideIcon> = {
  PENDING: Clock,
  PARTIALLY_APPROVED: AlertTriangle,
  FULLY_APPROVED: CheckCircle2,
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

// ============================================================================
// QC Result
// ============================================================================

export const QC_RESULT_LABELS: Record<QCResult, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NA: 'N/A',
};

export const QC_RESULT_COLORS: Record<QCResult, StatusColorConfig> = {
  PASS: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  FAIL: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
  NA: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
};

export const FINAL_QC_LABELS: Record<FinalQCResult, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  CONDITIONAL: 'Conditional',
};

export const FINAL_QC_COLORS: Record<FinalQCResult, StatusColorConfig> = {
  PASS: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  FAIL: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
  CONDITIONAL: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
  },
};

// ============================================================================
// Resolve Breakdown Actions
// ============================================================================

export const RESOLVE_ACTION_LABELS: Record<string, string> = {
  start_production: 'Fixed, Start Production',
  stop_production: 'Fixed, Stop Production',
  stop_unrecovered: 'Not Fixed, Stop Production',
};

// ============================================================================
// Standard Line Clearance Items
// ============================================================================

export const STANDARD_CLEARANCE_ITEMS = [
  'Previous product, labels and packaging materials removed',
  'Machine/equipment cleaned and free from product residues',
  'Utensils, scoops and accessories cleaned and available',
  'Packaging area free from previous batch coding material',
  'Work area (tables, conveyors, floor) cleaned and sanitized',
  'Waste bins emptied and cleaned',
  'Required packaging material verified against BOM',
  'Coding machine updated with correct product/batch details',
  'Environmental conditions (temperature/humidity) within limits',
] as const;
