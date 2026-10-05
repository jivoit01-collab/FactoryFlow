/**
 * The planning team's monthly plan workbook, as uploaded
 * (`/planning-purchase/monthly-plans/`).
 *
 * Not SAP's production plan: the team's own Excel, every SKU's month split into
 * a COMMODITY or a PREMIUM block week by week, plus e-commerce. Figures are in
 * litres. DRF model serializers send them as decimal STRINGS ("12500.00").
 */

type Decimal = string;

/** One uploaded workbook: one version of one month's plan. */
export interface MonthlyPlanUpload {
  id: number;
  /** First day of the planned month, `YYYY-MM-DD`. */
  month: string;
  version: number;
  /** The sheet's own banner, e.g. "PRODUCTION PLANING MONTH OF SEP 2026". */
  title: string;
  source_file: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes: string;
  row_count: number;
  commodity_total: Decimal;
  premium_total: Decimal;
  ecom_total: Decimal;
  grand_total: Decimal;
  /** The highest version of its month: the live plan. */
  is_latest: boolean;
}

/** One SKU line. The monthly figure sits in COMMODITY or PREMIUM, chosen by the SKU's head. */
export interface MonthlyPlanRow {
  id: number;
  code: string;
  brand: string;
  head: string;
  category: string;
  sub_category: string;
  sku: string;
  per_ltrs: Decimal | null;
  ltrs_per_box: Decimal | null;
  case_pack: Decimal | null;
  commodity_monthly: Decimal;
  commodity_w1: Decimal;
  commodity_w2: Decimal;
  commodity_w3: Decimal;
  commodity_w4: Decimal;
  premium_monthly: Decimal;
  premium_w1: Decimal;
  premium_w2: Decimal;
  premium_w3: Decimal;
  premium_w4: Decimal;
  ecom_planning: Decimal;
  /** Commodity + premium + e-commerce, recomputed from the weeks. */
  total_planning: Decimal;
  source_row: number | null;
}

export interface MonthlyPlanDetail extends MonthlyPlanUpload {
  rows: MonthlyPlanRow[];
}

export interface MonthlyPlanList {
  /** Newest month first, then highest version first. */
  uploads: MonthlyPlanUpload[];
}

export interface MonthlyPlanUploadPayload {
  file: File;
  /** `YYYY-MM-DD`: overrides the month the sheet names. */
  month?: string;
  notes?: string;
}

export interface MonthlyPlanUploadResult {
  upload: MonthlyPlanDetail;
  /** Rows the parser read with a doubt: a repeated code, a non-number, both blocks filled. */
  warnings: string[];
  /** Figures where the sheet's own monthly or total disagrees with its weeks. */
  mismatches: string[];
  /** The version this one replaced as live, if the month had one. */
  replaced_version: number | null;
}
