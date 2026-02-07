import { apiClient } from '@/core/api'

// ===== Person Type IDs =====
export const PERSON_TYPE_IDS = {
  VISITOR: 1,
  LABOUR: 2,
} as const

// ===== Master Types =====

export interface PersonType {
  id: number
  name: string
  is_active: boolean
}

export interface Gate {
  id: number
  name: string
  location?: string
  is_active: boolean
}

export interface Contractor {
  id: number
  contractor_name: string
  contact_person?: string
  mobile?: string
  address?: string
  contract_valid_till?: string
  is_active: boolean
}

export interface Visitor {
  id: number
  name: string
  mobile?: string
  company_name?: string
  id_proof_type?: string
  id_proof_no?: string
  photo?: string
  blacklisted: boolean
  created_at: string
}

export interface Labour {
  id: number
  name: string
  contractor: number
  contractor_name?: string
  mobile?: string
  id_proof_no?: string
  photo?: string
  skill_type?: string
  permit_valid_till?: string
  is_active: boolean
}

// ===== Entry Types =====

export interface EntryPersonType {
  id: number
  name: string
  is_active: boolean
}

export interface EntryGate {
  id: number
  name: string
  location?: string
  is_active: boolean
}

export interface EntryLog {
  id: number
  person_type: EntryPersonType
  gate_in: EntryGate
  gate_out: EntryGate | null
  name_snapshot: string
  photo_snapshot?: string | null
  entry_time: string
  exit_time?: string | null
  purpose?: string | null
  vehicle_no?: string | null
  remarks?: string | null
  status: 'IN' | 'OUT' | 'CANCELLED'
  created_at: string
  updated_at: string
  visitor?: number | null
  labour?: number | null
  approved_by?: number | null
  created_by: number
}

// ===== Request Types =====

export interface CreatePersonTypeRequest {
  name: string
  is_active?: boolean
}

export interface CreateGateRequest {
  name: string
  location?: string
  is_active?: boolean
}

export interface CreateContractorRequest {
  contractor_name: string
  contact_person?: string
  mobile?: string
  address?: string
  contract_valid_till?: string
  is_active?: boolean
}

export interface CreateVisitorRequest {
  name: string
  mobile?: string
  company_name?: string
  id_proof_type?: string
  id_proof_no?: string
  photo?: File | null
  blacklisted?: boolean
}

export interface CreateLabourRequest {
  name: string
  contractor: number
  mobile?: string
  id_proof_no?: string
  photo?: File | null
  skill_type?: string
  permit_valid_till?: string
  is_active?: boolean
}

export interface CreateEntryRequest {
  person_type: number
  visitor?: number
  labour?: number
  gate_in: number
  purpose?: string
  approved_by?: number
  vehicle_no?: string
  remarks?: string
}

export interface ExitEntryRequest {
  gate_out: number
}

export interface UpdateEntryRequest {
  purpose?: string
  approved_by?: number
  vehicle_no?: string
  remarks?: string
}

// ===== API Response Types =====

export interface EntryCountItem {
  status: string
  count: number
}

export interface EntryCountResponse {
  total_entries: EntryCountItem[]
}

// ===== Dashboard Response Types =====

export interface DashboardCurrentStats {
  total_inside: number
  visitors_inside: number
  labours_inside: number
  long_duration_count: number
}

export interface DashboardTodayStats {
  total_entries: number
  visitors: number
  labours: number
  exits: number
}

export interface DashboardGateWise {
  id: number
  name: string
  inside_count: number
}

export interface DashboardPersonTypeWise {
  id: number
  name: string
  inside_count: number
  today_count: number
}

export interface DashboardResponse {
  current: DashboardCurrentStats
  today: DashboardTodayStats
  gate_wise: DashboardGateWise[]
  person_type_wise: DashboardPersonTypeWise[]
  recent_entries: EntryLog[]
}

// ===== History & Status Response Types =====

export interface VisitorHistoryResponse {
  visitor: Visitor
  is_inside: boolean
  current_entry: EntryLog | null
  total_visits: number
  entries: EntryLog[]
}

export interface LabourHistoryResponse {
  labour: Labour
  is_inside: boolean
  current_entry: EntryLog | null
  total_entries: number
  entries: EntryLog[]
}

export interface CheckStatusResponse {
  person_type: 'visitor' | 'labour'
  person_id: number
  name: string
  is_inside: boolean
  current_entry: EntryLog | null
  // Visitor-specific
  blacklisted?: boolean
  // Labour-specific
  is_active?: boolean
  permit_valid?: boolean
  permit_valid_till?: string
}

// ===== Paginated Response Types =====

export interface PaginatedEntriesResponse {
  count: number
  results: EntryLog[]
}

export interface SearchEntriesResponse {
  query: string
  count: number
  results: EntryLog[]
}

