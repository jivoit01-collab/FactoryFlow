// Daily registers — factory-wide (not company-scoped) maintenance records:
// per-meter daily electricity readings and a simple daily wastage log.

import type { CompanyCode } from '@/config/constants';

export interface ElectricityMeter {
  id: number;
  name: string;
  meter_number: string;
  location: string;
  // Companies the meter feeds. Several codes = a shared meter (Oil + Beverages
  // run off the same campus supply); Mart meters stand alone. Empty = not
  // attributed to any company yet.
  company_codes: CompanyCode[];
  companies_display: string;
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
  // ₹/unit is not writable here — it is set on the admin Cost Master page.
  multiplying_factor?: string;
  is_active?: boolean;
}

export interface ElectricityMeterFilters {
  search?: string;
  is_active?: boolean;
  // Keeps only meters tagged with this company (shared meters match each of
  // theirs); untagged meters drop out.
  company?: CompanyCode | 'ALL';
}

export interface DailyElectricityReading {
  id: number;
  meter: number;
  meter_name: string;
  meter_companies_display: string;
  date: string;
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
  company?: CompanyCode | 'ALL';
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
