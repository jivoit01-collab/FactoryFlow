import type { AttachmentStatus } from '@/modules/warehouse/grpo/types';

export type TransporterAPInvoiceStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'CANCELLED';

export interface OpenBilty {
  service_grpo_posting_id: number;
  dispatch_plan_id: number;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  dispatch_date: string | null;
  vehicle_no: string;
  driver_name: string;
  transporter_id: number | null;
  transporter_name: string;
  vendor_code: string;
  vendor_name: string;
  branch_id: number | null;
  bilty_no: string;
  bilty_date: string | null;
  grpo_doc_entry: number;
  grpo_doc_num: number | null;
  grpo_doc_total: string | null;
  posted_at: string | null;
  line_count: number;
}

export interface TransporterAPInvoicePreviewLine {
  service_grpo_posting_id: number;
  service_grpo_line_id: number | null;
  dispatch_plan_id: number;
  bilty_no: string;
  grpo_doc_entry: number;
  grpo_doc_num: number | null;
  grpo_line_num: number;
  service_description: string;
  line_total: string;
  tax_code: string;
  gl_account: string;
}

export interface TransporterAPInvoicePreview {
  vendor_code: string;
  vendor_name: string;
  branch_id: number;
  selected_grpo_total: string;
  tolerance: string;
  lines: TransporterAPInvoicePreviewLine[];
}

export interface TransporterAPInvoicePreviewRequest {
  service_grpo_posting_ids: number[];
  vendor_code?: string;
  branch_id?: number | null;
}

export interface TransporterAPInvoicePostRequest extends TransporterAPInvoicePreviewRequest {
  invoice_number: string;
  invoice_date?: string | null;
  invoice_amount: number;
  doc_date?: string | null;
  doc_due_date?: string | null;
  tax_date?: string | null;
  comments?: string;
  attachments?: File[];
}

export type TransporterAPInvoiceSubmitRequest = TransporterAPInvoicePostRequest;

export interface TransporterAPInvoiceSAPPostRequest {
  doc_date?: string | null;
  doc_due_date?: string | null;
  tax_date?: string | null;
  comments?: string;
}

export interface TransporterAPInvoiceLine {
  id: number;
  service_grpo_posting_id: number;
  dispatch_plan_id: number;
  base_entry: number;
  base_line: number;
  base_doc_num: number | null;
  bilty_no: string;
  service_description: string;
  line_total: string;
  tax_code: string;
  gl_account: string;
}

export interface TransporterAPInvoiceAttachment {
  id: number;
  file: string;
  original_filename: string;
  sap_attachment_status: AttachmentStatus;
  sap_absolute_entry: number | null;
  sap_error_message: string | null;
  uploaded_at: string;
  uploaded_by: number | null;
}

export interface TransporterAPInvoicePosting {
  id: number;
  company: number;
  vendor_code: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string | null;
  invoice_amount: string;
  selected_grpo_total: string | null;
  amount_difference: string | null;
  branch_id: number;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: string | null;
  status: TransporterAPInvoiceStatus;
  error_message: string | null;
  posted_at: string | null;
  posted_by: number | null;
  created_at: string;
  updated_at: string;
  comments: string;
  lines: TransporterAPInvoiceLine[];
  attachments: TransporterAPInvoiceAttachment[];
}

export interface TransporterAPInvoicePostResponse {
  success: boolean;
  transporter_ap_invoice_posting_id: number;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: string | null;
  message: string;
  posting: TransporterAPInvoicePosting;
}
