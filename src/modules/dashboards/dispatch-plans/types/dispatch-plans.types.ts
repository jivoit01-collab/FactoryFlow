import type { PipelineStatus } from '@/modules/dashboards/dispatch-pipeline/types';

export type DispatchPlanStatus = 'PENDING' | 'BOOKED' | 'DISPATCHED' | 'CANCELLED';

export interface DispatchPlanFilters {
  date_from: string;
  date_to: string;
  booking_status?: DispatchPlanStatus | 'all';
  search?: string;
  branch?: string;
  limit?: number;
  exclude_jivo_mart_transfer?: boolean;
  /** Window on the plan's scheduled dispatch_date instead of the SAP invoice date. */
  by_dispatch_date?: boolean;
  /** 1 = aggregate SAP bills across every company the user belongs to (cross-company). */
  all_companies?: boolean;
}

export interface DispatchPlan {
  id: number | null;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  invoice_number: string;
  eway_bill: string;
  invoice_weight: string | null;
  invoice_amount: string | null;
  place_of_supply: string;
  /** Free-text delivery location filled by the dispatch-planning team. */
  location: string;
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
  driver_id: number | null;
  linked_vehicle_entry_id: number | null;
  is_vehicle_link_locked: boolean;
  pipeline_status: PipelineStatus | null;
  booking_status: DispatchPlanStatus;
  dispatch_date: string | null;
  priority: string;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile_no: string;
  driver_license_no: string;
  driver_id_proof_type: string;
  driver_id_proof_number: string;
  bilty_no: string;
  bilty_date: string | null;
  bilty_attachment: string | null;
  bilty_attachment_name: string;
  freight: string | null;
  total_freight: string | null;
  kanta_weight: string | null;
  remarks: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface DispatchBill {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  create_date: string | null;
  create_time: string;
  card_code: string;
  card_name: string;
  doc_total: number;
  branch_id: number | null;
  branch_name: string;
  ship_to_code: string;
  ship_to_address: string;
  state: string;
  city: string;
  bp_gstin: string;
  sap_dispatch_date: string | null;
  sap_bilty_no: string;
  sap_bilty_date: string | null;
  sap_transporter_name: string;
  sap_vehicle_no: string;
  sap_transporter_invoice: string;
  sap_lr_number: string;
  sap_eway_bill: string;
  gst_vehicle_no: string;
  gst_transport_date: string | null;
  gst_transport_reason: string;
  line_count: number;
  total_quantity: number;
  total_litres: number;
  total_boxes: number;
  total_weight: number;
  total_line_amount: number;
  total_gross_amount: number;
  warehouses: string;
  item_summary: string;
  base_refs: string;
  plan: DispatchPlan;
}

export interface DispatchPlansMeta {
  total_bills: number;
  pending_count: number;
  booked_count: number;
  dispatched_count: number;
  cancelled_count: number;
  total_doc_value: number;
  total_litres: number;
  total_boxes: number;
  fetched_at: string;
}

export interface DispatchPlansResponse {
  data: DispatchBill[];
  meta: DispatchPlansMeta;
}

export interface DispatchPlanUpdatePayload {
  sap_invoice_doc_num?: string;
  linked_invoice_doc_entries?: number[];
  invoice_number?: string;
  eway_bill?: string;
  invoice_weight?: string | null;
  invoice_amount?: string | null;
  place_of_supply?: string;
  location?: string;
  product_variety?: string;
  total_litres?: string | null;
  effective_month?: string | null;
  budget_delivery_point?: string;
  service_location_code?: number | null;
  service_location_name?: string;
  sac_entry?: number | null;
  sac_code?: string;
  vehicle_id?: number | null;
  transporter_id?: number | null;
  driver_id?: number | null;
  linked_vehicle_entry_id?: number | null;
  booking_status?: DispatchPlanStatus;
  dispatch_date?: string | null;
  priority?: string;
  transporter_name?: string;
  transporter_gstin?: string;
  contact_person?: string;
  mobile_no?: string;
  vehicle_no?: string;
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
  remarks?: string;
}
