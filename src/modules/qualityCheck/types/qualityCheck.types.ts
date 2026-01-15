import type { BaseEntity } from '@/shared/types'

export const QualityCheckStatus = {
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
  PARTIAL: 'partial',
} as const

export type QualityCheckStatus = (typeof QualityCheckStatus)[keyof typeof QualityCheckStatus]

export interface QualityCheckResult {
  parameter: string
  expectedValue: string
  actualValue: string
  passed: boolean
  remarks?: string
}

export interface QualityCheckEntry extends BaseEntity {
  gateInId: string
  vehicleNumber: string
  materialType: string
  supplierName: string
  inspectorId: string
  inspectorName: string
  status: QualityCheckStatus
  checkDate: string
  results: QualityCheckResult[]
  overallRemarks?: string
  samplesTaken?: number
}

export interface CreateQualityCheckRequest {
  gateInId: string
  results: QualityCheckResult[]
  overallRemarks?: string
  samplesTaken?: number
}

export interface UpdateQualityCheckRequest extends Partial<CreateQualityCheckRequest> {
  status?: QualityCheckStatus
}
