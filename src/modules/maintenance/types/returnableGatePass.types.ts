/**
 * Returnable Gate Pass — items that leave the gate temporarily for repair,
 * exchange, calibration, job work and the like, and are expected back.
 *
 * The document is raised by a department, gated out and gated back in by the
 * gate, and closed by the department once it has collected the material.
 */

export type ReturnableStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING_GATE_OUT'
  | 'OUT'
  | 'PARTIALLY_RETURNED'
  | 'RETURNED'
  | 'CLOSED'
  | 'CANCELLED';

export type ReturnablePurpose =
  | 'REPAIR'
  | 'EXCHANGE'
  | 'CALIBRATION'
  | 'JOB_WORK'
  | 'WARRANTY_CLAIM'
  | 'TESTING'
  | 'DEMO_TRIAL'
  | 'OTHER';

export type ItemConditionOut = 'WORKING' | 'FAULTY' | 'DAMAGED' | 'NEW' | 'OTHER';

export type ItemReturnCondition =
  | 'OK'
  | 'REPAIRED'
  | 'REPLACED'
  | 'NOT_REPAIRED'
  | 'DAMAGED'
  | 'SCRAP';

export type ReturnableLogAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'APPROVAL_REJECTED'
  | 'GATE_OUT'
  | 'REJECTED_AT_GATE'
  | 'RETURN_RECORDED'
  | 'ACKNOWLEDGED'
  | 'CLOSED'
  | 'SHORT_CLOSED'
  | 'CANCELLED'
  | 'DUE_TODAY'
  | 'OVERDUE_FLAGGED';

export type AttachmentDocType = 'CHALLAN' | 'PHOTO' | 'INVOICE' | 'OTHER';

/** One row of the SAP item master (OITM), as returned by the omni-search. */
export interface SapItem {
  item_code: string;
  item_name: string;
  uom: string;
}

export interface ReturnableGatePassItem {
  id: number;
  company: number;
  gate_pass: number;
  line_num: number;
  item_code: string;
  item_name: string;
  description: string;
  serial_no: string;
  make_model: string;
  spare: number | null;
  asset: number | null;
  uom: string;
  quantity_out: string;
  quantity_returned: string;
  condition_out: ItemConditionOut;
  condition_out_display: string;
  estimated_value: string | null;
  remarks: string;
  pending_return_qty: string;
  is_fully_returned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReturnableReturnEventItem {
  id: number;
  company: number;
  event: number;
  pass_item: number;
  item_name: string;
  serial_no: string;
  uom: string;
  quantity_returned: string;
  return_condition: ItemReturnCondition;
  return_condition_display: string;
  remarks: string;
  created_at: string;
}

/** One physical return trip. A pass may have several. */
export interface ReturnableReturnEvent {
  id: number;
  company: number;
  gate_pass: number;
  event_no: number;
  event_ref: string;
  returned_at: string;
  vehicle: number | null;
  driver: number | null;
  transporter: number | null;
  vehicle_number: string;
  vehicle_number_manual: string;
  driver_name_manual: string;
  driver_mobile: string;
  security_name: string;
  verified_by: number | null;
  verified_by_name: string;
  verified_at: string | null;
  acknowledged_by: number | null;
  acknowledged_by_name: string;
  acknowledged_at: string | null;
  is_acknowledged: boolean;
  remarks: string;
  lines: ReturnableReturnEventItem[];
  created_at: string;
}

export interface ReturnableGatePassAttachment {
  id: number;
  company: number;
  gate_pass: number;
  file: string;
  doc_type: AttachmentDocType;
  doc_type_display: string;
  caption: string;
  created_at: string;
  created_by_name: string;
}

export interface ReturnableGatePassLog {
  id: number;
  action: ReturnableLogAction;
  action_display: string;
  actor: number | null;
  actor_name: string;
  at: string;
  note: string;
  meta: Record<string, unknown>;
}

/** Light shape returned by the list endpoint and the two gate queues. */
export interface ReturnableGatePassListItem {
  id: number;
  company: number;
  pass_no: string;
  status: ReturnableStatus;
  status_display: string;
  /** False for material issued out that never comes back. */
  is_returnable: boolean;
  /** Non-empty when this pass was auto-generated from a maintenance Material Indent. */
  material_indent_no: string;
  purpose: ReturnablePurpose;
  purpose_display: string;
  department: number | null;
  department_name: string;
  party_name: string;
  recipient_name: string;
  /** Vendor on a returnable pass, person on a non-returnable one. */
  destination: string;
  /** Comma-joined names of the items on the pass, for list views. */
  item_names: string;
  expected_return_date: string | null;
  is_overdue: boolean;
  days_overdue: number;
  item_count: number;
  pending_return_qty: string;
  gate_out_at: string | null;
  last_return_at: string | null;
  created_at: string;
  created_by_name: string;
}

export interface ReturnableGatePass {
  id: number;
  company: number;
  pass_no: string;
  status: ReturnableStatus;
  status_display: string;
  is_returnable: boolean;
  /** Non-empty when this pass was auto-generated from a maintenance Material Indent. */
  material_indent_no: string;

  department: number | null;
  department_name: string;
  requested_by_name: string;
  contact_no: string;

  purpose: ReturnablePurpose;
  purpose_display: string;
  purpose_detail: string;

  party_name: string;
  party_contact: string;
  party_address: string;
  party_gstin: string;

