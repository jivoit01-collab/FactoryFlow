import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

export interface GateEntryFullView {
  gate_entry: {
    id: number
    entry_no: string
    status: string
    is_locked: boolean
    created_at: string
  }
  vehicle: {
    vehicle_number: string
    vehicle_type: { id: number; name: string }
    capacity_ton: number
  }
  driver: {
    name: string
    mobile_no: string
    license_no: string
  }
  security_check: {
    vehicle_condition_ok: boolean
    tyre_condition_ok: boolean
    fire_extinguisher_available: boolean
    alcohol_test_done: boolean
    alcohol_test_passed: boolean
    is_submitted: boolean
    remarks: string
    inspected_by: string
  } | null
  weighment: {
    gross_weight: number
    tare_weight: number
    net_weight: number
    weighbridge_slip_no: string
  } | null
  po_receipts: Array<{
    po_number: string
    supplier_code: string
    supplier_name: string
    created_by: string
    items: Array<{
      item_code: string
      item_name: string
      ordered_qty: number
      received_qty: number
      short_qty: number
      uom: string
      qc_status: {
        code: string
        display: string
      } | null
    }>
  }>
}

export const gateEntryFullViewApi = {
  async get(entryId: number): Promise<GateEntryFullView> {
    const response = await apiClient.get<GateEntryFullView>(
      API_ENDPOINTS.GATE_CORE.FULL_VIEW(entryId)
    )
    return response.data
  },

  async complete(entryId: number): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GATE_CORE.COMPLETE(entryId))
  },
}
