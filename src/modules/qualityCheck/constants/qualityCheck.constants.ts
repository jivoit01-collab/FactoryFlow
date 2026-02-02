import { QCStatus, PassFailResult } from '../types/qualityCheck.types'
import type { SelectOption } from '@/shared/types'

// QC Status labels for display
export const QC_STATUS_LABELS: Record<QCStatus, string> = {
  [QCStatus.PENDING]: 'QC Pending',
  [QCStatus.PASSED]: 'QC Passed',
  [QCStatus.FAILED]: 'QC Failed',
  [QCStatus.ON_HOLD]: 'On Hold',
}

// QC Status options for dropdowns
export const QC_STATUS_OPTIONS: SelectOption<QCStatus>[] = Object.entries(QC_STATUS_LABELS).map(
  ([value, label]) => ({
    value: value as QCStatus,
    label,
  })
)

// Pass/Fail options for parameter dropdowns
export const PASS_FAIL_OPTIONS: SelectOption<PassFailResult>[] = [
  { value: PassFailResult.PASS, label: 'Pass' },
  { value: PassFailResult.FAIL, label: 'Fail' },
]

// Visual Inspection Parameters with standard values
export const VISUAL_INSPECTION_PARAMS = {
  appearance: {
    id: 'appearance',
    parameter: 'Appearance',
    standardValue: 'White Powder',
    placeholder: 'Enter observation',
  },
  odor: {
    id: 'odor',
    parameter: 'Odor',
    standardValue: 'Odorless',
    placeholder: 'Enter observation',
  },
  packaging: {
    id: 'packaging',
    parameter: 'Packaging',
    standardValue: 'Intact',
    placeholder: 'Enter observation',
  },
} as const

// Lab Parameters with standard values
export const LAB_PARAMETERS = {
  purity: {
    id: 'purity',
    parameter: 'Purity (%)',
    standardValue: '≥ 99.0',
    placeholder: 'Enter test result',
  },
  ph: {
    id: 'ph',
    parameter: 'pH',
    standardValue: '6.5 - 8.0',
    placeholder: 'Enter test result',
  },
  moisture: {
    id: 'moisture',
    parameter: 'Moisture (%)',
    standardValue: '≤ 0.5',
    placeholder: 'Enter test result',
  },
  heavyMetals: {
    id: 'heavyMetals',
    parameter: 'Heavy Metals (ppm)',
    standardValue: '≤ 10',
    placeholder: 'Enter test result',
  },
} as const

// Status colors for summary cards (matching Gate module pattern with dark mode)
export const QC_STATUS_COLORS: Record<
  QCStatus,
  {
    color: string
    bgColor: string
  }
> = {
  [QCStatus.PENDING]: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  },
  [QCStatus.PASSED]: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
  [QCStatus.FAILED]: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
  [QCStatus.ON_HOLD]: {
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
  },
}

// Badge variants for shared Badge component
export const QC_STATUS_BADGE_VARIANTS: Record<
  QCStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  [QCStatus.PENDING]: 'warning',
  [QCStatus.PASSED]: 'success',
  [QCStatus.FAILED]: 'destructive',
  [QCStatus.ON_HOLD]: 'secondary',
}

// Form default values
export const QC_FORM_DEFAULTS = {
  visualInspection: {
    appearance: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
    odor: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
    packaging: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
  },
  labParameters: {
    purity: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
    ph: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
    moisture: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
    heavyMetals: { observedValue: '', passFail: PassFailResult.NOT_CHECKED },
  },
  attachments: [],
  remarks: '',
}

// Tab names for the inspection form
export const QC_TABS = {
  VISUAL: 'visual',
  LAB: 'lab',
  ATTACHMENTS: 'attachments',
} as const

export type QCTab = (typeof QC_TABS)[keyof typeof QC_TABS]

// Tab display labels
export const QC_TAB_LABELS: Record<QCTab, string> = {
  [QC_TABS.VISUAL]: 'Visual Inspection',
  [QC_TABS.LAB]: 'Lab Parameters',
  [QC_TABS.ATTACHMENTS]: 'Attachments',
}

// Accepted file types for attachments
export const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Icons for statuses
export const QC_STATUS_ICONS = {
  [QCStatus.PENDING]: 'Clock',
  [QCStatus.PASSED]: 'CheckCircle2',
  [QCStatus.FAILED]: 'XCircle',
  [QCStatus.ON_HOLD]: 'PauseCircle',
} as const

// Legacy exports for backwards compatibility
export const QUALITY_CHECK_STATUS_LABELS = QC_STATUS_LABELS
export const QUALITY_CHECK_STATUS_OPTIONS = QC_STATUS_OPTIONS
export const QUALITY_PARAMETERS = [
  { value: 'appearance', label: 'Appearance' },
  { value: 'odor', label: 'Odor' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'purity', label: 'Purity' },
  { value: 'ph', label: 'pH' },
  { value: 'moisture', label: 'Moisture' },
  { value: 'heavyMetals', label: 'Heavy Metals' },
]
