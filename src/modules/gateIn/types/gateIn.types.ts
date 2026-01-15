import type { BaseEntity } from '@/shared/types'

export const GateInStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
} as const

export type GateInStatus = (typeof GateInStatus)[keyof typeof GateInStatus]

export interface GateInEntry extends BaseEntity {
  vehicleNumber: string
  driverName: string
  driverPhone: string
  materialType: string
  quantity: number
  unit: string
  supplierName: string
  poNumber?: string
  remarks?: string
  status: GateInStatus
  entryTime: string
  exitTime?: string
}

export interface CreateGateInRequest {
  vehicleNumber: string
  driverName: string
  driverPhone: string
  materialType: string
  quantity: number
  unit: string
  supplierName: string
  poNumber?: string
  remarks?: string
}

export interface UpdateGateInRequest extends Partial<CreateGateInRequest> {
  status?: GateInStatus
}