  /** Who receives the material on a non-returnable pass. */
  recipient: number | null;
  recipient_name: string;
  recipient_display_name: string;
  recipient_contact: string;
  recipient_department: string;
  /** Who handed the material over. Non-returnable passes only. */
  issued_by_name: string;
  destination: string;

  /** Null on a non-returnable pass — nothing is coming back. */
  expected_return_date: string | null;
  is_overdue: boolean;
  days_overdue: number;

  asset: number | null;
  asset_name: string;
  work_order: number | null;
  work_order_no: string;

  // Filled by the gate at gate-out, not by the department.
  vehicle: number | null;
  vehicle_number: string;
  driver: number | null;
  driver_name: string;
  transporter: number | null;
  transporter_name: string;
  vehicle_number_manual: string;
  driver_name_manual: string;
  driver_mobile: string;
  security_name: string;
  out_remarks: string;
  /** Material walked out by hand — no vehicle was recorded. */
  is_hand_carried: boolean;
  carried_by_name: string;

  submitted_by: number | null;
  submitted_by_name: string;
  submitted_at: string | null;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  gate_out_by: number | null;
  gate_out_by_name: string;
  gate_out_at: string | null;
  last_return_at: string | null;
  closed_by: number | null;
  closed_by_name: string;
  closed_at: string | null;
  cancelled_by: number | null;
  cancelled_at: string | null;
  cancel_reason: string;
  /** Why the approver sent it back. Distinct from rejected_reason (the gate). */
  approval_rejected_reason: string;
  rejected_reason: string;
  short_close_reason: string;

  total_estimated_value: string;
  total_quantity_out: string;
  total_quantity_returned: string;
  pending_return_qty: string;
  is_fully_returned: boolean;

  items: ReturnableGatePassItem[];
  return_events: ReturnableReturnEvent[];
  attachments: ReturnableGatePassAttachment[];

  created_at: string;
  updated_at: string;
  created_by_name: string;
  updated_by_name: string;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface ReturnableItemInput {
  /** Present when editing an existing line; omitted for a new one. */
  id?: number;
  item_code?: string;
  item_name: string;
  description?: string;
  serial_no?: string;
  make_model?: string;
  spare?: number | null;
  asset?: number | null;
  uom?: string;
  quantity_out: string;
  condition_out?: ItemConditionOut;
  estimated_value?: string | null;
  remarks?: string;
}

export interface ReturnableGatePassPayload {
  /** Fixed at creation — the pass number encodes RGP vs NRGP. */
  is_returnable: boolean;
  department?: number | null;
  requested_by_name?: string;
  contact_no?: string;
  purpose: ReturnablePurpose;
  purpose_detail?: string;
  /** Required when returnable. */
  party_name?: string;
  party_contact?: string;
  party_address?: string;
  party_gstin?: string;
  /** Required when non-returnable. */
  recipient_name?: string;
  recipient_contact?: string;
  recipient_department?: string;
  /** Non-returnable only — the counterpart to recipient_name. */
  issued_by_name?: string;
  /** Required when returnable; ignored otherwise. */
  expected_return_date?: string | null;
  asset?: number | null;
  work_order?: number | null;
  items_input: ReturnableItemInput[];
}

export type ReturnableGatePassUpdatePayload = Partial<ReturnableGatePassPayload>;

/** The gate's own details, captured at gate-out. */
export interface ReturnableGateOutPayload {
  vehicle?: number | null;
  driver?: number | null;
  transporter?: number | null;
  vehicle_number_manual?: string;
  driver_name_manual?: string;
  driver_mobile?: string;
  security_name?: string;
  out_remarks?: string;
  /** When true the backend ignores and clears every vehicle field. */
  is_hand_carried?: boolean;
  /** Required when `is_hand_carried` is true. */
  carried_by_name?: string;
}

export interface ReturnableReturnLineInput {
  pass_item: number;
  quantity_returned: string;
  return_condition?: ItemReturnCondition;
  remarks?: string;
}

/** The returning vehicle is captured independently — vendors send their own. */
export interface ReturnableRecordReturnPayload {
  returned_at?: string;
  vehicle?: number | null;
  driver?: number | null;
  transporter?: number | null;
  vehicle_number_manual?: string;
  driver_name_manual?: string;
  driver_mobile?: string;
  security_name?: string;
  remarks?: string;
  lines: ReturnableReturnLineInput[];
}

export interface ReturnableReasonPayload {
  reason: string;
}

export interface ReturnableAcknowledgePayload {
  /** Omit to acknowledge every outstanding return event on the pass. */
  event?: number;
}

export interface ReturnableApprovePayload {
  remarks?: string;
}

/** A file staged in the create/edit form, uploaded once the pass has an id. */
export interface StagedAttachment {
  file: File;
  doc_type: AttachmentDocType;
  caption: string;
}

export interface ReturnableFilters {
  status?: ReturnableStatus | 'ALL' | string;
  /** true = returnable only, false = non-returnable only, omit for both. */
  is_returnable?: boolean;
  purpose?: ReturnablePurpose | 'ALL';
  department?: number;
  party?: string;
  overdue?: boolean;
  expected_return_from?: string;
  expected_return_to?: string;
  q?: string;
}

export interface ReturnableDashboard {
  status_counts: Record<ReturnableStatus, number>;
  overdue_count: number;
  due_today_count: number;
  outstanding_count: number;
  pending_approval_count: number;
  pending_gate_out_count: number;
  returnable_count: number;
  non_returnable_count: number;
  outstanding_value: string | number;
  ageing_buckets: {
    '0_7': number;
    '8_15': number;
    '16_30': number;
    '30_plus': number;
  };
}
