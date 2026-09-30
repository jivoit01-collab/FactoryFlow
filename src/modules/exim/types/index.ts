import type { LicenceKind, LineDirection } from '@/config/permissions/exim.permissions';

export type { LicenceKind, LineDirection };

export type LicenceStatus = 'OPEN' | 'CLOSED';

/** Decimals arrive as strings ("484.151"), exactly as stored. */
type Decimal = string;

export interface LicenceLine {
  id: number;
  direction: LineDirection;
  /** Bill of entry number (import) or shipping bill number (export). */
  document_no: string;
  document_date: string | null;
  value_usd: Decimal;
  quantity_mts: Decimal;
  /** The first-leg line this one answers, if named. */
  linked_line: number | null;
  linked_document_no: string | null;
  created_at: string;
  updated_at: string;
}

export interface Licence {
  id: number;
  kind: LicenceKind;
  kind_label: string;
  /** The licence number (Advance) or file number (DFIA). */
  number: string;
  status: LicenceStatus;
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: Decimal;
  cif_exchange_rate: Decimal;
  cif_value_usd: Decimal;
  fob_value_inr: Decimal;
  fob_exchange_rate: Decimal;
  fob_value_usd: Decimal;
  /** What the licence authorises for its first leg: EXIM's "Valid Import" / "Valid Export". */
  authorised_qty_mts: Decimal;
  total_import_mts: Decimal;
  total_export_mts: Decimal;
  /** What the first leg created: exports owed (Advance) or imports allowed (DFIA). */
  obligation_mts: Decimal;
  balance_mts: Decimal | null;
  /** The direction that creates the obligation. */
  first_leg: LineDirection;
  updated_at: string;
}

export interface LicenceDetail extends Licence {
  lines: LicenceLine[];
  created_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
  copied_from_exim: boolean;
}

export interface LicencePayload {
  status: LicenceStatus;
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: string;
  cif_exchange_rate: string;
  fob_value_inr: string;
  fob_exchange_rate: string;
  authorised_qty_mts: string;
}

export interface LicenceCreatePayload extends LicencePayload {
  kind: LicenceKind;
  number: string;
}

export interface LinePayload {
  document_no: string;
  document_date: string | null;
  value_usd: string;
  quantity_mts: string;
  linked_line: number | null;
}

export interface LineCreatePayload extends LinePayload {
  direction: LineDirection;
}

export interface CustomsRate {
  currency: string;
  import_rate: string | null;
  export_rate: string | null;
  notified_on: string | null;
  notification_no: string | null;
}

export interface CustomsRates {
  rates: CustomsRate[];
  notified_on: string | null;
  notification_no: string | null;
  fetched_at: string;
}

export * from './farm';
