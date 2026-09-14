/**
 * The Customer Returns dashboard payload, as `goods_return/analytics.py` builds it.
 *
 * Every figure arrives from one endpoint rather than a call per panel: the panels
 * are cuts of the same few hundred rows, and separate requests would let the SKU
 * table and the condition ring disagree about which returns they had.
 */

/** Stored on the line, exact, mutually exclusive. */
export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'LEAKED' | 'EXPIRED' | 'OTHER';

/**
 * Inferred from the line's free text by keyword, NOT stored.
 *
 * Still needed after `LEAKED` became a real condition: every return booked before
 * that choice existed is `DAMAGED` with the word only in its typed reason, and no
 * migration can safely reclassify one clerk's sentence. `UNSPECIFIED` (nobody
 * wrote anything) is kept apart from `OTHER` (text that matched no bucket) because
 * only the first is a gap the returns desk can close.
 */
export type ReturnReason =
  | 'LEAKAGE'
  | 'BREAKAGE'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'QUALITY'
  | 'WRONG_SHORT'
  | 'UNSOLD'
  | 'OTHER'
  | 'UNSPECIFIED';

export type ReturnStatus =
  | 'DRAFT'
  | 'AWAITING_ARRIVAL'
  | 'ARRIVED'
  | 'RECEIVED'
  | 'PARTIALLY_POSTED'
  | 'POSTED'
  | 'CANCELLED';

export interface ReturnsWindow {
  from_date: string;
  to_date: string;
  days: number;
  /** `day` under ~3 months, `month` beyond it — a year of daily bars is unreadable. */
  granularity: 'day' | 'month';
}

export interface ReturnsTotals {
  returns: number;
  /** Physically in: gated in, or past it. */
  arrived: number;
  /** Booked, truck still on the road. */
  awaiting_arrival: number;
  posted: number;
  /** Counted but excluded from every other figure — a cancelled return never came back. */
  cancelled: number;
  pending_approval: number;
  lines: number;
  quantity: number;
  /** Only invoice-basis lines carry a price, so this is never the full picture. */
  value: number;
  customers: number;
  skus: number;
  /** Everything that came back as anything other than GOOD. */
  damaged_quantity: number;
  damaged_share: number;
  /**
   * Leaked, counted once whether it was keyed on the condition or only written
   * into the reason — the figure to quote, because a window spanning the day
   * `LEAKED` was added holds both kinds and either half alone under-counts.
   */
  leaked_quantity: number;
  leaked_share: number;
  /** Keyed `LEAKED` on the line. */
  leaked_recorded: number;
  /** Read out of the typed reason — should fall to zero as old returns age out. */
  leaked_inferred: number;
}

export interface ReturnsStatusRow {
  status: ReturnStatus;
  label: string;
  returns: number;
  share: number;
}

export interface ReturnsBasisRow {
  basis: 'INVOICE' | 'DEBIT_NOTE' | 'LETTER_PAD';
  returns: number;
  share: number;
}

export interface ReturnsConditionRow {
  condition: ReturnCondition;
  label: string;
  lines: number;
  quantity: number;
  value: number;
  share: number;
}

export interface ReturnsReasonRow {
  reason: ReturnReason;
  label: string;
  lines: number;
  quantity: number;
  value: number;
  share: number;
}

export interface ReturnsTrendPoint {
  /** `YYYY-MM-DD` on a daily window, `YYYY-MM` on a monthly one. */
  bucket: string;
  returns: number;
  quantity: number;
  damaged_quantity: number;
}

export interface ReturnsSkuRow {
  item_code: string;
  item_name: string;
  uom: string;
  lines: number;
  returns: number;
  customers: number;
  quantity: number;
  value: number;
  share: number;
  conditions: Record<ReturnCondition, number>;
  /** Only the buckets this SKU actually has — zero buckets are omitted. */
  reasons: Partial<Record<ReturnReason, number>>;
}

export interface ReturnsCustomerRow {
  customer_code: string;
  customer_name: string;
  returns: number;
  lines: number;
  skus: number;
  quantity: number;
  value: number;
  share: number;
  conditions: Record<ReturnCondition, number>;
}

export interface ReturnsRecentRow {
  id: number;
  entry_no: string;
  status: ReturnStatus;
  status_label: string;
  basis: 'INVOICE' | 'DEBIT_NOTE' | 'LETTER_PAD';
  customer_code: string;
  customer_name: string;
  /** The day the board counts this return on — see `has_arrived` for which day that is. */
  arrived_on: string | null;
  /** True when `arrived_on` is the gate-in; false when it is only the booking date. */
  has_arrived: boolean;
  lines: number;
  quantity: number;
}

export interface CustomerReturnsDashboard {
  window: ReturnsWindow;
  totals: ReturnsTotals;
  by_status: ReturnsStatusRow[];
  by_basis: ReturnsBasisRow[];
  by_condition: ReturnsConditionRow[];
  /** Every bucket, including the zero ones, in a fixed order. */
  by_reason: ReturnsReasonRow[];
  trend: ReturnsTrendPoint[];
  top_skus: ReturnsSkuRow[];
  top_customers: ReturnsCustomerRow[];
  recent_returns: ReturnsRecentRow[];
}

export interface CustomerReturnsFilters {
  from: string;
  to: string;
  /** Every company the reader belongs to, rather than just the active one. */
  allCompanies: boolean;
}
