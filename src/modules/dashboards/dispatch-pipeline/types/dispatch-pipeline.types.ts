export type PipelineStage =
  | 'BOOKED'
  | 'EMPTY_IN'
  | 'READY_TO_DOCK'
  | 'DOCKED'
  | 'PHOTO_ATTACHED'
  | 'READY_FOR_GATEPASS'
  | 'GATEPASS_PRINTED'
  | 'PRINT_COMMITTED'
  | 'DISPATCHED'
  | 'REJECTED';

export interface DispatchPipelineFilters {
  date_from: string;
  date_to: string;
  search?: string;
  stage?: PipelineStage | '';
}

export interface PipelineColumn {
  stage: PipelineStage;
  label: string;
  count: number;
}

export interface PipelineCard {
  plan_id: number;
  stage: PipelineStage;
  stage_label: string;
  stage_at: string | null;

  sap_invoice_doc_entry: number | null;
  sap_doc_num: string;
  invoice_number: string;

  vehicle_no: string;
  vehicle_id: number | null;
  transporter_name: string;
  driver_name: string;
  driver_mobile_no: string;
  dispatch_date: string | null;
  place_of_supply: string;
  customer_name: string;

  empty_gate_in_entry_no: string | null;
  gate_out_id: number | null;
  gate_out_entry_no: string | null;
  gate_out_status: string | null;
  gate_out_vehicle_entry_id: number | null;
}

export interface DispatchPipelineMeta {
  date_from: string;
  date_to: string;
  total: number;
}

export interface DispatchPipelineResponse {
  columns: PipelineColumn[];
  cards: PipelineCard[];
  meta: DispatchPipelineMeta;
}
