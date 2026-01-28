import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

export interface DailyNeedCategory {
  id: number
  category_name: string
}

export interface DailyNeedDepartment {
  id: number
  name: string
}

export interface DailyNeed {
  id?: number
  item_category: DailyNeedCategory
  supplier_name: string
  material_name: string
  quantity: number | string
  unit: string
  receiving_department: DailyNeedDepartment
  bill_number?: string
  delivery_challan_number?: string
  canteen_supervisor?: string
  vehicle_or_person_name?: string
  contact_number?: string
  remarks?: string
  is_submitted?: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateDailyNeedRequest {
  item_category: number
  supplier_name: string
  material_name: string
  quantity: number
  unit: string
  receiving_department: string
  bill_number: string
  delivery_challan_number: string
  canteen_supervisor?: string
  vehicle_or_person_name: string
  contact_number: string
  remarks?: string
}

export const dailyNeedApi = {
  async getCategories(): Promise<DailyNeedCategory[]> {
    const response = await apiClient.get<DailyNeedCategory[]>(
      API_ENDPOINTS.DAILY_NEEDS_GATEIN.CATEGORIES
    )
    return response.data
  },

  async get(entryId: number): Promise<DailyNeed> {
    const response = await apiClient.get<DailyNeed>(API_ENDPOINTS.DAILY_NEEDS_GATEIN.GET(entryId))
    return response.data
  },

  async create(entryId: number, data: CreateDailyNeedRequest): Promise<DailyNeed> {
    // API expects x-www-form-urlencoded format
    const formData = new FormData()
    formData.append('item_category', data.item_category.toString())
    formData.append('supplier_name', data.supplier_name)
    formData.append('material_name', data.material_name)
    formData.append('quantity', data.quantity.toString())
    formData.append('unit', data.unit)
    formData.append('receiving_department', data.receiving_department)
    formData.append('bill_number', data.bill_number)
    formData.append('delivery_challan_number', data.delivery_challan_number)
    formData.append('vehicle_or_person_name', data.vehicle_or_person_name)
    formData.append('contact_number', data.contact_number)

    if (data.canteen_supervisor) {
      formData.append('canteen_supervisor', data.canteen_supervisor)
    }
    if (data.remarks) {
      formData.append('remarks', data.remarks)
    }

    const response = await apiClient.post<DailyNeed>(
      API_ENDPOINTS.DAILY_NEEDS_GATEIN.CREATE(entryId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}
