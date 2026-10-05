import { apiClient } from '@/core/api';

/**
 * The outstanding reports, which came across from EXIM: party balances, open
 * A/P and A/R bills, open GRPOs and customer aging. Shapes as
 * `factory_app/sap_finance/outstanding.py` sends them; every figure a number,
 * every date `YYYY-MM-DD`.
 *
 * Each report is one read of SAP per company, which the server keeps for two
 * minutes so paging and filtering do not read SAP again; `refresh` reads it
 * afresh. The reads follow the company chosen in the app (its `Company-Code`
 * header).
 */

/** The module's own endpoints: nothing outside SAP Finance calls them. */
export const OUTSTANDING_ENDPOINTS = {
  PARTIES: '/sap-finance/outstanding/parties/',
  BILLS: '/sap-finance/outstanding/bills/',
  GRPOS: '/sap-finance/outstanding/grpos/',
  AGING: '/sap-finance/outstanding/aging/',
} as const;

/**
 * Reads of SAP: a slow one gets two minutes rather than the client's thirty
 * seconds, and a failure is shown on the page (SAP down is a 503 with a
 * reason), not in a toast.
 */
const SAP_READ = { suppressErrorToast: true, timeout: 120_000 };

export type PartySide = 'vendor' | 'customer';

/** Days past the due date (or the bill date, for aging by bill date). */
export type BucketKey = 'not_due' | 'd0_30' | 'd31_60' | 'd61_90' | 'd91_180' | 'd180';

/**
 * A bill's or a GRPO's transport fields. SAP user fields, which a company's
 * database may not carry: a key is absent when the company has no such field.
 */
export interface TransportFields {
  bilty_number?: string;
  bilty_date?: string | null;
  transporter?: string;
  vehicle_number?: string;
  lr_number?: string;
  received_date?: string | null;
}

// ---------------------------------------------------------------------------
// Party balances
// ---------------------------------------------------------------------------

export interface PartyDocument {
  number: string;
  date: string | null;
  total: number;
}

export interface PartyBalance {
  card_code: string;
  card_name: string;
  group: string;
  sales_employee: string;
  /** SAP's OCRD.Balance: positive is owed to us (Dr), negative owed by us (Cr). */
  balance: number;
  currency: string;
  last_bill: PartyDocument | null;
  last_payment: PartyDocument | null;
  days_since_bill: number | null;
  days_since_payment: number | null;
}

export interface PartyOutstanding {
  side: PartySide;
  oil_suppliers: boolean;
  read_at: string;
  rows: PartyBalance[];
  totals: {
    parties: number;
    /** Every positive balance: owed to us. */
    debit: number;
    /** Every negative balance (a negative number): owed by us. */
    credit: number;
    net: number;
  };
  groups: string[];
}

// ---------------------------------------------------------------------------
// Open bills
// ---------------------------------------------------------------------------

export interface OpenBill extends TransportFields {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  due_date: string | null;
  /** The vendor's invoice number, or the customer's reference (NumAtCard). */
  party_ref: string;
  card_code: string;
  card_name: string;
  group: string;
  sales_employee: string;
  currency: string;
  total: number;
  paid: number;
  due: number;
  total_fc: number;
  paid_fc: number;
  remarks: string;
  /** Days past the due date; negative is not due yet. */
  overdue_days: number | null;
  bucket: BucketKey;
}

export interface BillBucket {
  key: BucketKey;
  label: string;
  count: number;
  due: number;
}

export interface TopParty {
  card_code: string;
  card_name: string;
  count: number;
  due: number;
  oldest_due_date: string | null;
}

export type BillSort = 'due_date' | 'doc_date' | 'due' | 'overdue_days' | 'party';

export interface OpenBillFilters {
  side: PartySide;
  q?: string;
  card_code?: string;
  group?: string;
  bucket?: BucketKey | '';
  /** Vendors only: those with a purchase order for a raw-material oil. */
  oil_suppliers?: boolean;
  sort?: BillSort;
  desc?: boolean;
  page?: number;
  page_size?: number;
}

