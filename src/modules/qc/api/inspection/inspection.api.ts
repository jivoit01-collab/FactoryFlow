import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'
import type { ApiError } from '@/core/api/types'

import type {
  ApprovalRequest,
  CreateInspectionRequest,
  Inspection,
  InspectionListParams,
  PendingInspection,
  UpdateParameterResultRequest,
} from '../../types'

function buildQueryString(params?: InspectionListParams): string {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  if (params.from_date) searchParams.append('from_date', params.from_date)
  if (params.to_date) searchParams.append('to_date', params.to_date)
  if (params.workflow_status) searchParams.append('workflow_status', params.workflow_status)
  if (params.final_status) searchParams.append('final_status', params.final_status)
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export const inspectionApi = {
  // Get all inspections with optional filters
  async getList(params?: InspectionListParams): Promise<Inspection[]> {
    const response = await apiClient.get<Inspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTIONS_LIST + buildQueryString(params)
    )
    return response.data
  },

  // Get list of pending arrival slips for QA inspection
  async getPendingList(params?: InspectionListParams): Promise<PendingInspection[]> {
    const response = await apiClient.get<PendingInspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PENDING_INSPECTIONS + buildQueryString(params)
    )
    return response.data
  },

  // Get inspections awaiting QA Chemist approval
  async getAwaitingChemist(params?: InspectionListParams): Promise<Inspection[]> {
    const response = await apiClient.get<Inspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.AWAITING_CHEMIST + buildQueryString(params)
    )
    return response.data
  },

  // Get inspections awaiting QA Manager approval
  async getAwaitingQAM(params?: InspectionListParams): Promise<Inspection[]> {
    const response = await apiClient.get<Inspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.AWAITING_QAM + buildQueryString(params)
    )
    return response.data
  },

  // Get completed inspections
  async getCompleted(params?: InspectionListParams): Promise<Inspection[]> {
    const response = await apiClient.get<Inspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.COMPLETED_INSPECTIONS + buildQueryString(params)
    )
    return response.data
  },

  // Get rejected inspections
  async getRejected(params?: InspectionListParams): Promise<Inspection[]> {
    const response = await apiClient.get<Inspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.REJECTED_INSPECTIONS + buildQueryString(params)
    )
    return response.data
  },

  // Get inspection by ID
  async getById(id: number): Promise<Inspection> {
    const response = await apiClient.get<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_BY_ID(id)
    )
    return response.data
  },

  // Get inspection for arrival slip (may not exist)
  async getForSlip(slipId: number): Promise<Inspection | null> {
    try {
      const response = await apiClient.get<Inspection>(
        API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_FOR_SLIP(slipId)
      )
      return response.data
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 404) {
        return null
      }
      throw error
    }
  },

  // Create inspection for arrival slip
  async create(slipId: number, data: CreateInspectionRequest): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_FOR_SLIP(slipId),
      data
    )
    return response.data
  },

  // Update inspection (before submission)
  async update(slipId: number, data: CreateInspectionRequest): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_FOR_SLIP(slipId),
      data
    )
    return response.data
  },

  // Update parameter results
  async updateParameters(
    inspectionId: number,
    results: UpdateParameterResultRequest[]
  ): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_PARAMETERS(inspectionId),
      { results }
    )
    return response.data
  },

  // Submit inspection for approval
  async submit(id: number): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_SUBMIT(id)
    )
    return response.data
  },

  // QA Chemist approve
  async approveAsChemist(id: number, data: ApprovalRequest): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.APPROVE_CHEMIST(id),
      data
    )
    return response.data
  },

  // QA Manager approve
  async approveAsQAM(id: number, data: ApprovalRequest): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.APPROVE_QAM(id),
      data
    )
    return response.data
  },

  // Reject inspection
  async reject(id: number, data: ApprovalRequest): Promise<Inspection> {
    const response = await apiClient.post<Inspection>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.REJECT_INSPECTION(id),
      data
    )
    return response.data
  },
}
