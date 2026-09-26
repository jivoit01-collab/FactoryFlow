// Daily Electricity++: the meter tree — where each electricity meter sits, who
// pays for what it measures, and the split that comes out of it. Mirrors
// factory_app/maintenance/electricity and serializers_electricity.
//
// The campus's meters are sub-meters of sub-meters, so a meter pays only for
// its OWN units — its reading less its sub-meters' — and its setup says who
// that is. Every unit on the incomer lands in exactly one account.
//
// Same meters and readings as the Daily Electricity page, which keeps its own
// types (dailyRegister.types) and its own logic.

import type {
  DailyElectricityReading,
  ElectricityMeter,
  ElectricityMeterFilters,
  SupplySource,
} from './dailyRegister.types';

/** How a meter's own units are split. */
export type AllocationBasis = 'UNASSIGNED' | 'FIXED' | 'RUN_HOURS' | 'METER_RATIO';

export const ALLOCATION_BASIS_LABELS: Record<AllocationBasis, string> = {
  UNASSIGNED: 'Not decided yet',
  FIXED: 'Fixed shares',
  RUN_HOURS: 'By production run hours',
  METER_RATIO: 'In proportion to other meters',
};

/** One party's fixed percentage of a meter's own units. */
export interface MeterShare {
  party: string; // "company:JIVO_OIL" / "consumer:SIDLE"
  party_name: string;
  company: string | null;
  consumer: string | null;
  percent: string;
}

/** What a proportional split follows: a line, a blowing machine, or a meter. */
export type DriverKind = 'LINE' | 'BLOWING_MACHINE' | 'METER';

export interface MeterDriver {
  kind: DriverKind;
  source: string; // "line:8" / "blowing:2" / "meter:16"
  id: number;
  name: string;
  company: string | null;
  company_name: string | null;
  weight: string;
}

