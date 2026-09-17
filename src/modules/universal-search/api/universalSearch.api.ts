import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/**
 * Universal Search API.
 *
 * One number goes in; every company the user belongs to answers separately,
 * because a SAP `DocNum` is unique only inside one company database — the same
 * 1001 can be a purchase order in Oil and nothing at all in Mart.
 *
 * The search itself is deliberately shallow: headers, app records, item and
 * batch hits. The lines behind a document are a second call, paid only for the
 * result the user actually opens.
 */

const EP = API_ENDPOINTS.UNIVERSAL_SEARCH;

/** The SAP document types a number is looked for in. */
export type SapDocumentKind =
  | 'AR_INVOICE'
  | 'AR_CREDIT_NOTE'
  | 'DELIVERY'
  | 'AR_RETURN'
  | 'SALES_ORDER'
  | 'PURCHASE_ORDER'
  | 'GRPO'
  | 'GOODS_RETURN'
  | 'AP_INVOICE'
  | 'AP_CREDIT_NOTE'
  | 'INVENTORY_TRANSFER'
  | 'TRANSFER_REQUEST'
  | 'GOODS_RECEIPT'
  | 'GOODS_ISSUE'
  | 'PRODUCTION_ORDER';

export interface SapDocumentHit {
  kind: SapDocumentKind;
  /** "A/R Invoice" — what SAP's own menu calls it. */
  label: string;
  obj_type: string;
  /** SAP's internal key. The detail call needs this, not doc_num. */
  doc_entry: number;
  doc_num: number;
  doc_date: string | null;
  card_code: string;
  card_name: string;
  /** "Customer" / "Vendor" / "" — what the partner on this type is called. */
  partner_label: string;
  doc_total: number | null;
  currency: string;
  status: string;
  is_cancelled: boolean;
  /** NumAtCard — the bilty or the customer's own reference. */
  ref_no: string;
}

export interface SapDocumentLine {
  line_num: number | null;
  item_code: string;
  description: string;
  quantity: number | null;
  unit: string;
  warehouse: string;
  price: number | null;
  line_total: number | null;
  open_quantity: number | null;
}

export interface SapDocumentDetail extends SapDocumentHit {
  lines: SapDocumentLine[];
}

/** A record in this app that carries the number. */
export interface AppRecordHit {
  kind: string;
  label: string;
  id: number;
  entry_no: string;
  summary: string;
  status: string;
  /** Which field held the number, so the row can say why it matched. */
  matched_on: string;
  /** Where to go to see it. A module with no per-record page links to its list. */
  route: string;
}

export interface ItemHit {
  item_code: string;
  item_name: string;
  item_group: string;
  uom: string;
  on_hand: number | null;
  committed: number | null;
  type: string;
  variety: string;
  pieces_per_box: number | null;
}

export interface BatchHit {
  item_code: string;
  batch_num: string;
  warehouse: string;
  quantity: number | null;
  item_name: string;
  expiry_date: string | null;
  received_date: string | null;
}

export interface CompanyResults {
  company_code: string;
  company_name: string;
  documents: SapDocumentHit[];
  app_records: AppRecordHit[];
  items: ItemHit[];
  batches: BatchHit[];
  total: number;
  /** Set when this company's SAP did not answer. The others still did. */
  error: string;
}

export interface UniversalSearchResult {
  term: string;
  companies: CompanyResults[];
  total: number;
}

export interface ItemStockRow {
  warehouse: string;
  on_hand: number | null;
  committed: number | null;
  on_order: number | null;
}

export const universalSearchApi = {
  async search(term: string, signal?: AbortSignal) {
    const response = await apiClient.get<UniversalSearchResult>(EP.SEARCH, {
      params: { q: term },
      signal,
    });
    return response.data;
  },

  async document(company: string, kind: SapDocumentKind, docEntry: number) {
    const response = await apiClient.get<{
      company_code: string;
      document: SapDocumentDetail;
    }>(EP.DOCUMENT, { params: { company, kind, doc_entry: docEntry } });
    return response.data.document;
  },

  async itemStock(company: string, itemCode: string) {
    const response = await apiClient.get<{
      company_code: string;
      item_code: string;
      warehouses: ItemStockRow[];
    }>(EP.ITEM_STOCK, { params: { company, item_code: itemCode } });
    return response.data.warehouses;
  },
};
