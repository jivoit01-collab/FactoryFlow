/**
 * ETP / STP register types — mirrors `etp/serializers.py`.
 *
 * Decimals arrive as strings from DRF and are kept as strings here: the forms
 * are text inputs and the register prints what was typed. Only counts and ids
 * are numbers.
 */

import type { CompanyCode } from '@/config/constants';

export type PlantType = 'ETP' | 'STP' | 'WTP' | 'RO' | 'ZLD' | 'OTHER';
export type ChemicalUom = 'KG' | 'GM' | 'LTR' | 'ML' | 'NOS';
export type MonitoringStage =
  | 'INFLUENT'
  | 'PRIMARY'
  | 'AERATION'
  | 'SECONDARY'
  | 'TREATED'
  | 'OTHER';
export type SpecValidationType = 'RANGE' | 'MIN' | 'MAX' | 'NONE';
export type StaffRole = 'OPERATOR' | 'CHEMIST' | 'SUPERVISOR' | 'QAM' | 'OTHER';
export type CalibrationFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'FORTNIGHTLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY';
export type OptionCategory =
  | 'SLUDGE_COLLECTION_MODE'
  | 'SLUDGE_STORAGE_METHOD'
  | 'SLUDGE_DISPOSAL_MODE'
  | 'CALIBRATION_ACTION';

export const PLANT_TYPE_LABELS: Record<PlantType, string> = {
  ETP: 'ETP — Effluent Treatment Plant',
  STP: 'STP — Sewage Treatment Plant',
  WTP: 'WTP — Water Treatment Plant',
  RO: 'RO Plant',
  ZLD: 'ZLD — Zero Liquid Discharge',
  OTHER: 'Other',
};

export const MONITORING_STAGE_LABELS: Record<MonitoringStage, string> = {
  INFLUENT: 'Influent water',
  PRIMARY: 'Primary / equalisation',
  AERATION: 'Aeration water',
  SECONDARY: 'Secondary clarifier',
  TREATED: 'Treated effluent water',
  OTHER: 'Other',
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  OPERATOR: 'Operator',
  CHEMIST: 'Chemist',
  SUPERVISOR: 'Supervisor',
  QAM: 'QA Manager',
  OTHER: 'Other',
};

export const CHEMICAL_UOM_LABELS: Record<ChemicalUom, string> = {
  KG: 'kg',
  GM: 'gm',
  LTR: 'litre',
  ML: 'ml',
  NOS: 'nos',
};

export const CALIBRATION_FREQUENCY_LABELS: Record<CalibrationFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half yearly',
  YEARLY: 'Yearly',
};

export const SPEC_VALIDATION_LABELS: Record<SpecValidationType, string> = {
  RANGE: 'Range (min–max)',
  MIN: 'Minimum only',
  MAX: 'Maximum only',
  NONE: 'No numeric check',
};

// ---- Masters --------------------------------------------------------------

export interface TreatmentPlant {
  id: number;
  name: string;
  code: string;
  plant_type: PlantType;
  plant_type_display: string;
  location: string;
  company_codes: CompanyCode[];
  companies_display: string;
  capacity_kld: string | null;
  consent_number: string;
  sequence: number;
  is_active: boolean;
}

export interface PlantStaff {
  id: number;
  name: string;
  role: StaffRole;
  role_display: string;
  employee_code: string;
  plant_ids: number[];
  sequence: number;
  is_active: boolean;
}

export interface PlantOption {
  id: number;
  category: OptionCategory;
  category_display: string;
  label: string;
  sequence: number;
  is_default: boolean;
  is_active: boolean;
}

export interface PlantChemical {
  id: number;
  name: string;
  default_uom: ChemicalUom;
  uom_display: string;
  plant_ids: number[];
  sequence: number;
  remarks: string;
  is_active: boolean;
}

export interface BackwashEquipment {
  id: number;
  plant: number;
  plant_code: string;
  name: string;
  equipment_code: string;
  default_chemical: number | null;
  default_chemical_name: string;
  default_duration_minutes: number | null;
  sequence: number;
  is_active: boolean;
}

export interface MonitoringParameter {
  id: number;
  plant: number;
  plant_code: string;
  stage: MonitoringStage;
  stage_display: string;
  parameter_key: string;
  parameter_name: string;
  unit: string;
  min_value: string | null;
  max_value: string | null;
  specification_text: string;
  validation_type: SpecValidationType;
  sequence: number;
  is_active: boolean;
}

export interface CalibrationPoint {
  id?: number;
  actual_value: string;
  label?: string;
  sequence?: number;
  is_active?: boolean;
}

