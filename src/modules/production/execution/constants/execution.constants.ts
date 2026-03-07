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
  ClearanceStatus,
  MachineStatus,
  MachineType,
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
// Machine Status
// ============================================================================

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  BREAKDOWN: 'Breakdown',
  CHANGEOVER: 'Changeover',
};

export const MACHINE_STATUS_COLORS: Record<MachineStatus, StatusColorConfig> = {
  RUNNING: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  IDLE: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-300',
  },
  BREAKDOWN: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
  CHANGEOVER: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
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
    text: 'text-gray-600',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-400',
  },
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
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
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
  PENDING: AlertTriangle,
  PARTIALLY_APPROVED: Clock,
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
// Machine Types
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

export const MACHINE_TYPE_OPTIONS: { value: MachineType; label: string }[] = [
  { value: 'FILLER', label: 'Filler' },
  { value: 'CAPPER', label: 'Capper' },
  { value: 'CONVEYOR', label: 'Conveyor' },
  { value: 'LABELER', label: 'Labeler' },
  { value: 'CODING', label: 'Coding' },
  { value: 'SHRINK_PACK', label: 'Shrink Pack' },
  { value: 'STICKER_LABELER', label: 'Sticker Labeler' },
  { value: 'TAPPING_MACHINE', label: 'Tapping Machine' },
];

// ============================================================================
// Checklist Frequency
// ============================================================================

export const CHECKLIST_FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

// ============================================================================
// Time Slots (12-hour shift: 07:00 to 19:00)
// ============================================================================

export interface TimeSlot {
  slot: string;
  start: string;
  end: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { slot: '07:00-08:00', start: '07:00', end: '08:00' },
  { slot: '08:00-09:00', start: '08:00', end: '09:00' },
  { slot: '09:00-10:00', start: '09:00', end: '10:00' },
  { slot: '10:00-11:00', start: '10:00', end: '11:00' },
  { slot: '11:00-12:00', start: '11:00', end: '12:00' },
  { slot: '12:00-13:00', start: '12:00', end: '13:00' },
  { slot: '13:00-14:00', start: '13:00', end: '14:00' },
  { slot: '14:00-15:00', start: '14:00', end: '15:00' },
  { slot: '15:00-16:00', start: '15:00', end: '16:00' },
  { slot: '16:00-17:00', start: '16:00', end: '17:00' },
  { slot: '17:00-18:00', start: '17:00', end: '18:00' },
  { slot: '18:00-19:00', start: '18:00', end: '19:00' },
];

// ============================================================================
// Standard Materials (for yield report pre-fill)
// ============================================================================

export const STANDARD_MATERIALS = [
  'Bottle',
  'Cap',
  'Front Label',
  'Back Label',
  'Tikki',
  'Shrink',
  'Carton',
] as const;

// ============================================================================
// Line Clearance Checkpoints (auto-created by backend, for reference)
// ============================================================================

export const LINE_CLEARANCE_CHECKPOINTS = [
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

// ============================================================================
// Breakdown Type Labels
// ============================================================================

export const BREAKDOWN_TYPE_LABELS: Record<string, string> = {
  LINE: 'Line',
  EXTERNAL: 'External',
};

export const BREAKDOWN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LINE', label: 'Line' },
  { value: 'EXTERNAL', label: 'External' },
];

// ============================================================================
// Clearance Result Labels
// ============================================================================

export const CLEARANCE_RESULT_LABELS: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
  NA: 'N/A',
};
