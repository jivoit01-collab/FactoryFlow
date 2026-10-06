/**
 * The Amounts board's payload, as `amounts_board/services.py` builds it.
 *
 * A section SAP could not answer is `null`, never omitted and never zero --
 * the tile then says so instead of reporting an empty plant. The backend's
 * contract test (`amounts_board/tests.py`) pins every key read here.
 */

export type StockCategoryKey = 'RM' | 'PM' | 'FG';

export interface AmountsPerson {
  id: number;
  name: string;
  email: string;
}

export interface AmountsGodown {
  code: string;
  name: string;
  /** Rupees at SAP stock value, stock on hand only. */
  value: number;
  items: number;
  /** Admin -> Warehouse Managers for this godown, by name. */
  managers: string[];
}

export interface AmountsCategory {
  key: StockCategoryKey;
  label: string;
  item_group: number;
  value: number;
  items: number;
  /** Largest first. A mixed godown appears under every category it holds. */
  godowns: AmountsGodown[];
}

export interface AmountsPlantStock {
  total: number;
  categories: AmountsCategory[];
}

export interface AmountsNonMoving {
  value: number;
  item_count: number;
  warehouses: string[];
  age_days: number;
  item_group: number;
}

export interface AmountsPlant {
  company_code: string;
  label: string;
  /** Out of Postgres, so present even when SAP is not answering. */
  owners: Record<StockCategoryKey, AmountsPerson | null>;
  stock: AmountsPlantStock | null;
  non_moving: AmountsNonMoving | null;
}

export interface AmountsOldestDebt {
  /** ISO date the oldest unpaid debit was posted, payments taken oldest-first. */
  date: string;
  card_code: string;
  card_name: string;
  balance: number;
}

export interface AmountsDebtorFigures {
  /** What outside customers in debit owe, from their ledger balance. */
  amount: number;
  customers: number;
  /** Group companies and own branches in debit -- shown, not counted. */
  group_amount: number;
  oldest: AmountsOldestDebt | null;
}

export interface AmountsDebtorCompany {
  key: 'JWPL' | 'MART' | 'BEVERAGES';
  label: string;
  company_code: string;
  figures: AmountsDebtorFigures | null;
}

export interface AmountsDebtorTotal extends AmountsDebtorFigures {
  oldest: (AmountsOldestDebt & { company: string }) | null;
  /** Companies that could not be read and are therefore NOT in this total. */
  missing: string[];
}

export interface AmountsDebtors {
  companies: AmountsDebtorCompany[];
  /** Null only when no company could be read at all. */
  total: AmountsDebtorTotal | null;
  /** A customer owing less than this does not set the oldest date. */
  oldest_floor: number;
}

export interface AmountsBoardMeta {
  generated_at: string;
  refresh_seconds: number;
  degraded: string[];
  withheld: string[];
  warnings: string[];
}

export interface AmountsBoardResponse {
  plants: AmountsPlant[];
  debtors: AmountsDebtors;
  meta: AmountsBoardMeta;
}

export interface AmountsGodownItem {
  item_code: string;
  item_name: string;
  uom: string;
  quantity: number;
  value: number;
}

export interface AmountsGodownItems {
  company_code: string;
  category: StockCategoryKey;
  warehouse: string;
  value: number;
  items: AmountsGodownItem[];
}

export interface AmountsOwnersPlant {
  company_code: string;
  label: string;
  owners: Record<StockCategoryKey, AmountsPerson | null>;
  /** Active staff of the plant's company. */
  candidates: AmountsPerson[];
}

export interface AmountsOwnersResponse {
  plants: AmountsOwnersPlant[];
}