/** One dated version of a meter's place in the tree and its split. */
export interface MeterSetup {
  id: number;
  meter?: number;
  meter_name?: string;
  effective_from: string;
  in_service: boolean;
  parent: number | null;
  parent_name: string | null;
  basis: AllocationBasis;
  basis_label: string;
  shares: MeterShare[];
  drivers: MeterDriver[];
  /** "Jivo Oil 50% · Jivo Beverages 50%" — the rule in one line. */
  summary: string;
  note: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeterSharePayload {
  company?: string | null;
  consumer?: string | null;
  percent: string;
}

export interface MeterDriverPayload {
  production_line?: number | null;
  blowing_machine?: number | null;
  meter?: number | null;
  /** Who a followed meter stands for; a line or machine brings its own. */
  company?: string | null;
  weight?: string;
}

export interface MeterSetupPayload {
  meter?: number;
  effective_from?: string;
  in_service?: boolean;
  parent?: number | null;
  basis?: AllocationBasis;
  shares?: MeterSharePayload[];
  drivers?: MeterDriverPayload[];
  note?: string;
}

/** Where a new meter goes, sent with it on create. */
export interface MeterPlacementPayload {
  effective_from?: string;
  parent?: number | null;
  basis?: AllocationBasis;
  shares?: MeterSharePayload[];
  drivers?: MeterDriverPayload[];
  note?: string;
}

/** A meter's place on the day the list was asked for. */
export interface MeterTreeInfo {
  in_service: boolean;
  order: number | null;
  depth: number;
  parent: number | null;
  parent_name: string | null;
  /** Readings exist, but nobody has put the meter in the tree yet. */
  unplaced: boolean;
  setup: MeterSetup | null;
}

/** A production line or blowing machine a run-hours split can follow. */
export interface RunSource {
  kind: 'LINE' | 'BLOWING_MACHINE';
  id: number;
  name: string;
  company: string;
  company_name: string;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// The day sheet
// ---------------------------------------------------------------------------

export interface DaySheetRow {
  meter: number;
  name: string;
  location: string;
  depth: number;
  parent: number | null;
  parent_name: string | null;
  /** A second register (KVAH) — read beside its meter, never counted. */
  is_register: boolean;
  register_of: number | null;
  multiplying_factor: string;
  rate_per_unit: string;
  /** Whether this user keeps the meter (may record on it). */
  keeps: boolean;
  split: string | null;
  previous: { date: string; closing_reading: string } | null;
  reading: {
    id: number;
    opening_reading: string;
    closing_reading: string;
    units_consumed: string;
    meter_reset: boolean;
    reading_time: string | null;
    remarks: string;
  } | null;
  next: { date: string; opening_reading: string } | null;
}

export interface DaySheet {
  date: string;
  rows: DaySheetRow[];
}

export interface DaySheetEntryPayload {
  meter: number;
  closing_reading: string;
  opening_reading?: string;
  meter_reset?: boolean;
  reading_time?: string;
  remarks?: string;
}

export interface DaySheetSaveResult {
  created: number;
  updated: number;
  sheet: DaySheet;
}

// ---------------------------------------------------------------------------
// The split
// ---------------------------------------------------------------------------

export type PartyKind = 'COMPANY' | 'CONSUMER' | 'UNASSIGNED' | 'UNKNOWN';

export interface SplitParty {
  key: string;
  code: string;
  name: string;
  kind: PartyKind;
}

export interface SplitPartyTotal {
  party: string;
  units: string;
  cost: string;
  share_pct: string | null;
}

export interface SplitMeterShare {
  party: string;
  units: string;
  cost: string;
  share_pct: string | null;
}

export interface SplitMeter {
  id: number;
  name: string;
  location: string;
  depth: number;
  parent_id: number | null;
  children: number[];
  is_register: boolean;
  register_of: number | null;
  register_of_name?: string;
  unplaced?: boolean;
  rule?: MeterSetup | null;
  rule_changed_in_span?: boolean;
  /** What the meter read over the span. */
  units: string;
  cost?: string;
  /** What its sub-meters read, where they were read. */
  sub_metered_units?: string;
  /** Its own: read less sub-metered. This is what `split` divides. */
  own_units?: string;
  own_cost?: string;
  over_read_units?: string;
  days_in_service?: number;
  days_read: number;
  spread_days?: number;
  fallback_days?: number;
  split?: SplitMeterShare[];
  /** Hours (run hours) or units (meter ratio) behind a proportional split. */
  drivers?: { party: string; amount: string }[];
  /** Register rows: what the principal read, and principal ÷ register. */
  principal_units?: string;
  ratio?: string | null;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface SplitIssue {
  kind: string;
  severity: IssueSeverity;
  meter_id: number | null;
  meter_name: string | null;
  days: string[];
  count: number;
  units: string;
  message: string;
  detail: Record<string, unknown>;
}

export interface SplitDay {
  date: string;
  entered: boolean;
  supply_units: string | null;
  by_party: Record<string, string>;
  cost_by_party: Record<string, string>;
}

export interface SplitReport {
  date_from: string;
  date_to: string;
  days: number;
  entered_days: number;
  parties: SplitParty[];
  totals: {
    supply_units: string;
    supply_cost: string;
    allocated_units: string;
    allocated_cost: string;
    over_read_units: string;
    by_party: SplitPartyTotal[];
  };
  meters: SplitMeter[];
  daily: SplitDay[];
  /** Each meter's units per party, one figure per day of `daily`, in order. */
  meter_daily: { meter_id: number; party: string; units: string[] }[];
  issues: SplitIssue[];
  unplaced_meters: { id: number; name: string }[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Meters and readings, as Daily Electricity++ serves them
// ---------------------------------------------------------------------------

/**
 * A meter with its place in the tree. The Daily Electricity page's own fields
 * (``is_main``, ``company_codes``…) come along read-only: that page sets them,
 * this one never does.
 */
export interface TreeMeter extends ElectricityMeter {
  // A second register of another meter (KVAH on KWH) — read and shown beside
  // it, never counted and never in the tree.
  register_of: number | null;
  register_of_name: string | null;
  // Where the meter sits in the tree on the asked-for day, and the setup
  // version in force. Null on a meter that has never been placed.
  tree: MeterTreeInfo | null;
}

export interface TreeMeterPayload {
  name: string;
  meter_number?: string;
  location?: string;
  // Only meaningful on a main meter; a sub-meter carries no source.
  supply_source?: SupplySource | '';
  // ₹/unit is not writable here — it is set on the admin Cost Master page.
  multiplying_factor?: string;
  register_of?: number | null;
  // On create only: where the meter goes in the tree. Omitted = a main meter
  // from today with nobody paying yet. Moving it later is a setup version.
  placement?: MeterPlacementPayload;
  is_active?: boolean;
}

export interface TreeMeterFilters extends ElectricityMeterFilters {
  // The tree as it stood on this day; today when omitted.
  date?: string;
  in_service?: boolean;
}

export interface TreeReading extends DailyElectricityReading {
  // Set when the meter is a second register (KVAH) of that meter.
  meter_register_of: number | null;
  // The meter was replaced or its dial reset, so the opening does not follow
  // on from the previous closing.
  meter_reset: boolean;
}

export interface TreeReadingPayload {
  meter: number;
  date: string;
  // "HH:MM" or "HH:MM:SS"; omit and the backend stamps the current time.
  reading_time?: string;
  // Omit to carry forward the meter's previous closing reading. A different
  // number is refused unless meter_reset says the dial started again.
  opening_reading?: string;
  meter_reset?: boolean;
  closing_reading: string;
  // Omit to snapshot the meter's current rate.
  rate_per_unit?: string;
  // Omit to snapshot the meter's current multiplying factor.
  multiplying_factor?: string;
  remarks?: string;
}
