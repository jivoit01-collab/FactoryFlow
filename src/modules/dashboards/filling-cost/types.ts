/** Cases, bottles and money for a span, as the board reports them. */
export interface FillingCostFigures {
  cases: string;
  bottles: string;
  total: string;
  per_case: string | null;
  /** Over the cases that have a bottle count; null when none do */
  per_bottle: string | null;
}

export interface FillingCostBoardDay extends FillingCostFigures {
  /** YYYY-MM-DD */
  date: string;
  /** 'shift' = its Day and Night sheets added up; 'day' = a whole-day sheet */
  kept_by: 'shift' | 'day';
}

export interface FillingCostHeadRow {
  head: string;
  amount: string;
  /** Percent of the span's total */
  share: string | null;
  per_case: string | null;
  per_bottle: string | null;
}

/** A SKU a day or shift filled, from its production runs. */
export interface FillingCostSku {
  product: string;
  /** '1000 ML' — the bottle, as the sheet writes it; the product when unknown */
  sku: string;
  litres_per_piece: string | null;
  /** Bottles a case (the box size); null when the run never had it */
  pieces_per_case: number | null;
  cases: string;
}

export interface FillingCostBoardShift extends FillingCostFigures {
  shift: 'DAY' | 'NIGHT';
  label: string;
  /** The shift's own heads, in the order its sheet has them */
  heads: FillingCostHeadRow[];
  skus: FillingCostSku[];
}

export interface FillingCostBoardDayDetail extends FillingCostBoardDay {
  /** Biggest first */
  heads: FillingCostHeadRow[];
  /** In the order the sheet has them */
  sheet_heads: FillingCostHeadRow[];
  skus: FillingCostSku[];
  shifts: FillingCostBoardShift[];
}

export interface FillingCostBoard {
  /** YYYY-MM */
  month: string;
  days_in_month: number;
  days_entered: number;
  totals: FillingCostFigures;
  previous: { month: string; per_case: string | null; days_entered: number };
  heads: FillingCostHeadRow[];
  days: FillingCostBoardDay[];
  /** The selected day in full; null when nobody entered it */
  day: FillingCostBoardDayDetail | null;
  /** YYYY-MM-DD — yesterday unless another day was asked for */
  selected_day: string;
}