export interface CalibrationInstrument {
  id: number;
  plant: number | null;
  plant_code: string;
  equipment_name: string;
  equipment_id: string;
  line_id: string;
  location: string;
  working_range: string;
  frequency: CalibrationFrequency;
  frequency_display: string;
  tolerance: string;
  standard_make_model: string;
  standard_equipment_id: string;
  standard_range: string;
  external_calibration_date: string | null;
  external_calibration_due_date: string | null;
  sequence: number;
  is_active: boolean;
  points: CalibrationPoint[];
  last_calibration_date: string | null;
  calibration_due_date: string | null;
  records_count: number;
}

// ---- Registers ------------------------------------------------------------

export interface DailyPlantLog {
  id: number;
  plant: number;
  plant_code: string;
  plant_name: string;
  date: string;
  inlet_initial: string | null;
  inlet_final: string | null;
  inlet_total: string;
  outlet_initial: string | null;
  outlet_final: string | null;
  outlet_total: string;
  ph_reading: string | null;
  ph_reading_time: string | null;
  energy_initial: string | null;
  energy_final: string | null;
  energy_units: string;
  operator: number | null;
  operator_name: string;
  chemist: number | null;
  chemist_name: string;
  remarks: string;
  created_by_name: string;
}

export interface MonitoringValue {
  id?: number;
  parameter: number;
  parameter_key?: string;
  parameter_name?: string;
  stage?: MonitoringStage;
  unit?: string;
  value: string | null;
  is_out_of_spec?: boolean;
}

export interface MonitoringReading {
  id?: number;
  reading_time: string;
  operator: number | null;
  operator_name?: string;
  remarks?: string;
  values: MonitoringValue[];
}

export interface MonitoringRecord {
  id: number;
  plant: number;
  plant_code: string;
  plant_name: string;
  date: string;
  interval_hours: number;
  chemist: number | null;
  chemist_name: string;
  verified_by: number | null;
  verified_by_name: string;
  verified_at: string | null;
  is_verified: boolean;
  remarks: string;
  readings: MonitoringReading[];
  out_of_spec_count: number;
  created_by_name: string;
}

export interface MonitoringSheetTemplate {
  plant: number;
  interval_hours: number;
  time_slots: string[];
  parameters: MonitoringParameter[];
}

export interface ChemicalConsumptionLine {
  id?: number;
  chemical: number;
  chemical_name?: string;
  quantity: string | null;
  uom?: ChemicalUom;
}

export interface ChemicalConsumptionLog {
  id: number;
  plant: number;
  plant_code: string;
  plant_name: string;
  date: string;
  operator: number | null;
  operator_name: string;
  verified_by: number | null;
  verified_by_name: string;
  remarks: string;
  lines: ChemicalConsumptionLine[];
  created_by_name: string;
}

export interface ChemicalTotal {
  chemical: number;
  chemical_name: string;
  uom: ChemicalUom;
  total: string;
}

export interface SludgeEntry {
  id: number;
  serial_no: number | null;
  plant: number;
  plant_code: string;
  plant_name: string;
  date: string;
  quantity_kg: string | null;
  collection_mode: number | null;
  collection_mode_label: string;
  storage_method: number | null;
  storage_method_label: string;
  disposal_mode: number | null;
  disposal_mode_label: string;
  operator: number | null;
  operator_name: string;
  supervisor: number | null;
  supervisor_name: string;
  photo: string | null;
  remarks: string;
  created_by_name: string;
}

export interface BackwashEntry {
  id: number;
  plant: number;
  plant_code: string;
  date: string;
  equipment: number;
  equipment_name: string;
  chemical: number | null;
  chemical_name: string;
  chemical_quantity: string | null;
  start_time: string;
  stop_time: string | null;
  contact_minutes: number;
  operator: number | null;
  operator_name: string;
  chemist: number | null;
  chemist_name: string;
  remarks: string;
}

export interface CalibrationReading {
  id?: number;
  actual_value: string;
  observed_value: string | null;
  variation?: string;
  is_within_tolerance?: boolean;
  remarks?: string;
}

export interface CalibrationRecord {
  id: number;
  instrument: number;
  instrument_name: string;
  instrument_code: string;
  instrument_location: string;
  instrument_working_range: string;
  instrument_frequency: string;
  standard_make_model: string;
  tolerance: string;
  date: string;
  time: string | null;
  due_date: string | null;
  corrective_action: number | null;
  corrective_action_label: string;
  is_out_of_calibration: boolean;
  was_replaced: boolean;
  checked_by: number | null;
  checked_by_name: string;
  verified_by: number | null;
  verified_by_name: string;
  remarks: string;
  readings: CalibrationReading[];
  created_by_name: string;
}

// ---- Overviews ------------------------------------------------------------

export interface EtpDashboardPlantCard {
  plant: number;
  plant_code: string;
  plant_name: string;
  plant_type: PlantType;
  companies_display: string;
  daily_log_done: boolean;
  chemical_log_done: boolean;
  monitoring_readings: number;
  monitoring_verified: boolean;
  monitoring_out_of_spec: number;
  backwash_entries: number;
  last_sludge_date: string | null;
}

