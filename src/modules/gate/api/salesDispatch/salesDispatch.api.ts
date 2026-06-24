import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type SalesDispatchDocumentType = 'INVOICE' | 'STOCK_TRANSFER';

export type SalesDispatchStatus =
  | 'DOCKED'
  | 'PHOTO_ATTACHED'
  | 'READY_FOR_GATEPASS'
  | 'GATEPASS_PRINTED'
  | 'PRINT_COMMITTED'
  | 'PENDING_DOCKING'
  | 'DISPATCHED'
  | 'REJECTED'
  | 'CANCELLED';

export type SalesDispatchAttachmentType =
  | 'TRUCK_PHOTO'
  | 'GATEPASS'
  | 'INVOICE_COPY'
  | 'DELIVERY_NOTE'
  | 'BILTY'
  | 'EWAY_BILL'
  | 'OTHER';

export interface SalesDispatchDocument {
  document_type: SalesDispatchDocumentType;
  doc_entry: number;
  doc_num: string;
  doc_date?: string | null;
  doc_total?: string | number | null;
  branch_id?: number | null;
  branch_name?: string;
  card_code?: string;
  card_name?: string;
  ship_to_code?: string;
  ship_to_address?: string;
  place_of_supply?: string;
  bp_gstin?: string;
  eway_bill?: string;
  vehicle_no?: string;
  transporter_name?: string;
  bilty_no?: string;
  bilty_date?: string | null;
  from_warehouse?: string;
  to_warehouse?: string;
  warehouses?: string;
  item_summary?: string;
  base_refs?: string;
  total_quantity?: string | number | null;
  total_litres?: string | number | null;
  total_boxes?: string | number | null;
  total_weight?: string | number | null;
  line_count?: number;
  items?: unknown[];
  plan?: unknown | null;
}

export interface SalesDispatchGatepassReadiness {
  ready: boolean;
  missing: string[];
  has_truck_photo_geolocation: boolean;
  has_box_scans: boolean;
  /** True when an admin-approved scan-skip request satisfies the box-scan requirement. */
  scan_skip_approved?: boolean;
  /**
   * True when box scanning is optional for this entry's company (e.g. Jivo Beverages).
   * Operators can continue past the scan step and print the gatepass without scanning
   * any box and without an admin scan-skip approval.
   */
  box_scan_optional?: boolean;
  has_weighment: boolean;
  has_items: boolean;
  has_bilty_details?: boolean;
  has_bilty_attachment?: boolean;
  requires_eway_bill?: boolean;
  has_eway_bill?: boolean;
  has_eway_bill_attachment?: boolean;
}

export interface SalesDispatchItem {
  id: number;
  document?: number | null;
  document_sap_doc_num?: string;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  rate?: string | null;
  line_total?: string | null;
  gross_total?: string | null;
  warehouse_code?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  base_ref?: string;
  base_entry?: number | null;
  base_type?: number | null;
  tax_code?: string;
  total_litres?: string | null;
  total_boxes?: string | null;
  total_weight?: string | null;
}

