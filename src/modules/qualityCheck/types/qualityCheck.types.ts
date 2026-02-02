import type { BaseEntity } from '@/shared/types'

// QC Status enum matching design
export const QCStatus = {
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
  ON_HOLD: 'on_hold',
} as const

export type QCStatus = (typeof QCStatus)[keyof typeof QCStatus]

// Pass/Fail result for individual parameters
export const PassFailResult = {
  PASS: 'pass',
  FAIL: 'fail',
  NOT_CHECKED: 'not_checked',
} as const

export type PassFailResult = (typeof PassFailResult)[keyof typeof PassFailResult]

// QC Item from the items pending QC table
export interface QCItem {
  id: number
  grnNumber: string
  itemName: string
  batchNo: string
  vendor: string
  receivedDate: string
  status: QCStatus
  poItemId?: number
}

// Parameter row for Visual Inspection
export interface VisualParameter {
  id: string
  parameter: string
  standardValue: string
  observedValue: string
  passFail: PassFailResult
}

// Parameter row for Lab Parameters
export interface LabParameter {
  id: string
  parameter: string
  standardValue: string
  observedValue: string
  passFail: PassFailResult
}

// Attachment file
export interface QCAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

// Visual Inspection form data
export interface VisualInspectionData {
  appearance: {
    observedValue: string
    passFail: PassFailResult
  }
  odor: {
    observedValue: string
    passFail: PassFailResult
  }
  packaging: {
    observedValue: string
    passFail: PassFailResult
  }
}

// Lab Parameters form data
export interface LabParametersData {
  purity: {
    observedValue: string
    passFail: PassFailResult
  }
  ph: {
    observedValue: string
    passFail: PassFailResult
  }
  moisture: {
    observedValue: string
    passFail: PassFailResult
  }
  heavyMetals: {
    observedValue: string
    passFail: PassFailResult
  }
}

// Complete QC Inspection Entry
export interface QCInspection extends BaseEntity {
  qcItemId: number
  grnNumber: string
  itemName: string
  batchNo: string
  vendor: string
  receivedDate: string
  status: QCStatus
  visualInspection: VisualInspectionData
  labParameters: LabParametersData
  attachments: QCAttachment[]
  remarks?: string
  inspectorId?: string
  inspectorName?: string
  inspectionDate?: string
}

// QC Summary counts for dashboard cards
export interface QCSummary {
  pending: number
  passed: number
  failed: number
  onHold: number
}

// API Request: Start QC inspection
export interface StartQCRequest {
  qcItemId: number
}

// API Request: Submit QC inspection
export interface SubmitQCRequest {
  action: 'accept' | 'reject' | 'hold'
  visualInspection: VisualInspectionData
  labParameters: LabParametersData
  remarks?: string
}

// API Request: Upload attachment
export interface UploadAttachmentRequest {
  qcInspectionId: number
  file: File
}

// API Response: QC Items list
export interface QCItemsResponse {
  items: QCItem[]
  summary: QCSummary
}

// Form data for the inspection form
export interface QCInspectionFormData {
  visualInspection: VisualInspectionData
  labParameters: LabParametersData
  attachments: File[]
  remarks?: string
}

// Legacy exports for backwards compatibility (can be removed later)
export const QualityCheckStatus = QCStatus
export type QualityCheckStatus = QCStatus
