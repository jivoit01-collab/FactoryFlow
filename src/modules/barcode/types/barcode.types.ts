// ============================================================================
// Status Types
// ============================================================================

export type PalletStatus = 'ACTIVE' | 'CLEARED' | 'SPLIT' | 'VOID';
export type BoxStatus = 'ACTIVE' | 'PARTIAL' | 'DISMANTLED' | 'VOID';
export type LabelType = 'BOX' | 'PALLET' | 'BIN' | 'WAREHOUSE';
export type PrintType = 'ORIGINAL' | 'REPRINT';
export type PalletMovementType = 'CREATE' | 'MOVE' | 'TRANSFER' | 'DISMANTLE' | 'CLEAR' | 'SPLIT' | 'VOID';
export type BoxMovementType = 'CREATE' | 'MOVE' | 'TRANSFER' | 'PALLETIZE' | 'DEPALLETIZE' | 'VOID';

// ============================================================================
// Box
// ============================================================================

export interface Box {
  id: number;
  box_barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  pallet: number | null;
  pallet_code: string;
  current_warehouse: string;
  current_bin: string;
  status: BoxStatus;
  production_line: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface BoxTraceLoose {
  id: number;
  qty: string;
  reason: string;
  status: string;
  repacked_into_box_id: number | null;
  repacked_into_barcode: string;
  created_at: string;
}

export interface BoxTraceSource {
  id: number;
  qty: string;
  reason: string;
  source_box_id: number | null;
  source_box_barcode: string;
  created_at: string;
}

export interface BoxDetail extends Box {
  barcode_data: Record<string, unknown>;
  production_run: number | null;
  updated_at: string;
  movements: BoxMovement[];
  dismantled_into: BoxTraceLoose[];
  repacked_from: BoxTraceSource[];
}

export interface BoxMovement {
  id: number;
  movement_type: BoxMovementType;
  from_warehouse: string;
  to_warehouse: string;
  from_bin: string;
  to_bin: string;
  from_pallet: number | null;
  from_pallet_id: string;
  to_pallet: number | null;
  to_pallet_id: string;
  performed_by: number | null;
  performed_by_name: string;
  performed_at: string;
}

// ============================================================================
// Pallet
// ============================================================================

export interface Pallet {
  id: number;
  pallet_id: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  box_count: number;
  total_qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  current_warehouse: string;
  current_bin: string;
  status: PalletStatus;
  production_line: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface PalletDetail extends Pallet {
  barcode_data: Record<string, unknown>;
  production_run: number | null;
  updated_at: string;
  boxes: Box[];
  dismantled_boxes: Box[];
  movements: PalletMovement[];
}

export interface PalletMovement {
  id: number;
  movement_type: PalletMovementType;
  from_warehouse: string;
  to_warehouse: string;
  from_bin: string;
  to_bin: string;
  sap_transfer_doc_entry: number | null;
  quantity: string;
  performed_by: number | null;
  performed_by_name: string;
  performed_at: string;
  notes: string;
}

// ============================================================================
// Request Payloads
// ============================================================================

export interface GenerateBoxesPayload {
  item_code: string;
  item_name?: string;
  batch_number: string;
  qty: number;
  box_count: number;
  uom?: string;
  g_weight?: number;
  n_weight?: number;
  mfg_date: string;
  exp_date?: string;
  warehouse: string;
  production_line?: string;
  production_run_id?: number;
}

export interface CreatePalletPayload {
  box_ids: number[];
  warehouse: string;
  production_line?: string;
  production_run_id?: number;
}

export interface VoidPayload {
  reason?: string;
}

export interface PalletMovePayload {
  to_warehouse: string;
  notes?: string;
}

export interface PalletClearPayload {
  notes?: string;
}

export interface PalletSplitPayload {
  box_ids: number[];
  warehouse: string;
}

export interface PalletAddBoxesPayload {
  box_ids: number[];
}

export interface PalletRemoveBoxesPayload {
  box_ids: number[];
}

export interface BoxTransferPayload {
  box_ids: number[];
  to_warehouse: string;
  to_pallet_id?: number | null;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface BoxFilters {
  status?: string;
  item_code?: string;
  batch_number?: string;
  warehouse?: string;
  pallet_id?: string;
  unpalletized?: string;
  search?: string;
}

export interface PalletFilters {
  status?: string;
  item_code?: string;
  batch_number?: string;
  warehouse?: string;
  search?: string;
}

// ============================================================================
// Label & Print Types
// ============================================================================

export interface LabelData {
  type: 'BOX' | 'PALLET';
  id: number;
  barcode: string;
  qr_payload: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty?: string;
  box_count?: number;
  total_qty?: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
}

export interface PrintRequestPayload {
  print_type?: 'ORIGINAL' | 'REPRINT';
  reprint_reason?: string;
  printer_name?: string;
}

export interface BulkPrintItem {
  label_type: 'BOX' | 'PALLET';
  id: number;
  print_type?: 'ORIGINAL' | 'REPRINT';
  reprint_reason?: string;
}

export interface LabelPrintLog {
  id: number;
  label_type: LabelType;
  reference_id: string;
  reference_code: string;
  print_type: PrintType;
  reprint_reason: string;
  printed_by: number | null;
  printed_by_name: string;
  printed_at: string;
  printer_name: string;
}

export interface PrintHistoryFilters {
  label_type?: string;
  print_type?: string;
  search?: string;
}

// ============================================================================
// Dismantle, Loose Stock, Repack
// ============================================================================

export type DismantleReason = 'REPACK' | 'SAMPLE' | 'DAMAGED' | 'RETURN' | 'OTHER';
export type LooseStockStatus = 'ACTIVE' | 'REPACKED' | 'CONSUMED';

export interface LooseStock {
  id: number;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  original_qty: string;
  uom: string;
  source_box: number | null;
  source_box_barcode: string;
  source_pallet: number | null;
  source_pallet_id: string;
  reason: DismantleReason;
  reason_notes: string;
  current_warehouse: string;
  status: LooseStockStatus;
  repacked_into_box: number | null;
  repacked_into_barcode: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DismantlePalletPayload {
  box_ids?: number[] | null;
  reason: DismantleReason;
  reason_notes?: string;
}

export interface DismantleBoxPayload {
  qty?: number | null;
  reason: DismantleReason;
  reason_notes?: string;
}

export interface RepackPayload {
  loose_ids: number[];
  qty_per_loose?: Record<number, string>;
  warehouse: string;
}

export interface LooseStockFilters {
  status?: string;
  item_code?: string;
  warehouse?: string;
  reason?: string;
  search?: string;
}

// ============================================================================
// Scan
// ============================================================================

export type ScanType = 'RECEIVE' | 'PUTAWAY' | 'PICK' | 'COUNT' | 'TRANSFER' | 'SHIP' | 'RETURN' | 'LOOKUP';

export interface ScanRequestPayload {
  barcode_raw: string;
  scan_type?: ScanType;
  context_ref_type?: string;
  context_ref_id?: number | null;
  device_info?: string;
}

export interface ScanResponse {
  scan_id: number;
  result: 'SUCCESS' | 'NOT_FOUND' | 'DUPLICATE' | 'ERROR';
  entity_type: string;
  entity_id: string | null;
  entity_data: Record<string, unknown> | null;
  barcode_raw: string;
  barcode_parsed: Record<string, unknown>;
}

export interface LookupResponse {
  entity_type: string;
  entity_id: number | null;
  entity_data: Record<string, unknown> | null;
}
