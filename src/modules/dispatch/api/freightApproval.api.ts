import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { FreightRateBasis } from '../types/freightBenchmark.types';

/**
 * A truck's freight against the benchmark for where it is going.
 *
 * WITHIN_BENCHMARK needs nothing; PENDING waits in Admin > Freight Approvals and
 * the gate refuses the truck until it is APPROVED; REJECTED waits for dispatch
 * to enter a freight that can be cleared. SUPERSEDED is a row a later freight
 * entry replaced.
 */
export type FreightApprovalStatus =
  | 'WITHIN_BENCHMARK'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED';

export interface DispatchFreightApproval {
  id: number;
  company: number;
  company_code: string;
  company_name: string;
  vehicle: number;
  vehicle_no: string;
  vehicle_capacity_kg: number | null;
  transporter_name: string;
  destination: number;
  destination_label: string;
  slab: number;
  slab_label: string;
  /** The slab the vehicle's capacity fell in; differs from `slab` when the desk chose another. */
  suggested_slab: number | null;
  suggested_slab_label: string;
  rate_basis: FreightRateBasis | '';
  rate_amount: number | null;
  /** The weight a per-kg rate was multiplied by. */
  load_kg: number | null;
  /** `null` when the destination has no rate on the slab. */
  benchmark_freight: number | null;
  actual_freight: number;
  excess: number | null;
  bill_doc_nums: string;
  customer_names: string;
  bill_count: number;
  status: FreightApprovalStatus;
  reason: string;
  requested_by_name: string;
  requested_at: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
}

/** A bill by the company that owns its plan and its SAP invoice DocEntry. */
export interface TruckFreightBill {
  company_code: string;
  doc_entry: number;
}

export interface TruckFreightInput {
  vehicle_id: number;
  destination_id: number;
  slab_id: number;
  actual_freight: string;
  reason: string;
  /** The bills the freight is for. */
  bills: TruckFreightBill[];
  /**
   * Also keep every bill the truck's current freight covers — the linking
   * sheet, which only knows the bills it is adding. Without it the named bills
   * are the whole of it — the truck card, which shows the truck's bills.
   */
  extend: boolean;
}

export interface TruckFreightRow {
  vehicle_id: number;
  vehicle_no: string;
  approval: DispatchFreightApproval | null;
  /** The bills the current freight covers. */
  covered_bills: TruckFreightBill[];
}

export const freightApprovalApi = {
  async list(status: FreightApprovalStatus | 'ALL'): Promise<DispatchFreightApproval[]> {
    const response = await apiClient.get<DispatchFreightApproval[]>(
      API_ENDPOINTS.DISPATCH.FREIGHT_APPROVALS,
      { params: { status, all_companies: 1 } },
    );
    return response.data;
  },
  async trucks(): Promise<TruckFreightRow[]> {
    const response = await apiClient.get<TruckFreightRow[]>(
      API_ENDPOINTS.DISPATCH.FREIGHT_APPROVAL_TRUCKS,
    );
    return response.data;
  },
  async recordTruckFreight(
    data: TruckFreightInput,
  ): Promise<{ approval: DispatchFreightApproval }> {
    const response = await apiClient.post<{ approval: DispatchFreightApproval }>(
      API_ENDPOINTS.DISPATCH.FREIGHT_APPROVAL_TRUCK,
      data,
    );
    return response.data;
  },
  async approve(id: number, notes: string): Promise<DispatchFreightApproval> {
    const response = await apiClient.post<DispatchFreightApproval>(
      API_ENDPOINTS.DISPATCH.FREIGHT_APPROVAL_APPROVE(id),
      { notes },
    );
    return response.data;
  },
  async reject(id: number, notes: string): Promise<DispatchFreightApproval> {
    const response = await apiClient.post<DispatchFreightApproval>(
      API_ENDPOINTS.DISPATCH.FREIGHT_APPROVAL_REJECT(id),
      { notes },
    );
    return response.data;
  },
};

export const FREIGHT_APPROVAL_QUERY_KEY = ['dispatch', 'freight-approvals'] as const;

export function useFreightApprovals(
  status: FreightApprovalStatus | 'ALL',
  { enabled = true, poll = false }: { enabled?: boolean; poll?: boolean } = {},
) {
  return useQuery({
    queryKey: [...FREIGHT_APPROVAL_QUERY_KEY, 'queue', status],
    queryFn: () => freightApprovalApi.list(status),
    enabled,
    staleTime: 15 * 1000,
    // A truck can be waiting at the gate on this, so the badge keeps up.
    refetchInterval: poll ? 30 * 1000 : false,
  });
}

/** Every booked, not-yet-gated truck with the freight approval it stands on. */
export function useTruckFreights(enabled = true) {
  return useQuery({
    queryKey: [...FREIGHT_APPROVAL_QUERY_KEY, 'trucks'],
    queryFn: () => freightApprovalApi.trucks(),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useRecordTruckFreight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TruckFreightInput) => freightApprovalApi.recordTruckFreight(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FREIGHT_APPROVAL_QUERY_KEY }),
  });
}

export function useReviewFreightApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, notes }: { id: number; approve: boolean; notes: string }) =>
      approve ? freightApprovalApi.approve(id, notes) : freightApprovalApi.reject(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FREIGHT_APPROVAL_QUERY_KEY }),
  });
}
