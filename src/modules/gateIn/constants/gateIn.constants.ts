import { GateInStatus } from '../types/gateIn.types'
import type { SelectOption } from '@/shared/types'

export const GATE_IN_STATUS_LABELS: Record<GateInStatus, string> = {
  [GateInStatus.PENDING]: 'Pending',
  [GateInStatus.APPROVED]: 'Approved',
  [GateInStatus.REJECTED]: 'Rejected',
  [GateInStatus.IN_PROGRESS]: 'In Progress',
}

export const GATE_IN_STATUS_OPTIONS: SelectOption<GateInStatus>[] = Object.entries(
  GATE_IN_STATUS_LABELS
).map(([value, label]) => ({
  value: value as GateInStatus,
  label,
}))

export const MATERIAL_TYPES: SelectOption[] = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'other', label: 'Other' },
]

export const UNITS: SelectOption[] = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tons', label: 'Tons' },
  { value: 'liters', label: 'Liters' },
  { value: 'units', label: 'Units' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'pallets', label: 'Pallets' },
]

export const GATE_IN_FORM_DEFAULTS = {
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  materialType: '',
  quantity: 0,
  unit: 'kg',
  supplierName: '',
  poNumber: '',
  remarks: '',
}
