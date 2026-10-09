/**
 * The shapes `production_dispatch` sends: see `production_dispatch/services.py`.
 */

export type Movement = 'FAST' | 'SLOW';

export interface ReportSettings {
  /** PALLET = litres / this. */
  pallet_litres: number;
  /** TON = litres x this / 1000 -- net oil. */
  oil_density: number;
  /** FAST when a month's production clears in this many days or fewer. */
  fast_days: number;
  /** Days in "a month" for the monthly averages. */
  month_days: number;
  /** FAST / SLOW is judged over this many days ending on the To date. */
  movement_window_days: number;
}

export interface ReportItem {
  item_code: string;
  item_name: string;
  /** SAP's U_Sub_Group (CANOLA, OLIVE...): the workbook's VARIETY. */
  variety: string | null;
  /** SAP's U_Variety (COLD PRESS, POMACE...): the workbook's SUBGROUP. */
  subgroup: string | null;
  sku: string | null;
  /** null: not set in SAP. */
  packing_type: string | null;
  pieces_per_box: number;
  litres_per_unit: number;
  /** Over the movement window, group companies left out. */
  window_production: number;
  window_dispatch: number;
  movement: Movement;
  days_to_dispatch: number | null;
}

/** One item on one day, in SAP's own units (pieces, tins, sets). */
export interface ReportDay {
  date: string;
  item_code: string;
  production: number;
  /** To customers outside the group: the dispatch every figure counts. */
  dispatch: number;
  /** To Jivo Mart and the other group companies: not counted, only reported. */
  group_dispatch: number;
}

export interface ProductionDispatchReport {
  company: { code: string; name: string };
  from: string;
  to: string;
  settings: ReportSettings;
  movement_window: { from: string; to: string };
  items: ReportItem[];
  days: ReportDay[];
  meta: { read_at: string };
}

export type DocumentKind = 'PRODUCTION' | 'DISPATCH';

export interface DocumentLine {
  kind: DocumentKind;
  doc_type: string;
  date: string;
  doc_num: number;
  card_code: string | null;
  card_name: string | null;
  /** A sale to a group company: listed, never counted. */
  is_group: boolean;
  warehouse: string;
  item_code: string;
  item_name: string;
  quantity: number;
}

export interface DocumentsResponse {
  from: string;
  to: string;
  item_code: string | null;
  lines: DocumentLine[];
}