export interface EtpCalibrationDueRow {
  instrument: number;
  equipment_name: string;
  equipment_id: string;
  plant_code: string;
  frequency: CalibrationFrequency;
  last_calibration_date: string | null;
  due_date: string | null;
  is_overdue: boolean;
  was_out_of_calibration: boolean;
}

export interface EtpDashboard {
  date: string;
  plants: EtpDashboardPlantCard[];
  calibration_due: EtpCalibrationDueRow[];
}

export interface EtpSummary {
  plant: number;
  date_from: string;
  date_to: string;
  days_logged: number;
  inlet_kl: string;
  outlet_kl: string;
  energy_units: string;
  sludge_kg: string;
  chemicals: { chemical_name: string; uom: ChemicalUom; total: string }[];
  monitoring_sheets: number;
  monitoring_out_of_spec: number;
}

// ---- Filters --------------------------------------------------------------

/** Every register list takes the same window. */
export interface RegisterFilters {
  plant?: number;
  plant_type?: PlantType;
  date?: string;
  date_from?: string;
  date_to?: string;
  company?: CompanyCode | '';
}

export interface MasterFilters {
  plant?: number;
  is_active?: boolean;
  category?: OptionCategory;
  role?: StaffRole;
  stage?: MonitoringStage;
  search?: string;
  company?: CompanyCode | '';
}

// ---- Change log -----------------------------------------------------------

export type RegisterKey =
  | 'DAILY_LOG'
  | 'MONITORING'
  | 'CHEMICAL'
  | 'SLUDGE'
  | 'BACKWASH'
  | 'CALIBRATION';

export type ChangeAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'VERIFIED';

export const CHANGE_ACTION_LABELS: Record<ChangeAction, string> = {
  CREATED: 'Recorded',
  UPDATED: 'Edited',
  DELETED: 'Deleted',
  VERIFIED: 'Verified',
};

/** One line of a register's edit trail. */
export interface RegisterChangeLogRow {
  id: number;
  register: RegisterKey;
  register_display: string;
  action: ChangeAction;
  action_display: string;
  /** The register row that changed — kept even after that row is deleted. */
  object_id: number | null;
  model_name: string;
  plant: number | null;
  plant_code: string;
  /** The date of the entry that changed (not when the edit happened). */
  entry_date: string | null;
  /** `{field: {from, to}}` — empty on a create / delete / verify. */
  changes: Record<
    string,
    { from: string | number | boolean | null; to: string | number | boolean | null }
  >;
  summary: string;
  changed_by: number | null;
  changed_by_name: string;
  changed_at: string;
}

export interface ChangeLogFilters {
  register?: RegisterKey;
  object_id?: number;
  plant?: number;
  action?: ChangeAction;
  changed_by?: number;
  date_from?: string;
  date_to?: string;
  company?: CompanyCode | '';
  /** Newest N rows; the API caps this at 200. */
  limit?: number;
}

// ---- Print documents ------------------------------------------------------

/** One key per printable form; matches `CONTROLLED_DOCUMENTS` on the FE and
 *  `PrintDocumentKey` on the backend. */
export type EtpPrintDocumentKey =
  | 'ETP_DAILY_RECORD'
  | 'ETP_MONITORING_RECORD'
  | 'ETP_CHEMICAL_CONSUMPTION'
  | 'STP_CHEMICAL_CONSUMPTION'
  | 'ETP_SLUDGE_GENERATION'
  | 'ETP_BACKWASH_RECORD'
  | 'ETP_CALIBRATION_RECORD';

export const PRINT_DOCUMENT_LABELS: Record<EtpPrintDocumentKey, string> = {
  ETP_DAILY_RECORD: 'Effluent Treatment Plant Record',
  ETP_MONITORING_RECORD: 'ETP On Line Monitoring Record',
  ETP_CHEMICAL_CONSUMPTION: 'Chemical Consumption Record — ETP',
  STP_CHEMICAL_CONSUMPTION: 'Chemical Consumption Record — STP',
  ETP_SLUDGE_GENERATION: 'Sludge Generation Record',
  ETP_BACKWASH_RECORD: 'Daily Back Washing Record',
  ETP_CALIBRATION_RECORD: 'Calibration Record',
};

/** The controlled-document identity of one form, as stored. */
export interface EtpPrintDocument {
  id: number;
  document_key: EtpPrintDocumentKey;
  document_key_label: string;
  company: number | null;
  /** null = the factory-wide row; a code = that company's override. */
  company_code: CompanyCode | null;
  form_name: string;
  document_code: string;
  revision: string;
  issue_date: string | null;
  /** Optional per-copy id printed in the footer, as the QC prints carry one. */
  document_id: string;
  notes: string;
  is_active: boolean;
}