export interface OpenBills {
  side: PartySide;
  read_at: string;
  /** Over every bill the filters leave, not only this page. */
  totals: {
    count: number;
    total: number;
    paid: number;
    due: number;
    overdue: number;
    parties: number;
  };
  buckets: BillBucket[];
  top_parties: TopParty[];
  groups: string[];
  count: number;
  page: number;
  page_size: number;
  pages: number;
  results: OpenBill[];
}

// ---------------------------------------------------------------------------
// Open GRPOs
// ---------------------------------------------------------------------------

export interface OpenGrpo extends TransportFields {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  party_ref: string;
  card_code: string;
  card_name: string;
  total: number;
  currency: string;
  /** The SAP user who entered it. */
  user: string;
  warehouses: string[];
  lines: number;
  /** Has a raw-material (`RM…`) line. */
  raw_material: boolean;
  days_open: number | null;
}

export interface OpenGrpos {
  read_at: string;
  rows: OpenGrpo[];
  totals: {
    count: number;
    value: number;
    vendors: number;
    average_days: number | null;
    oldest_days: number | null;
  };
  warehouses: string[];
}

// ---------------------------------------------------------------------------
// Customer aging
// ---------------------------------------------------------------------------

export type AgingBasis = 'due' | 'bill';

export type BucketAmounts = Record<BucketKey, number>;

export interface AgingCustomer extends BucketAmounts {
  card_code: string;
  card_name: string;
  group: string;
  sales_employee: string;
  documents: number;
  total: number;
}

export interface AgingDocument {
  kind: 'INVOICE' | 'CREDIT_NOTE';
  doc_num: string;
  doc_date: string | null;
  due_date: string | null;
  card_code: string;
  card_name: string;
  sales_employee: string;
  group: string;
  /** What is still open; a credit note's is negative. */
  due: number;
  days: number | null;
  bucket: BucketKey;
}

export interface AgingFilters {
  basis: AgingBasis;
  q?: string;
  group?: string;
  sales_employee?: string;
  /** One customer: the response then lists its open documents. */
  card_code?: string;
}

export interface CustomerAging {
  basis: AgingBasis;
  read_at: string;
  buckets: { key: BucketKey; label: string }[];
  rows: AgingCustomer[];
  totals: { customers: number; total: number } & BucketAmounts;
  groups: string[];
  sales_employees: string[];
  documents: AgingDocument[] | null;
}

// ---------------------------------------------------------------------------

/** Query parameters without the blanks, flags as `1`. */
function params(values: Record<string, string | number | boolean | undefined>) {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value === true ? 1 : value;
  }
  return out;
}

export const outstandingApi = {
  parties: async (side: PartySide, oilSuppliers = false, refresh = false) => {
    const { data } = await apiClient.get<PartyOutstanding>(OUTSTANDING_ENDPOINTS.PARTIES, {
      ...SAP_READ,
      params: params({ side, oil_suppliers: side === 'vendor' && oilSuppliers, refresh }),
    });
    return data;
  },

  bills: async (filters: OpenBillFilters, refresh = false) => {
    const { oil_suppliers, ...rest } = filters;
    const { data } = await apiClient.get<OpenBills>(OUTSTANDING_ENDPOINTS.BILLS, {
      ...SAP_READ,
      params: params({
        ...rest,
        oil_suppliers: filters.side === 'vendor' && oil_suppliers,
        refresh,
      }),
    });
    return data;
  },

  grpos: async (rawMaterial = false, refresh = false) => {
    const { data } = await apiClient.get<OpenGrpos>(OUTSTANDING_ENDPOINTS.GRPOS, {
      ...SAP_READ,
      params: params({ raw_material: rawMaterial, refresh }),
    });
    return data;
  },

  aging: async (filters: AgingFilters, refresh = false) => {
    const { data } = await apiClient.get<CustomerAging>(OUTSTANDING_ENDPOINTS.AGING, {
      ...SAP_READ,
      params: params({ ...filters, refresh }),
    });
    return data;
  },
};
