import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiError } from '@/core/api/types'

export type ArrivalSlipStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED'

export interface ArrivalSlip {
  id: number
  po_item_receipt: number
  po_item_code: string
  item_name: string
  po_receipt_id: number
  vehicle_entry_id: number
  entry_no: string
  particulars: string
  arrival_datetime: string
  weighing_required: boolean
  party_name: string
  billing_qty: string
  billing_uom: string
  in_time_to_qa: string | null
  truck_no_as_per_bill: string
  commercial_invoice_no: string
  eway_bill_no: string
  bilty_no: string
  has_certificate_of_analysis: boolean
  has_certificate_of_quantity: boolean
  status: ArrivalSlipStatus
  is_submitted: boolean
  submitted_at: string | null
  submitted_by: number | null
  submitted_by_name: string | null
  remarks: string
  created_at: string
  updated_at: string
}

export interface CreateArrivalSlipRequest {
  particulars: string
  arrival_datetime: string
  weighing_required: true // Always true
  party_name: string
  billing_qty: number
  billing_uom: string
  truck_no_as_per_bill: string
  commercial_invoice_no: string
  eway_bill_no: string
  bilty_no: string
  has_certificate_of_analysis: boolean
  has_certificate_of_quantity: boolean
  remarks?: string
}

export interface ArrivalSlipListParams {
  status?: ArrivalSlipStatus
}

export const arrivalSlipApi = {
  async get(poItemReceiptId: number): Promise<ArrivalSlip | null> {
    try {
      const response = await apiClient.get<ArrivalSlip>(
        API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_GET(poItemReceiptId)
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

  async getById(slipId: number): Promise<ArrivalSlip> {
    const response = await apiClient.get<ArrivalSlip>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_BY_ID(slipId)
    )
    return response.data
  },

  async create(poItemReceiptId: number, data: CreateArrivalSlipRequest): Promise<ArrivalSlip> {
    const response = await apiClient.post<ArrivalSlip>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_CREATE(poItemReceiptId),
      data
    )
    return response.data
  },

  async update(poItemReceiptId: number, data: CreateArrivalSlipRequest): Promise<ArrivalSlip> {
    // The API uses POST for both create and update (upsert pattern)
    const response = await apiClient.post<ArrivalSlip>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_CREATE(poItemReceiptId),
      data
    )
    return response.data
  },

  async submit(slipId: number): Promise<ArrivalSlip> {
    const response = await apiClient.post<ArrivalSlip>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_SUBMIT(slipId)
    )
    return response.data
  },

  async list(params?: ArrivalSlipListParams): Promise<ArrivalSlip[]> {
    const response = await apiClient.get<ArrivalSlip[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_LIST,
      { params }
    )
    return response.data
  },
}
