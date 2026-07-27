/** Online Quality Monitoring types (digitises QA-FRM-14-00-05-04). */

export type OnlineRecordStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type Organoleptic = '' | 'ACCEPTABLE' | 'NOT_ACCEPTABLE';
export type OkNotOk = '' | 'OK' | 'NOT_OK';
export type PassFail = '' | 'PASS' | 'FAIL';
export type SpecValidationType = 'RANGE' | 'MIN' | 'MAX' | 'NONE';

/** The 8 numeric water-quality fields that validate against the spec master. */
export const WATER_QUALITY_KEYS = [
  'ph',
  'tds',
  'turbidity',
  'alkalinity',
  'total_hardness',
  'calcium',
  'magnesium',
  'chloride',
] as const;
export type WaterQualityKey = (typeof WATER_QUALITY_KEYS)[number];

export type SpecScope = 'GLOBAL' | 'COMPANY';

export interface OnlineQualitySpec {
  id: number;
  company: number | null;
  scope: SpecScope;
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

export interface OnlineQualityTorque {
  id?: number;
  head_no: number;
  torque_value: string | null;
}

export interface OnlineQualityAttachment {
  id: number;
  url: string;
  original_name: string;
  content_type: string;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface OnlineQualityReading {
  id: number;
  reading_time: string; // HH:MM[:SS]
  filler_speed: string | null;
  taste: Organoleptic;
  aroma: Organoleptic;
  appearance: Organoleptic;
  ph: string | null;
  tds: string | null;
  turbidity: string | null;
  alkalinity: string | null;
  total_hardness: string | null;
  calcium: string | null;
  magnesium: string | null;
  chloride: string | null;
  package_attribute: OkNotOk;
  date_code: OkNotOk;
  rub_test: PassFail;
  closure_jump_test: PassFail;
  remarks: string;
  torque_heads: OnlineQualityTorque[];
  attachments: OnlineQualityAttachment[];
}

export interface OnlineQualityRecord {
  id: number;
  company: number;
  production_line: number;
  line_name: string;
  date: string;
  sku: string;
  product_name: string;
  flavour: string;
  shift: string;
  batch_no: string;
  status: OnlineRecordStatus;
  remarks: string;
  submitted_by_name: string | null;
  submitted_at: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_remarks: string;
  rejection_remarks: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  readings: OnlineQualityReading[];
}

export interface OnlineQualityRecordListItem {
  id: number;
  date: string;
  production_line: number;
  line_name: string;
  sku: string;
  product_name: string;
  flavour: string;
  shift: string;
  batch_no: string;
  status: OnlineRecordStatus;
  reading_count: number;
  created_by_name: string | null;
  created_at: string;
}

export interface ProductionLineOption {
  id: number;
  name: string;
}

export interface OnlineProductionRun {
  id: number;
  run_number: number;
  date: string | null;
  line: number;
  line_name: string;
  item_code: string;
  product: string;
}

export interface CreateOnlineRecordRequest {
  production_line_id: number;
  date: string;
  sku?: string;
  product_name?: string;
  flavour?: string;
  shift?: string;
  batch_no?: string;
  remarks?: string;
}

/** Reading write payload — partial fields + optional torque replacement. */
export type OnlineReadingWrite = Partial<
  Omit<OnlineQualityReading, 'id' | 'torque_heads'>
> & { reading_time: string; torque_heads?: OnlineQualityTorque[] };

export interface OnlineMonitoringListParams {
  status?: OnlineRecordStatus;
  production_line?: number;
  sku?: string;
  shift?: string;
  batch?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}
