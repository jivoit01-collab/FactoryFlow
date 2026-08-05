// Material indent types — a departmental requisition that, once approved, generates
// a gate pass and appears in the gate's Material Out screen.

export type MaterialIndentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ISSUED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PENDING_QUOTATION_SELECTION'
  | 'QUOTATION_SELECTED'
  | 'PURCHASED'
  | 'GATE_IN'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export type MaterialIndentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type MaterialIndentDocType = 'INVOICE' | 'BILL' | 'QUOTATION' | 'OTHER';

export interface MaterialIndentAttachment {
  id: number;
  indent: number;
  quotation: number | null;
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
  // Quotation round — purchaser collects company prices, approver picks one.
  quotations_submitted_by: number | null;
  quotations_submitted_by_name: string;
  quotations_submitted_at: string | null;
  selected_quotation: number | null;
  selected_company_name: string;
  quotation_selected_by: number | null;
  quotation_selected_by_name: string;
  quotation_selected_at: string | null;
  /** Why that company was chosen, or why the quotes were sent back. */
  quotation_remarks: string;
  items: MaterialIndentItem[];
  attachments: MaterialIndentAttachment[];
  quotations: MaterialIndentQuotation[];
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

/** One company's rate for one item of the indent. */
export interface MaterialIndentQuotationLine {
  id: number;
  item: number;
  item_particulars: string;
  item_unit: string;
  item_line_num: number;
  quantity: string;
  unit_price: string;
  amount: string;
  remarks: string;
}

/** One company's price offer for the purchase shortfall of an indent. */
export interface MaterialIndentQuotation {
  id: number;
  indent: number;
  indent_no: string;
  company_name: string;
  contact_person: string;
  contact_no: string;
  gstin: string;
  quotation_no: string;
  quotation_date: string | null;
  delivery_days: number | null;
  payment_terms: string;
  /** Freight, packing and the like — added on top of the line total. */
  other_charges: string;
  remarks: string;
  lines: MaterialIndentQuotationLine[];
  attachments: MaterialIndentAttachment[];
  lines_total: string;
  total_amount: string;
  is_selected: boolean;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialIndentQuotationLineInput {
  item: number;
  /** Omit to quote the item's full purchase shortfall. */
  quantity?: string;
  unit_price: string;
  remarks?: string;
}

export interface MaterialIndentQuotationPayload {
  indent: number;
  company_name: string;
  contact_person?: string;
  contact_no?: string;
  gstin?: string;
  quotation_no?: string;
  quotation_date?: string | null;
  delivery_days?: number | null;
  payment_terms?: string;
  other_charges?: string;
  remarks?: string;
  lines_input?: MaterialIndentQuotationLineInput[];
}

export type MaterialIndentQuotationUpdatePayload = Partial<
  Omit<MaterialIndentQuotationPayload, 'indent'>
>;

export interface MaterialIndentQuotationSelectPayload {
  quotation: number;
  quotation_remarks?: string;
}

export interface MaterialIndentQuotationReturnPayload {
  quotation_remarks: string;
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
  /** Set to hang the file off a quotation — the written quote behind a price. */
  quotation?: number;
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
