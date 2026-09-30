/**
 * Oil prices, as the API sends them: the commodity market prices and Jivo's own
 * pack rates, one set a day, read from the purchase team's price sheet.
 *
 * All figures are NUMBERS (a read-out), in rupees. Dates are "YYYY-MM-DD".
 */

/** Rupees per kilogram of loose oil, building up from the factory price. */
export interface PriceFigures {
  factory_price_kg: number;
  /** With the packing cost added (the sheet adds 14). */
  packed_price_kg: number;
  /** With 5% GST. */
  with_gst_kg: number;
  /** The same, per litre (1.0989 L to the kg). */
  with_gst_litre: number;
}

/** SHEET: read here. EXIM: copied from EXIM's history of the same sheet. */
export type PriceSource = 'SHEET' | 'EXIM';

export interface CommodityPrice extends PriceFigures {
  commodity: string;
  source: PriceSource;
  fetched_at: string;
  /** The previous day the sheet was read; null for a commodity new that day. */
  previous: PriceFigures | null;
}

export interface PriceDay {
  /** The day asked for; `date` is the latest day on or before it that has prices. */
  asked: string | null;
  date: string | null;
  /** The days either side that have prices (gaps skipped). */
  previous_date: string | null;
  next_date: string | null;
  /** The first and last days held at all. */
  first_date: string | null;
  last_date: string | null;
  /** The published sheet the prices are read from. */
  sheet_url: string;
  prices: CommodityPrice[];
}

export interface PriceRangeRow extends PriceFigures {
  date: string;
  commodity: string;
  source: PriceSource;
  fetched_at: string;
}

export interface PriceRange {
  from: string;
  to: string;
  rows: PriceRangeRow[];
}

export interface PackRate {
  pack_type: string;
  commodity: string;
  /** Rupees per pack. */
  rate: number;
  previous: number | null;
  source: PriceSource;
  fetched_at: string;
}

export interface RateDay {
  asked: string | null;
  date: string | null;
  previous_date: string | null;
  next_date: string | null;
  first_date: string | null;
  last_date: string | null;
  sheet_url: string;
  rates: PackRate[];
  packs: string[];
  commodities: string[];
}

export interface RateRange {
  from: string;
  to: string;
  rows: { date: string; pack_type: string; commodity: string; rate: number }[];
}

/** What the sheet shows right now, not saved. */
export interface SheetPrices {
  prices: (PriceFigures & { commodity: string })[];
}

export interface SheetRates {
  rates: { pack_type: string; commodity: string; rate: number }[];
}

/** Saving the sheet as today's: how many were new or re-read, and the day as saved. */
export type PriceSaveResult = PriceDay & { created: number; updated: number };
export type RateSaveResult = RateDay & { created: number; updated: number };
