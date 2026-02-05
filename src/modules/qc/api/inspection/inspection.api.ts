import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiError } from '@/core/api/types'
import type {
  Inspection,
  PendingInspection,
  CreateInspectionRequest,
  UpdateParameterResultRequest,
  ApprovalRequest,
} from '../../types'

export const inspectionApi = {
  // Get list of pending arrival slips for QA inspection
  async getPendingList(): Promise<PendingInspection[]> {
    const response = await apiClient.get<PendingInspection[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PENDING_INSPECTIONS
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
