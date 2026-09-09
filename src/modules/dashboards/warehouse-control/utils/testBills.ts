/** Shared bill factory for the board's util tests. */
import type {
  DispatchBill,
  DispatchPlan,
  DispatchPlanStatus,
} from '@/modules/dashboards/dispatch-plans/types';

export const TODAY = '2026-09-08';

export interface BillSpec {
  docEntry: number;
  docNum?: string;
  /** Omit for today; pass `null` for a bill with no dispatch date. */
  dispatchDate?: string | null;
  vehicleId?: number | null;
  vehicleNo?: string;
  status?: DispatchPlanStatus;
  locked?: boolean;
  litres?: number;
  boxes?: number;
  weight?: number;
  total?: number;
  companyCode?: string | null;
}

export function makeBill(spec: BillSpec): DispatchBill {
  const plan = {
    id: spec.docEntry,
    sap_invoice_doc_entry: spec.docEntry,
    sap_invoice_doc_num: spec.docNum ?? String(spec.docEntry),
    dispatch_date: spec.dispatchDate === undefined ? TODAY : spec.dispatchDate,
    vehicle_id: spec.vehicleId ?? null,
    vehicle_no: spec.vehicleNo ?? '',
    transporter_id: null,
    transporter_name: 'Sharma Roadways',
    driver_name: 'Ramesh',
    booking_status: spec.status ?? 'PENDING',
    is_vehicle_link_locked: spec.locked ?? false,
  } as unknown as DispatchPlan;

  return {
    doc_entry: spec.docEntry,
    doc_num: spec.docNum ?? String(spec.docEntry),
    card_name: 'Some Customer',
    doc_total: spec.total ?? 0,
    total_litres: spec.litres ?? 0,
    total_boxes: spec.boxes ?? 0,
    total_weight: spec.weight ?? 0,
    company_code: spec.companyCode ?? null,
    plan,
  } as unknown as DispatchBill;
}
