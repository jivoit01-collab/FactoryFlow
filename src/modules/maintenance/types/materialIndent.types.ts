// Material indent types — a departmental requisition that, once approved, generates
// a gate pass and appears in the gate's Material Out screen.

export type MaterialIndentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ISSUED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PURCHASED'
  | 'GATE_IN'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export type MaterialIndentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type MaterialIndentDocType = 'INVOICE' | 'BILL' | 'OTHER';

export interface MaterialIndentAttachment {
  id: number;
  indent: number;
  file: string;
  doc_type: MaterialIndentDocType;
  doc_type_display: string;
  title: string;
  uploaded_by_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndentItem {
  id: number;
  indent: number;
  line_num: number;
  particulars: string;
  specification: string;
  quantity: string;
  unit: string;
  priority: MaterialIndentPriority;
  /** How much the store issued from stock. */
  issued_quantity: string;
  /** quantity − issued_quantity; the amount to purchase. */
  shortfall_quantity: string;
  /** How much of the purchased shortfall was received into stock. */
  received_quantity: string;
  received_spare: number | null;
  received_spare_name: string;
  remarks: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndent {
  id: number;
  company: number;
  indent_no: string;
  indent_date: string;
  purpose: string;
  department: number | null;
  department_name: string;
  requested_by_name: string;
  contact_no: string;
  status: MaterialIndentStatus;
  status_display: string;
  remarks: string;
  submitted_by: number | null;
  submitted_by_name: string;
  submitted_at: string | null;
  // Store engineer review
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  store_remarks: string;
  // Higher-authority purchase approval
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  decision_remarks: string;
  // Purchaser completion
  purchased_by: number | null;
  purchased_by_name: string;
  purchased_at: string | null;
  purchase_remarks: string;
  // Gate-in of purchased goods
  gatein_vehicle_number: string;
  gatein_driver_name: string;
  gatein_driver_mobile: string;
  gate_in_by: number | null;
  gate_in_by_name: string;
  gate_in_at: string | null;
  // Store receipt into stock
  received_by: number | null;
  received_by_name: string;
  received_at: string | null;
  items: MaterialIndentItem[];
  attachments: MaterialIndentAttachment[];
  total_items: number;
  /** True when any item has a purchase shortfall. */
  has_shortfall: boolean;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndentItemInput {
  particulars: string;
  specification?: string;
  quantity: string;
  unit?: string;
  priority?: MaterialIndentPriority;
  remarks?: string;
}

export interface MaterialIndentPayload {
  indent_date: string;
  purpose?: string;
  department?: number | null;
  requested_by_name?: string;
  contact_no?: string;
  remarks?: string;
  items_input?: MaterialIndentItemInput[];
}

export type MaterialIndentUpdatePayload = Partial<MaterialIndentPayload>;

export interface MaterialIndentReviewPayload {
  items: Array<{ id: number; issued_quantity: string }>;
  store_remarks?: string;
}

export interface MaterialIndentDecisionPayload {
  decision_remarks?: string;
}

export interface MaterialIndentPurchasePayload {
  purchase_remarks?: string;
}

export interface MaterialIndentGateInPayload {
  vehicle_number?: string;
  driver_name?: string;
  driver_mobile?: string;
}

export interface MaterialIndentReceivePayload {
  // Omit to receive each item's full shortfall.
  items?: Array<{ id: number; received_quantity: string }>;
}

export interface MaterialIndentAttachmentUploadPayload {
  indent: number;
  file: File;
  doc_type?: MaterialIndentDocType;
  title?: string;
}

export interface MaterialIndentFilters {
  search?: string;
  status?: MaterialIndentStatus | 'ALL';
  department?: number | 'ALL';
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
}