export interface SalesDispatchGateOutDocument {
  id: number;
  dispatch_plan?: number | null;
  document_type: SalesDispatchDocumentType;
  sap_doc_entry: number;
  sap_doc_num: string;
  sap_doc_date?: string | null;
  sap_doc_total?: string | null;
  sap_branch_id?: number | null;
  sap_branch_name?: string;
  sap_reference?: string;
  sap_comments?: string;
  customer_code?: string;
  customer_name?: string;
  ship_to_code?: string;
  ship_to_address?: string;
  place_of_supply?: string;
  bp_gstin?: string;
  eway_bill?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  warehouses?: string;
  item_summary?: string;
  base_refs?: string;
  total_quantity?: string | null;
  total_litres?: string | null;
  total_boxes?: string | null;
  total_weight?: string | null;
  items?: SalesDispatchItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SalesDispatchAttachment {
  id: number;
  attachment_type: SalesDispatchAttachmentType;
  file: string;
  original_filename: string;
  latitude?: string | null;
  longitude?: string | null;
  notes?: string;
  uploaded_by?: number | null;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export interface SalesDispatchBoxScan {
  id: number;
  sales_dispatch: number;
  box?: number | null;
  scan_log?: number | null;
  box_barcode: string;
  barcode_raw: string;
  item_code?: string;
  item_name?: string;
  batch_number?: string;
  quantity?: string | null;
  uom?: string;
  net_weight?: string | null;
  gross_weight?: string | null;
  box_status?: string;
  warehouse_code?: string;
  pallet_code?: string;
  scanned_by?: number | null;
  scanned_by_name?: string;
  scanned_at: string;
  created_at?: string;
  updated_at?: string;
  duplicate?: boolean;
}

export interface SalesDispatchGateOut {
  id: number;
  entry_no: string;
  company: number;
  company_code?: string;
  company_name?: string;
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  dispatch_plan?: number | null;
  dispatch_date?: string | null;
  vehicle: number;
  transporter?: number | null;
  driver: number;
  documents?: SalesDispatchGateOutDocument[];
  document_count?: number;
  document_numbers?: string[];
  primary_document?:
    | SalesDispatchGateOutDocument
    | {
        document_type: SalesDispatchDocumentType;
        sap_doc_entry: number;
        sap_doc_num: string;
      };
  document_type: SalesDispatchDocumentType;
  sap_doc_entry: number;
  sap_doc_num: string;
  sap_doc_date?: string | null;
  sap_doc_total?: string | null;
  sap_branch_id?: number | null;
  sap_branch_name?: string;
  sap_reference?: string;
  sap_comments?: string;
  customer_code?: string;
  customer_name?: string;
  ship_to_code?: string;
  ship_to_address?: string;
  place_of_supply?: string;
  bp_gstin?: string;
  eway_bill?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  warehouses?: string;
  item_summary?: string;
  base_refs?: string;
  total_quantity?: string | null;
  total_litres?: string | null;
  total_boxes?: string | null;
  total_weight?: string | null;
  /** Operator-entered challan weight; comparison reference when SAP total_weight is missing/wrong. */
  challan_weight?: string | null;
  challan_weight_at?: string | null;
  challan_weight_by?: number | null;
  challan_weight_by_name?: string | null;
  vehicle_no: string;
  transporter_name?: string;
  transporter_gstin?: string;
  transporter_contact_person?: string;
  transporter_mobile_no?: string;
  driver_name: string;
  driver_mobile_no: string;
  driver_license_no?: string;
  driver_id_proof_type?: string;
  driver_id_proof_number?: string;
  bilty_no?: string;
  bilty_date?: string | null;
  freight?: string | null;
  total_freight?: string | null;
  dock_incharge?: string;
  docked_at?: string;
  gate_out_date?: string | null;
  out_time?: string | null;
  security_name?: string;
  truck_photo?: string | null;
  photo_latitude?: string | null;
  photo_longitude?: string | null;
  photo_uploaded_by?: number | null;
  photo_uploaded_at?: string | null;
  gatepass_no?: string | null;
  random_code?: string;
  qr_payload?: string;
  uom?: string;
  physical_quantity?: string | null;
  seal_number?: string;
  pgi_reference?: string;
  printed_by?: number | null;
  printed_at?: string | null;
  print_committed_by?: number | null;
  print_committed_at?: string | null;
  dispatched_by?: number | null;
  dispatched_at?: string | null;
  status: SalesDispatchStatus;
  remarks?: string;
  reject_reason?: string;
  rejected_by?: number | null;
  rejected_at?: string | null;
  cancel_reason?: string;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  gross_weight?: string | null;
  tare_weight?: string | null;
  net_weight?: string | null;
  weighbridge_slip_no?: string | null;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
  gatepass_readiness: SalesDispatchGatepassReadiness;
  items: SalesDispatchItem[];
  attachments: SalesDispatchAttachment[];
  box_scans?: SalesDispatchBoxScan[];
  additional_weights?: SalesDispatchAdditionalWeight[];
  gatepass_print_logs?: SalesDispatchGatepassPrintLog[];
  created_at: string;
  updated_at: string;
}

export interface SalesDispatchPendingBooking {
  row_type: 'PENDING_BOOKING';
  id: string;
  company?: number;
  company_code?: string;
  company_name?: string;
  entry_no?: string;
  dispatch_plan_ids: number[];
  document_count: number;
  document_numbers: string[];
  documents: SalesDispatchDocument[];
  document_type: 'INVOICE';
  sap_doc_entry: number;
  sap_doc_num: string;
  sap_doc_date?: string | null;
  sap_doc_total?: string | number | null;
  customer_code?: string;
  customer_name?: string;
  place_of_supply?: string;
  eway_bill?: string;
  item_summary?: string;
  total_litres?: string | number | null;
  total_weight?: string | number | null;
  vehicle?: number | null;
  vehicle_entry?: number | null;
  vehicle_entry_no?: string;
  vehicle_no: string;
  transporter?: number | null;
  transporter_name?: string;
  transporter_gstin?: string;
  transporter_contact_person?: string;
  transporter_mobile_no?: string;
  driver?: number | null;
  driver_name: string;
  driver_mobile_no?: string;
  driver_license_no?: string;
  driver_id_proof_type?: string;
  driver_id_proof_number?: string;
  bilty_no?: string;
  bilty_date?: string | null;
  freight?: string | number | null;
  total_freight?: string | number | null;
  dispatch_date?: string | null;
  gate_out_date?: string | null;
  out_time?: string | null;
  gatepass_no?: null;
  status: 'PENDING_DOCKING';
  created_at: string;
  updated_at: string;
}

export type SalesDispatchDashboardEntry = SalesDispatchGateOut | SalesDispatchPendingBooking;

export interface SalesDispatchGatepassPrintLog {
  id: number;
  sales_dispatch: number;
  gatepass_no: string;
  entry_status: string;
  copy_number: number;
  print_type: 'ORIGINAL' | 'REPRINT';
  reprint_reason?: string;
  printed_by?: number | null;
  printed_by_name?: string;
  printed_at: string;
  printer_name?: string;
  ip_address?: string | null;
  user_agent?: string;
}

export interface SalesDispatchLock {
  id: number;
  company: number;
  is_locked: boolean;
  reason: string;
  changed_by?: number | null;
  changed_by_name?: string;
  changed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesDispatchLockUpdateRequest {
  is_locked: boolean;
  reason?: string;
}

export interface SalesDispatchReportCounts {
  total: number;
  waiting_inside: number;
  missing_photo: number;
  gatepass_pending: number;
  printed_not_committed: number;
  ready_for_dispatch: number;
  dispatched: number;
  rejected_cancelled: number;
  truck_with_photo?: number;
}

export interface SalesDispatchReport {
  counts: SalesDispatchReportCounts;
  waiting_inside: SalesDispatchGateOut[];
  missing_photo: SalesDispatchGateOut[];
  gatepass_pending: SalesDispatchGateOut[];
  printed_not_committed?: SalesDispatchGateOut[];
  ready_for_dispatch: SalesDispatchGateOut[];
  dispatched?: SalesDispatchGateOut[];
  rejected_cancelled: SalesDispatchGateOut[];
  truck_vs_invoices_with_photo?: SalesDispatchGateOut[];
  truck_status_with_photo?: SalesDispatchGateOut[];
}

export interface SalesDispatchDocumentParams {
  document_type?: SalesDispatchDocumentType | 'ALL';
  search?: string;
  from_date?: string;
  to_date?: string;
  branch?: string;
  booking_status?: string;
  limit?: number;
}

export interface SalesDispatchListParams {
  status?: SalesDispatchStatus | string;
  document_type?: SalesDispatchDocumentType;
  from_date?: string;
  to_date?: string;
  search?: string;
  /** 1 = aggregate across every company the user belongs to (cross-company view). */
  all_companies?: number;
}

export interface SalesDispatchPendingBookingParams {
  from_date?: string;
  to_date?: string;
  search?: string;
  dispatch_plan_ids?: string;
  limit?: number;
  /** 1 = aggregate across every company the user belongs to (cross-company view). */
  all_companies?: number;
}

export type SalesDispatchReportParams = SalesDispatchListParams & {
  limit?: number;
};

export interface SalesDispatchCreateRequest {
  document_type?: SalesDispatchDocumentType;
  sap_doc_entry?: number;
  documents?: Array<{
    document_type: SalesDispatchDocumentType;
    sap_doc_entry: number;
    dispatch_plan_id?: number | null;
  }>;
  vehicle_id: number;
  driver_id: number;
  dispatch_plan_id?: number | null;
  security_name?: string;
  eway_bill?: string;
  bilty_no?: string;
  bilty_date?: string | null;
  freight?: string | number | null;
  total_freight?: string | number | null;
  dock_incharge?: string;
  remarks?: string;
}

export type SalesDispatchUpdateRequest = Partial<
  Pick<
    SalesDispatchCreateRequest,
    | 'security_name'
    | 'eway_bill'
    | 'bilty_no'
    | 'bilty_date'
    | 'freight'
    | 'total_freight'
    | 'dock_incharge'
    | 'remarks'
  >
>;

export interface SalesDispatchAttachmentUploadRequest {
  attachment_type: SalesDispatchAttachmentType;
  file: File;
  latitude?: number | string | null;
  longitude?: number | string | null;
  notes?: string;
}

export interface SalesDispatchBoxScanRequest {
  barcode_raw: string;
}

/** Submit a batch of locally-scanned barcodes in one request. */
export interface SalesDispatchBoxScanBatchRequest {
  barcodes: string[];
}

export type SalesDispatchBoxScanFailureReason =
  | 'EMPTY'
  | 'UNKNOWN_BARCODE'
  | 'NOT_A_BOX'
  | 'INVALID_STATUS'
  | 'DUPLICATE';

/** A barcode the backend could not save, with the reason it was rejected. */
export interface SalesDispatchBoxScanFailure {
  barcode_raw: string;
  reason: SalesDispatchBoxScanFailureReason;
  detail: string;
}

/** Partial-success result of a batch box-scan submit. */
export interface SalesDispatchBoxScanBatchResult {
  saved: SalesDispatchBoxScan[];
  saved_count: number;
  failed: SalesDispatchBoxScanFailure[];
  failed_count: number;
  total: number;
}

/** A box already scanned in the old barcode-module dispatch flow for this SAP bill. */
export interface BarcodeDispatchScan {
  id: number;
  barcode: string;
  entity_type: string;
  item_code?: string;
  item_name?: string;
  batch_number?: string;
  quantity?: string | null;
  uom?: string;
  scan_status?: string;
  box_status?: string;
  scanned_at: string;
}

export interface BarcodeDispatchSession {
  session_id: number;
  bill_number: string;
  sap_doc_num: string;
  status: string;
  customer_code?: string;
  customer_name?: string;
  total_scanned_qty?: string | null;
  scanned_at: string;
  box_count: number;
  boxes: BarcodeDispatchScan[];
}

export interface BarcodeDispatchScansResult {
  matched: boolean;
  session_count: number;
  box_count: number;
  sessions: BarcodeDispatchSession[];
}

export interface BarcodeDispatchImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export interface SalesDispatchGatepassPrintRequest {
  uom?: string;
  physical_quantity?: string | number | null;
  seal_number?: string;
  pgi_reference?: string;
  eway_bill?: string;
  printer_name?: string;
}

export interface SalesDispatchGatepassReprintRequest {
  reprint_reason: string;
  printer_name?: string;
}

export interface SalesDispatchReasonRequest {
  reason: string;
}

export interface SalesDispatchChallanWeightRequest {
  /** Pass null to clear the operator value and fall back to the SAP document weight. */
  challan_weight: number | null;
}

/** A named weight of non-goods items (packaging, dunnage, securing material). */
export interface SalesDispatchAdditionalWeight {
  id: number;
  sales_dispatch: number;
  name: string;
  weight: string;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface SalesDispatchAdditionalWeightsRequest {
  items: { name: string; weight: number }[];
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const queryParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  return queryParams.toString();
}

export const salesDispatchApi = {
  async documents(params?: SalesDispatchDocumentParams): Promise<SalesDispatchDocument[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_DOCUMENTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_DOCUMENTS;
    const response = await apiClient.get<SalesDispatchDocument[]>(url);
    return response.data;
  },

  async document(
    documentType: SalesDispatchDocumentType,
    docEntry: number,
  ): Promise<SalesDispatchDocument> {
    const response = await apiClient.get<SalesDispatchDocument>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_DOCUMENT_BY_DOC_ENTRY(documentType, docEntry),
    );
    return response.data;
  },

  async list(params?: SalesDispatchListParams): Promise<SalesDispatchGateOut[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.SALES_DISPATCHES}?${query}`
      : API_ENDPOINTS.GATE_CORE.SALES_DISPATCHES;
    const response = await apiClient.get<SalesDispatchGateOut[]>(url);
    return response.data;
  },

  async pendingBookings(
    params?: SalesDispatchPendingBookingParams,
  ): Promise<SalesDispatchPendingBooking[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_PENDING_BOOKINGS}?${query}`
      : API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_PENDING_BOOKINGS;
    const response = await apiClient.get<SalesDispatchPendingBooking[]>(url);
    return response.data;
  },

  async getLock(): Promise<SalesDispatchLock> {
    const response = await apiClient.get<SalesDispatchLock>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_LOCK,
    );
    return response.data;
  },

  async updateLock(data: SalesDispatchLockUpdateRequest): Promise<SalesDispatchLock> {
    const response = await apiClient.patch<SalesDispatchLock>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_LOCK,
      data,
    );
    return response.data;
  },

