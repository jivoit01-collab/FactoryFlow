// Shared data + section types for the QC inspection-report printout. Both the
// QC `Inspection` and the GRPO `GRPOInspectionReport` are structurally
// assignable to `PrintableInspectionReport`, so a single print view/hook serves
// both modules. Keep these fields loosely typed (string | null | undefined) so
// the module-specific enums (final status, workflow status, …) stay assignable.

export interface PrintableInspectionParameter {
  id: number;
  parameter_name: string;
  standard_value: string;
  result_value: string;
  result_numeric: number | null;
  is_within_spec: boolean | null;
  remarks: string;
}

export interface PrintableInspectionAttachment {
  id: number;
  file: string;
  attachment_type: 'CERTIFICATE_OF_ANALYSIS' | 'CERTIFICATE_OF_QUANTITY';
}

export interface PrintableInspectionReport {
  report_no: string | null;
  /** Selected controlled-document ID for this inspection; shown in the print footer. */
  print_document_id?: string | null;
  workflow_status?: string | null;
  final_status?: string | null;
  effective_final_status?: string | null;
  description_of_material?: string | null;
  sap_code?: string | null;
  supplier_name?: string | null;
  unit_packing?: string | null;
  vehicle_no?: string | null;
  invoice_bill_no?: string | null;
  inspection_date?: string | null;
  material_type_name?: string | null;
  internal_lot_no?: string | null;
  supplier_batch_lot_no?: string | null;
  po_item_code?: string | null;
  entry_no?: string | null;
  remarks?: string | null;
  parameter_results: PrintableInspectionParameter[];
  attachments: PrintableInspectionAttachment[];
  // Present only for sources that support QC-uploaded attachments (QC module);
  // absent for GRPO reports.
  qc_attachments?: Array<{ id: number; file: string }>;
  qa_chemist_name?: string | null;
  qa_chemist_approved_at?: string | null;
  qa_chemist_remarks?: string | null;
  qam_name?: string | null;
  qam_approved_at?: string | null;
  qam_remarks?: string | null;
}

/** Which sections of the inspection printout to include. */
export type PrintSections = {
  /** Inspection info, QC parameters, and approval details. */
  report: boolean;
  /** Certificate of Analysis attachment(s). */
  coa: boolean;
  /** Certificate of Quantity attachment(s). */
  coq: boolean;
  /** QC-uploaded inspection attachment(s). */
  qcAttachments: boolean;
};
