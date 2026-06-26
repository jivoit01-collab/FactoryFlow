import { apiClient } from '@/core/api';

export type LabourShift = 'DAY' | 'NIGHT';
export type LabourSheetStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED';

export interface LabourCountItem {
  id?: number;
  contractor: number;
  contractor_name?: string;
  count: number;
}

export interface LabourOutBatch {
  id: number;
  count: number;
  created_at: string;
  by?: string | null;
}

export interface LabourCountSheet {
  id: number;
  company: number;
  department: number;
  department_name?: string;
  work_date: string;
  shift: LabourShift;
  status: LabourSheetStatus;
  is_holiday: boolean;
  lock_at: string;
  submitted_at?: string | null;
  auto_submitted: boolean;
  verified_at?: string | null;
  verified_by_name?: string | null;
  gate_counted?: number | null;
  variance?: number | null;
  remaining?: number;
  verify_remark?: string;
  total_count: number;
  items: LabourCountItem[];
  out_batches?: LabourOutBatch[];
  is_editable: boolean;
  can_pull_back: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EnsureSheetRequest {
  work_date: string;
  shift: LabourShift;
  department: number;
}

export interface ItemsUpsertRequest {
  items: Array<{ contractor: number; count: number }>;
}

export interface LabourHistoryParams {
  department?: number;
  shift?: LabourShift;
  from?: string;
  to?: string;
}

export interface BoardParams {
  work_date: string;
  shift: LabourShift;
  department?: number;
  contractor?: number;
}

export interface MarkOutRequest {
  sheet: number;
  count: number;
}

export interface FinalizeRequest {
  sheet: number;
  remark?: string;
}

const BASE = '/labour-count';

export const labourCountApi = {
  ensureSheet: async (data: EnsureSheetRequest): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/sheet/ensure/`, data)).data;
  },

  getSheet: async (id: number): Promise<LabourCountSheet> => {
    return (await apiClient.get<LabourCountSheet>(`${BASE}/sheet/${id}/`)).data;
  },

  saveItems: async (id: number, data: ItemsUpsertRequest): Promise<LabourCountSheet> => {
    return (await apiClient.put<LabourCountSheet>(`${BASE}/sheet/${id}/items/`, data)).data;
  },

  submit: async (id: number): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/sheet/${id}/submit/`)).data;
  },

  pullBack: async (id: number): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/sheet/${id}/pull-back/`)).data;
  },

  markHoliday: async (id: number): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/sheet/${id}/holiday/`)).data;
  },

  history: async (params: LabourHistoryParams): Promise<LabourCountSheet[]> => {
    const qs = new URLSearchParams();
    if (params.department) qs.append('department', String(params.department));
    if (params.shift) qs.append('shift', params.shift);
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    const url = qs.toString() ? `${BASE}/sheet/history/?${qs.toString()}` : `${BASE}/sheet/history/`;
    return (await apiClient.get<LabourCountSheet[]>(url)).data;
  },

  // ----- Gate side -----
  board: async (params: BoardParams): Promise<LabourCountSheet[]> => {
    const qs = new URLSearchParams();
    qs.append('work_date', params.work_date);
    qs.append('shift', params.shift);
    if (params.department) qs.append('department', String(params.department));
    if (params.contractor) qs.append('contractor', String(params.contractor));
    return (await apiClient.get<LabourCountSheet[]>(`${BASE}/gate/board/?${qs.toString()}`)).data;
  },

  markOut: async (data: MarkOutRequest): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/gate/out/`, data)).data;
  },

  undoOut: async (sheetId: number): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/gate/out/undo/`, { sheet: sheetId }))
      .data;
  },

  finalize: async (data: FinalizeRequest): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/gate/finalize/`, data)).data;
  },

  reopen: async (sheetId: number): Promise<LabourCountSheet> => {
    return (await apiClient.post<LabourCountSheet>(`${BASE}/gate/sheet/${sheetId}/reopen/`)).data;
  },
};