  async reports(params?: SalesDispatchReportParams): Promise<SalesDispatchReport> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_REPORTS}?${query}`
      : API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_REPORTS;
    const response = await apiClient.get<SalesDispatchReport>(url);
    return response.data;
  },

  async get(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.get<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BY_ID(id),
    );
    return response.data;
  },

  async getByVehicleEntry(vehicleEntryId: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.get<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BY_VEHICLE_ENTRY(vehicleEntryId),
    );
    return response.data;
  },

  async create(data: SalesDispatchCreateRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCHES,
      data,
    );
    return response.data;
  },

  async update(id: number, data: SalesDispatchUpdateRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.patch<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BY_ID(id),
      data,
    );
    return response.data;
  },

  async attachments(id: number): Promise<SalesDispatchAttachment[]> {
    const response = await apiClient.get<SalesDispatchAttachment[]>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_ATTACHMENTS(id),
    );
    return response.data;
  },

  async uploadAttachment(
    id: number,
    data: SalesDispatchAttachmentUploadRequest,
  ): Promise<SalesDispatchAttachment> {
    const formData = new FormData();
    formData.append('attachment_type', data.attachment_type);
    formData.append('file', data.file);
    if (data.latitude !== undefined && data.latitude !== null) {
      formData.append('latitude', String(data.latitude));
    }
    if (data.longitude !== undefined && data.longitude !== null) {
      formData.append('longitude', String(data.longitude));
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await apiClient.post<SalesDispatchAttachment>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_ATTACHMENTS(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async boxScans(id: number): Promise<SalesDispatchBoxScan[]> {
    const response = await apiClient.get<SalesDispatchBoxScan[]>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BOX_SCANS(id),
    );
    return response.data;
  },

  async scanBox(id: number, data: SalesDispatchBoxScanRequest): Promise<SalesDispatchBoxScan> {
    const response = await apiClient.post<SalesDispatchBoxScan>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BOX_SCANS(id),
      data,
    );
    return response.data;
  },

  async batchScanBoxes(
    id: number,
    data: SalesDispatchBoxScanBatchRequest,
  ): Promise<SalesDispatchBoxScanBatchResult> {
    const response = await apiClient.post<SalesDispatchBoxScanBatchResult>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BOX_SCANS_BATCH(id),
      data,
    );
    return response.data;
  },

  async removeBoxScan(id: number, scanId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BOX_SCAN(id, scanId));
  },

  async barcodeScans(id: number): Promise<BarcodeDispatchScansResult> {
    const response = await apiClient.get<BarcodeDispatchScansResult>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BARCODE_SCANS(id),
    );
    return response.data;
  },

  async importBarcodeScans(
    id: number,
    data: { session_ids: number[] },
  ): Promise<BarcodeDispatchImportResult> {
    const response = await apiClient.post<BarcodeDispatchImportResult>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_BARCODE_SCANS_IMPORT(id),
      data,
    );
    return response.data;
  },

  async previewGatepass(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_GATEPASS_PREVIEW(id),
    );
    return response.data;
  },

  async printGatepass(
    id: number,
    data: SalesDispatchGatepassPrintRequest,
  ): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_GATEPASS_PRINT(id),
      data,
    );
    return response.data;
  },

  async reprintGatepass(
    id: number,
    data: SalesDispatchGatepassReprintRequest,
  ): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_GATEPASS_REPRINT(id),
      data,
    );
    return response.data;
  },

  async gatepassPrintHistory(id: number): Promise<SalesDispatchGatepassPrintLog[]> {
    const response = await apiClient.get<SalesDispatchGatepassPrintLog[]>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_GATEPASS_PRINTS(id),
    );
    return response.data;
  },

  async setChallanWeight(
    id: number,
    data: SalesDispatchChallanWeightRequest,
  ): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_CHALLAN_WEIGHT(id),
      data,
    );
    return response.data;
  },

  async setAdditionalWeights(
    id: number,
    data: SalesDispatchAdditionalWeightsRequest,
  ): Promise<SalesDispatchAdditionalWeight[]> {
    const response = await apiClient.put<SalesDispatchAdditionalWeight[]>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_ADDITIONAL_WEIGHTS(id),
      data,
    );
    return response.data;
  },

  async commitPrint(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_COMMIT_PRINT(id),
    );
    return response.data;
  },

  async addDocument(id: number, dispatchPlanId: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_ADD_DOCUMENT(id),
      { dispatch_plan_id: dispatchPlanId },
    );
    return response.data;
  },

  async markDispatched(id: number): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_MARK_DISPATCHED(id),
    );
    return response.data;
  },

  async reject(id: number, data: SalesDispatchReasonRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_REJECT(id),
      data,
    );
    return response.data;
  },

  async cancel(id: number, data: SalesDispatchReasonRequest): Promise<SalesDispatchGateOut> {
    const response = await apiClient.post<SalesDispatchGateOut>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_CANCEL(id),
      data,
    );
    return response.data;
  },
};
