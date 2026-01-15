import { QualityCheckStatus } from '../types/qualityCheck.types'
import type { SelectOption } from '@/shared/types'

export const QUALITY_CHECK_STATUS_LABELS: Record<QualityCheckStatus, string> = {
  [QualityCheckStatus.PENDING]: 'Pending',
  [QualityCheckStatus.PASSED]: 'Passed',
  [QualityCheckStatus.FAILED]: 'Failed',
  [QualityCheckStatus.PARTIAL]: 'Partial Pass',
}

export const QUALITY_CHECK_STATUS_OPTIONS: SelectOption<QualityCheckStatus>[] = Object.entries(
  QUALITY_CHECK_STATUS_LABELS
).map(([value, label]) => ({
  value: value as QualityCheckStatus,
  label,
}))

export const QUALITY_PARAMETERS: SelectOption[] = [
  { value: 'appearance', label: 'Appearance' },
  { value: 'color', label: 'Color' },
  { value: 'odor', label: 'Odor' },
  { value: 'moisture', label: 'Moisture Content' },
  { value: 'purity', label: 'Purity' },
  { value: 'weight', label: 'Weight' },
  { value: 'packaging', label: 'Packaging Integrity' },
  { value: 'labeling', label: 'Labeling' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'other', label: 'Other' },
]

export const QUALITY_CHECK_FORM_DEFAULTS = {
  gateInId: '',
  results: [],
  overallRemarks: '',
  samplesTaken: 1,
}
