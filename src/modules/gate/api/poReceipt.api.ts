import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { CreatePOReceiptRequest } from './po.api'

export interface POReceipt {
  id?: number
  po_number: string
  supplier_code: string
  supplier_name: string
  items: Array<{
    id?: number // PO item ID for API calls
    po_item_code: string
    item_name: string
    ordered_qty: number
    received_qty: number
    uom: string
  }>
}

export const poReceiptApi = {
  async get(entryId: number): Promise<POReceipt[]> {
    const response = await apiClient.get<POReceipt[]>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS_VIEW(entryId)
    )
    return response.data
  },

  async create(entryId: number, data: CreatePOReceiptRequest): Promise<POReceipt> {
    // API expects JSON format
    const response = await apiClient.post<POReceipt>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS(entryId),
      data
    )
    return response.data
  },
}