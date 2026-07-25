// ============================================================================
// The WMS dashboards were removed. Only the types still consumed elsewhere
// remain:
//   - Dropdown option types — barcode pallet pages + stock-level dashboard
//   - Transfer line/route types — reused by the production-movement dashboard
//     (which has its own data source; it only borrows these shapes)
// ============================================================================

// Dropdowns
export interface WarehouseOption {
  code: string;
  name: string;
}

export interface ItemGroupOption {
  code: number;
  name: string;
}

// Stock Transfers (type shapes reused by the production-movement dashboard)
export interface WMSTransferRoute {
  from_warehouse: string;
  to_warehouse: string;
  transfer_count: number;
  line_count: number;
  quantity: number;
}

export interface WMSTransferLine {
  doc_entry: number;
  doc_num: number;
  doc_date: string;
  header_from_warehouse: string;
  header_to_warehouse: string;
  comments: string;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  from_warehouse: string;
  to_warehouse: string;
}
