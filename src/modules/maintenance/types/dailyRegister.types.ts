// Daily registers — factory-wide (not company-scoped) maintenance records:
// per-meter daily electricity readings and a simple daily wastage log.

import type { CompanyCode } from '@/config/constants';

/** Where a main meter's electricity comes from. Mirrors the backend choices. */
export type SupplySource = 'GRID' | 'DG' | 'SOLAR';

/** Label per source, so the register and its dialogs never spell one twice. */
export const SUPPLY_SOURCE_LABELS: Record<SupplySource, string> = {
  GRID: 'Grid',
  DG: 'DG Set',
  SOLAR: 'Solar',
};

export const SUPPLY_SOURCE_LIST: SupplySource[] = ['GRID', 'DG', 'SOLAR'];

/**
 * Someone on the factory's supply who is not a Jivo company — Sidle. Kept out
 * of the company master on purpose (a row there would appear in every company
 * picker in the ERP), so the register carries its own short list and offers
 * the two together wherever electricity is attributed.
 */
export interface ElectricityConsumer {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

/**
 * A company code or a non-company consumer's code. The register's Company
 * dropdown offers both in one list — to the person reading it they are all
 * just "who used it".
 */
export type AttributionCode = CompanyCode | string;

export interface ElectricityMeter {
  id: number;
  name: string;
  meter_number: string;
  location: string;
  // Companies the meter feeds. Several codes = a shared meter (Oil + Beverages
  // run off the same campus supply); Mart meters stand alone. Empty = not
  // attributed to any company yet.
  company_codes: CompanyCode[];
  // Non-company consumers the meter also feeds (Sidle).
  consumer_codes: string[];
  // Everyone the meter feeds — companies and consumers in one string, which is
  // what the register's Company column has always shown.
  companies_display: string;
  // A main meter is an incoming supply every other meter draws from, so the
  // register reports it on its own and leaves it out of the total.
  is_main: boolean;
  // Which supply a main measures. Blank on a sub-meter, which measures
  // whatever the plant ran on that day.
  supply_source: SupplySource | '';
  supply_source_display: string;
  // False for a main that measures a supply another meter already counts —
  // KVAH is the grid's KWH as apparent energy, so adding both doubles the grid.
  counts_as_supply: boolean;
  // Read-only: resolved from the admin Cost Master (value "meter:<name>").
  rate_per_unit: string;
  // Grid multiplying factor: the dial difference is multiplied by it to get the
  // billed units. "1.0000" means the dial reads true.
  multiplying_factor: string;
  // Latest reading, used to prefill the next opening reading.
  last_reading_date: string | null;
  last_closing_reading: string | null;
  readings_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElectricityMeterPayload {
  name: string;
  meter_number?: string;
  location?: string;
  company_codes?: CompanyCode[];
  consumer_codes?: string[];
  is_main?: boolean;
  supply_source?: SupplySource | '';
  counts_as_supply?: boolean;
  // ₹/unit is not writable here — it is set on the admin Cost Master page.
  multiplying_factor?: string;
  is_active?: boolean;
}

export interface ElectricityMeterFilters {
  search?: string;
  is_active?: boolean;
  // Keeps only meters tagged with this company (shared meters match each of
  // theirs); untagged meters drop out.
  company?: AttributionCode | 'ALL';
  is_main?: boolean;
  supply_source?: SupplySource;
}

export interface DailyElectricityReading {
  id: number;
  meter: number;
  meter_name: string;
  // Mirrors the meter's flags: main-meter readings are totalled separately,
  // and per supply, because grid and DG swap over day to day.
  meter_is_main: boolean;
  meter_supply_source: SupplySource | '';
  meter_supply_source_display: string;
  meter_counts_as_supply: boolean;
  // What the METER is configured with — the default the form offers.
  meter_companies_display: string;
  // Who THIS day's units belong to. Copied from the meter when the reading is
  // entered and editable on the form, so a day the line ran for somebody else
  // is recorded as it happened. Empty on a reading entered before the form
  // asked, which falls back to its meter — attribution_display already has.
  company_codes: CompanyCode[];
  consumer_codes: string[];
  attribution_display: string;
  date: string;
  // Clock time the dial was read — not when the row was typed (created_at is
  // that). Null on readings entered before this was recorded.
  reading_time: string | null;
  opening_reading: string;
  closing_reading: string;
  // What the dial moved, before the factor; units_consumed is the billed
  // figure (dial_difference × multiplying_factor).
  dial_difference: string;
  multiplying_factor: string;
  units_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  remarks: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DailyElectricityReadingPayload {
  meter: number;
  date: string;
  // Omit both to carry the meter's own attribution onto the reading.
  company_codes?: CompanyCode[];
  consumer_codes?: string[];
  // "HH:MM" or "HH:MM:SS"; omit and the backend stamps the current time.
  reading_time?: string;
  // Omit to carry forward the meter's previous closing reading.
  opening_reading?: string;
  closing_reading: string;
  // Omit to snapshot the meter's current rate.
  rate_per_unit?: string;
  // Omit to snapshot the meter's current multiplying factor.
  multiplying_factor?: string;
  remarks?: string;
}

export interface DailyElectricityReadingFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  meter?: number | 'ALL';
  company?: AttributionCode | 'ALL';
  // Ask for one side of the main/sub split; omit to get both.
  is_main?: boolean;
  supply_source?: SupplySource;
}

export interface DailyWastageLog {
  id: number;
  date: string;
  material_name: string;
  qty: string;
  uom: string;
  reason: string;
  photo: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DailyWastageLogPayload {
  date: string;
  material_name: string;
  qty: string;
  uom?: string;
  reason?: string;
  // Optional proof photo; sent as multipart when present.
  photoFile?: File | null;
}

export interface DailyWastageLogFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
