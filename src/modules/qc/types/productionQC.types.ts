/**
 * Production QC — checks QC makes on a running line, approved in one step by a
 * QC lead. Mirrors `quality_control/serializers_production_qc.py`.
 *
 * A *parameter type* plays the part an arrival slip's material type does: it
 * carries its own list of parameters. Unlike a material type it is not tied to
 * products: any type can be checked on any running line. Its parameters'
 * `value_type` is the kind of reading they take (the arrival-slip master calls
 * that `parameter_type`).
 */

import type { ParameterType } from './qc.types';

/** DRF sends a DecimalField as a string ("910.0000"); older callers may send a number. */
export type DecimalValue = string | number;

export type ProductionQCStatus = 'PENDING' | 'SENT_BACK' | 'APPROVED';

export interface ProductionParameterTypeRef {
  id: number;
  code: string;
  name: string;
}

// ==================== Running lines ====================

/**
 * A line a check can be made on: its IN_PROGRESS run whose latest segment
 * started in the last 24h or is open now. `is_running_now=false` means the line
 * is stopped (a breakdown, the lunch stop) since `stopped_at`.
 */
export interface ProductionRunningLine {
  line_id: number;
  line_name: string;
  run_id: number;
  run_number: number;
  run_date: string;
  item_code: string;
  product: string;
  is_running_now: boolean;
  last_started_at: string;
  stopped_at: string | null;
}

// ==================== Entries ====================

export interface ProductionQCEntryListItem {
  id: number;
  line_id: number;
  line_name: string;
  run_id: number;
  run_number: number;
  item_code: string;
  product: string;
  parameter_type: ProductionParameterTypeRef;
  checked_at: string;
  status: ProductionQCStatus;
  status_label: string;
  out_of_spec_count: number;
  submitted_by_name: string | null;
  submitted_at: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  sent_back_by_name: string | null;
  sent_back_at: string | null;
  send_back_remarks: string;
}

/** One reading, with the parameter's spec as it stood when the entry was saved. */
export interface ProductionQCResult {
  id: number;
  parameter_id: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  /** The kind of reading (NUMERIC / TEXT / BOOLEAN / RANGE). */
  parameter_type: ParameterType;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  uom: string;
  sequence: number;
  is_mandatory: boolean;
  result_value: string;
  result_numeric: DecimalValue | null;
  is_within_spec: boolean | null;
  remarks: string;
}

export interface ProductionQCEntry extends ProductionQCEntryListItem {
  remarks: string;
  approval_remarks: string;
  results: ProductionQCResult[];
}

export interface ProductionQCEntryCounts {
  /** Waiting for approval: on the day asked for, else on every date. */
  pending: number;
  /** Sent back for correction: on the day asked for, else on every date. */
  sent_back: number;
  /** Approved on the day asked for, else within the range (today when none). */
  approved: number;
  /** With a day asked for: entries still waiting (pending / sent back) on other days. */
  waiting_elsewhere?: number;
  /** …and the oldest day one of them is on (YYYY-MM-DD). */
  waiting_elsewhere_first_date?: string | null;
}

export interface ProductionQCEntryListParams {
  status?: ProductionQCStatus;
  line_id?: number;
  /** One day (YYYY-MM-DD): that day's entries, every status. */
  date?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface ProductionQCDateRangeParams {
  /** One day (YYYY-MM-DD); overrides the range. */
  date?: string;
  from_date?: string;
  to_date?: string;
}

export interface ProductionQCReading {
  parameter_id: number;
  result_value: string;
  result_numeric?: number | null;
  /** Sent for readings the backend cannot judge on its own (text, a non-numeric spec). */
  is_within_spec?: boolean | null;
  remarks?: string;
}

export interface CreateProductionQCEntryRequest {
  run_id: number;
  parameter_type_id: number;
  remarks: string;
  results: ProductionQCReading[];
}

export interface UpdateProductionQCEntryRequest {
  remarks: string;
  results: ProductionQCReading[];
}

export interface ProductionQCDecisionRequest {
  remarks?: string;
}

// ==================== Masters ====================

export interface ProductionParameterType {
  id: number;
  code: string;
  name: string;
  description: string;
  /** The form's document number, e.g. QA-FRM-14-01-05-02 — set in Master Data > Print Documents. */
  print_document_id: string;
  /** e.g. "02". */
  revision: string;
  /** The revision's date, YYYY-MM-DD. */
  revision_date: string | null;
  is_active: boolean;
  /** Active parameters only; a type with none cannot be used for a check. */
  parameter_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionParameterTypeListParams {
  search?: string;
  include_inactive?: boolean;
}

export interface ProductionParameterTypeRequest {
  code: string;
  name: string;
  description?: string;
  revision?: string;
  revision_date?: string | null;
  /** The form's number — the same Print Documents row Master Data shows. Blank removes it. */
  print_document_id?: string;
}

export interface ProductionParameter {
  id: number;
  parameter_type_id: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  value_type: ParameterType;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  uom: string;
  sequence: number;
  is_mandatory: boolean;
  is_active: boolean;
}

export interface ProductionParameterRequest {
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  value_type: ParameterType;
  min_value: number | null;
  max_value: number | null;
  uom: string;
  sequence: number;
  is_mandatory: boolean;
}
