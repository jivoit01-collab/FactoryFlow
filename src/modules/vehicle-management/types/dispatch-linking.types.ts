import type { DispatchBill, DispatchPlanStatus } from '@/modules/dashboards/dispatch-plans/types';

export type DispatchLinkingBucket = 'today' | 'overdue' | 'upcoming' | 'all';

export interface DispatchLinkingFilters {
  bucket: DispatchLinkingBucket;
  date: string;
  booking_status?: DispatchPlanStatus | 'all';
  search?: string;
  limit?: number;
}

export interface DispatchLinkingResponse {
  data: DispatchBill[];
  meta: {
    total: number;
    today: number;
    overdue: number;
    upcoming: number;
    pending: number;
    booked: number;
    dispatched: number;
    cancelled: number;
  };
}

export interface DispatchVehicleLinkPayload {
  sap_invoice_doc_num: string;
  linked_invoice_doc_entries?: number[];
  eway_bill?: string;
  invoice_weight: string | null;
  invoice_amount: string | null;
  place_of_supply: string;
  product_variety: string;
  total_litres: string | null;
  effective_month: string | null;
  budget_delivery_point: string;
  service_location_code: number | null;
  service_location_name: string;
  sac_entry: number | null;
  sac_code: string;
  vehicle_id: number | null;
  transporter_id: number | null;
  driver_id?: number | null;
  linked_vehicle_entry_id?: number | null;
  booking_status: DispatchPlanStatus;
  dispatch_date: string | null;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
  vehicle_no: string;
  driver_name?: string;
  driver_mobile_no?: string;
  driver_license_no?: string;
  driver_id_proof_type?: string;
  driver_id_proof_number?: string;
  bilty_no?: string;
  bilty_date?: string | null;
  bilty_attachment?: File | null;
  freight?: string | null;
  total_freight?: string | null;
  kanta_weight?: string | null;
  remarks: string;
}

/**
 * Transport captured on a vehicle, used to seed the linking sheet when bills are
 * added to a truck that is already linked (vehicle-based Vehicle Linking page).
 */
export interface DispatchLinkingVehicleSeed {
  vehicle_id: number | null;
  vehicle_no: string;
  transporter_id: number | null;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
}

/**
 * One linked truck on the Vehicle Linking page: a vehicle plus every dispatch
 * bill currently booked onto it. Derived client-side by grouping the plans feed
 * on `plan.vehicle_id` — there is no vehicle-shaped endpoint for booked (not yet
 * gated-in) trucks, and the bills feed already carries the transport snapshot.
 */
export interface LinkedVehicleGroup {
  vehicleId: number;
  vehicleNo: string;
  transporterName: string;
  transporterGstin: string;
  contactPerson: string;
  mobileNo: string;
  driverName: string;
  driverMobile: string;
  biltyNos: string[];
  dispatchDates: string[];
  /** Company codes whose bills ride on this truck — one truck, many companies. */
  companyCodes: string[];
  bills: DispatchBill[];
  totals: {
    litres: number;
    weight: number;
    amount: number;
    boxes: number;
  };
  /** Any bill on this truck has a completed empty-vehicle gate-in — links frozen. */
  isLocked: boolean;
  /** Any bill is attached to a live gate entry (the truck is at/inside the gate). */
  isGateLinked: boolean;
}
