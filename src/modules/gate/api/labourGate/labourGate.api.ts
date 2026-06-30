import { apiClient } from '@/core/api';

export interface LabourOutBatch {
  id: number;
  count: number;
  created_at: string;
  by?: string | null;
}

export interface LabourGateEntry {
  id: number;
  company: number;
  department: number | null;
  department_name?: string;
  contractor: number;
  contractor_name?: string;
  work_date: string;
  count_in: number;
  total_out: number;
  remaining: number;
  out_batches: LabourOutBatch[];
  created_at?: string;
  updated_at?: string;
}

export interface RecordInRequest {
  department: number;
  contractor: number;
  work_date: string;
  count_in: number;
}

const BASE = '/labour-gate';

export const labourGateApi = {
  // GET /labour-gate/?date= — the day's in/out tally for every contractor.
  listDay: async (date: string): Promise<LabourGateEntry[]> => {
    return (await apiClient.get<LabourGateEntry[]>(`${BASE}/?date=${date}`)).data;
  },

  // POST /labour-gate/in/ — create/update a contractor's labour-in count.
  recordIn: async (data: RecordInRequest): Promise<LabourGateEntry> => {
    return (await apiClient.post<LabourGateEntry>(`${BASE}/in/`, data)).data;
  },

  // PATCH /labour-gate/{id}/ — edit the labour-in count.
  updateIn: async (id: number, count_in: number): Promise<LabourGateEntry> => {
    return (await apiClient.patch<LabourGateEntry>(`${BASE}/${id}/`, { count_in })).data;
  },

  // DELETE /labour-gate/{id}/ — remove an entry (only if nothing marked out yet).
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}/`);
  },

  // POST /labour-gate/{id}/out/ — add one batch of people leaving.
  addOut: async (id: number, count: number): Promise<LabourGateEntry> => {
    return (await apiClient.post<LabourGateEntry>(`${BASE}/${id}/out/`, { count })).data;
  },

  // POST /labour-gate/{id}/out/undo/ — remove the most recent out batch.
  undoOut: async (id: number): Promise<LabourGateEntry> => {
    return (await apiClient.post<LabourGateEntry>(`${BASE}/${id}/out/undo/`)).data;
  },
};