// ===== API Filters =====

export interface EntryFilters {
  from_date?: string
  to_date?: string
  status?: string
  person_type?: number
  gate_in?: number
  search?: string
}

// ===== API Functions =====

export const personGateInApi = {
  // ===== Person Types =====
  getPersonTypes: async (): Promise<PersonType[]> => {
    const response = await apiClient.get<PersonType[]>('/person-gatein/person-types/')
    return response.data
  },

  createPersonType: async (data: CreatePersonTypeRequest): Promise<PersonType> => {
    const response = await apiClient.post<PersonType>('/person-gatein/person-types/', data)
    return response.data
  },

  updatePersonType: async (id: number, data: CreatePersonTypeRequest): Promise<PersonType> => {
    const response = await apiClient.put<PersonType>(`/person-gatein/person-types/${id}/`, data)
    return response.data
  },

  deletePersonType: async (id: number): Promise<void> => {
    await apiClient.delete(`/person-gatein/person-types/${id}/`)
  },

  // ===== Gates =====
  getGates: async (): Promise<Gate[]> => {
    const response = await apiClient.get<Gate[]>('/person-gatein/gates/')
    return response.data
  },

  createGate: async (data: CreateGateRequest): Promise<Gate> => {
    const response = await apiClient.post<Gate>('/person-gatein/gates/', data)
    return response.data
  },

  updateGate: async (id: number, data: CreateGateRequest): Promise<Gate> => {
    const response = await apiClient.put<Gate>(`/person-gatein/gates/${id}/`, data)
    return response.data
  },

  deleteGate: async (id: number): Promise<void> => {
    await apiClient.delete(`/person-gatein/gates/${id}/`)
  },

  // ===== Contractors =====
  getContractors: async (): Promise<Contractor[]> => {
    const response = await apiClient.get<Contractor[]>('/person-gatein/contractors/')
    return response.data
  },

  createContractor: async (data: CreateContractorRequest): Promise<Contractor> => {
    const response = await apiClient.post<Contractor>('/person-gatein/contractors/', data)
    return response.data
  },

  updateContractor: async (id: number, data: CreateContractorRequest): Promise<Contractor> => {
    const response = await apiClient.put<Contractor>(`/person-gatein/contractors/${id}/`, data)
    return response.data
  },

  deleteContractor: async (id: number): Promise<void> => {
    await apiClient.delete(`/person-gatein/contractors/${id}/`)
  },

  // ===== Visitors =====
  getVisitors: async (search?: string): Promise<Visitor[]> => {
    const params = search ? { search } : {}
    const response = await apiClient.get<Visitor[]>('/person-gatein/visitors/', { params })
    return response.data
  },

  getVisitor: async (id: number): Promise<Visitor> => {
    const response = await apiClient.get<Visitor>(`/person-gatein/visitors/${id}/`)
    return response.data
  },

  createVisitor: async (data: CreateVisitorRequest): Promise<Visitor> => {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.mobile) formData.append('mobile', data.mobile)
    if (data.company_name) formData.append('company_name', data.company_name)
    if (data.id_proof_type) formData.append('id_proof_type', data.id_proof_type)
    if (data.id_proof_no) formData.append('id_proof_no', data.id_proof_no)
    if (data.photo) formData.append('photo', data.photo)
    if (data.blacklisted !== undefined) formData.append('blacklisted', String(data.blacklisted))

    const response = await apiClient.post<Visitor>('/person-gatein/visitors/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  updateVisitor: async (id: number, data: CreateVisitorRequest): Promise<Visitor> => {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.mobile) formData.append('mobile', data.mobile)
    if (data.company_name) formData.append('company_name', data.company_name)
    if (data.id_proof_type) formData.append('id_proof_type', data.id_proof_type)
    if (data.id_proof_no) formData.append('id_proof_no', data.id_proof_no)
    if (data.photo) formData.append('photo', data.photo)
    if (data.blacklisted !== undefined) formData.append('blacklisted', String(data.blacklisted))

    const response = await apiClient.put<Visitor>(`/person-gatein/visitors/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteVisitor: async (id: number): Promise<void> => {
    await apiClient.delete(`/person-gatein/visitors/${id}/`)
  },

  // ===== Labours =====
  getLabours: async (search?: string, contractorId?: number): Promise<Labour[]> => {
    const params: Record<string, string | number> = {}
    if (search) params.search = search
    if (contractorId) params.contractor = contractorId
    const response = await apiClient.get<Labour[]>('/person-gatein/labours/', { params })
    return response.data
  },

  getLabour: async (id: number): Promise<Labour> => {
    const response = await apiClient.get<Labour>(`/person-gatein/labours/${id}/`)
    return response.data
  },

  createLabour: async (data: CreateLabourRequest): Promise<Labour> => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('contractor', String(data.contractor))
    if (data.mobile) formData.append('mobile', data.mobile)
    if (data.id_proof_no) formData.append('id_proof_no', data.id_proof_no)
    if (data.photo) formData.append('photo', data.photo)
    if (data.skill_type) formData.append('skill_type', data.skill_type)
    if (data.permit_valid_till) formData.append('permit_valid_till', data.permit_valid_till)
    if (data.is_active !== undefined) formData.append('is_active', String(data.is_active))

    const response = await apiClient.post<Labour>('/person-gatein/labours/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  updateLabour: async (id: number, data: CreateLabourRequest): Promise<Labour> => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('contractor', String(data.contractor))
    if (data.mobile) formData.append('mobile', data.mobile)
    if (data.id_proof_no) formData.append('id_proof_no', data.id_proof_no)
    if (data.photo) formData.append('photo', data.photo)
    if (data.skill_type) formData.append('skill_type', data.skill_type)
    if (data.permit_valid_till) formData.append('permit_valid_till', data.permit_valid_till)
    if (data.is_active !== undefined) formData.append('is_active', String(data.is_active))

    const response = await apiClient.put<Labour>(`/person-gatein/labours/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteLabour: async (id: number): Promise<void> => {
    await apiClient.delete(`/person-gatein/labours/${id}/`)
  },

  // ===== Entry Logs =====
  // POST /entry/create/ - Create new entry (gate-in)
  createEntry: async (data: CreateEntryRequest): Promise<EntryLog> => {
    const response = await apiClient.post<EntryLog>('/person-gatein/entry/create/', data)
    return response.data
  },

  // GET /entry/{id}/ - Get entry details with duration
  getEntry: async (id: number): Promise<EntryLog> => {
    const response = await apiClient.get<EntryLog>(`/person-gatein/entry/${id}/`)
    return response.data
  },

  // POST /entry/{id}/exit/ - Mark entry as exited (gate-out)
  exitEntry: async (id: number, data: ExitEntryRequest): Promise<EntryLog> => {
    const response = await apiClient.post<EntryLog>(`/person-gatein/entry/${id}/exit/`, data)
    return response.data
  },

  // POST /entry/{id}/cancel/ - Cancel an entry
  cancelEntry: async (id: number): Promise<EntryLog> => {
    const response = await apiClient.post<EntryLog>(`/person-gatein/entry/${id}/cancel/`)
    return response.data
  },

  // PATCH /entry/{id}/update/ - Update entry details
  updateEntry: async (id: number, data: UpdateEntryRequest): Promise<EntryLog> => {
    const response = await apiClient.patch<EntryLog>(`/person-gatein/entry/${id}/update/`, data)
    return response.data
  },

  // GET /entry/inside/ - List all persons currently inside
  getInsideList: async (): Promise<EntryLog[]> => {
    const response = await apiClient.get<EntryLog[]>('/person-gatein/entry/inside/')
    return response.data
  },

  // GET /entries/ - Get entries with date filters (returns paginated response)
  getAllEntries: async (filters?: EntryFilters): Promise<PaginatedEntriesResponse> => {
    const response = await apiClient.get<PaginatedEntriesResponse>('/person-gatein/entries/', { params: filters })
    return response.data
  },

  // GET /entries/search/ - Search entries (returns paginated response)
  searchEntries: async (filters?: EntryFilters): Promise<SearchEntriesResponse> => {
    const response = await apiClient.get<SearchEntriesResponse>('/person-gatein/entries/search/', { params: filters })
    return response.data
  },

  // Helper: Get entry counts (if needed)
  getEntryCounts: async (filters?: EntryFilters): Promise<EntryCountResponse> => {
    const response = await apiClient.get<EntryCountResponse>('/person-gatein/entries/count/', { params: filters })
    return response.data
  },

  // GET /dashboard/ - Get dashboard statistics
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await apiClient.get<DashboardResponse>('/person-gatein/dashboard/')
    return response.data
  },

  // GET /visitor/{id}/history/ - Get visitor entry history
  getVisitorHistory: async (visitorId: number): Promise<VisitorHistoryResponse> => {
    const response = await apiClient.get<VisitorHistoryResponse>(`/person-gatein/visitor/${visitorId}/history/`)
    return response.data
  },

  // GET /labour/{id}/history/ - Get labour entry history
  getLabourHistory: async (labourId: number): Promise<LabourHistoryResponse> => {
    const response = await apiClient.get<LabourHistoryResponse>(`/person-gatein/labour/${labourId}/history/`)
    return response.data
  },

  // GET /check-status/ - Check if person is inside
  checkPersonStatus: async (params: { visitor?: number; labour?: number }): Promise<CheckStatusResponse> => {
    const response = await apiClient.get<CheckStatusResponse>('/person-gatein/check-status/', { params })
    return response.data
  },
}
