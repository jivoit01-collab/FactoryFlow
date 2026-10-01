/**
 * QA Reports ("production QC" in code) — the records QC maintains, each a
 * paper form; an entry is one filled-in copy, approved in one step by a QC lead.
 * Mirrors `quality_control/serializers_production_qc.py`.
 *
 * A *parameter type* is a report type: one form and the parameters it
 * records. Reports are not tied to lines, runs or products — whatever the
 * paper header asks for (product, line, batch...) is one of its parameters. A
 * parameter's `value_type` is the kind of reading it takes (the arrival-slip
 * master calls that `parameter_type`).
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

// ==================== Entries ====================

export interface ProductionQCEntryListItem {
  id: number;
  parameter_type: ProductionParameterTypeRef;
  /** The default the entry was made with, if any (its name is kept even if it is removed). */
  default_id: number | null;
  default_name: string;
  /** The entries sent with this one, itself included, in order: approved, sent back and corrected as one. */
  submission_id: number | null;
  submission_entry_ids: number[];
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
  parameter_type_id?: number;
  /** The entries sent together, whatever their date. */
  submission_id?: number;
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
  parameter_type_id: number;
  /** One of the report's defaults; left out, the entry uses the report's own standards. */
  default_id?: number | null;
  remarks: string;
  /** One entry's readings — or, for several samples filled together, `samples`. */
  results?: ProductionQCReading[];
  /** One entry per sample, sent and decided together. */
  samples?: { results: ProductionQCReading[] }[];
}

export interface UpdateProductionQCEntryRequest {
  remarks: string;
  /** The entry's own readings, when it was sent on its own. */
  results?: ProductionQCReading[];
  /** Every entry sent with it, each by its id: they are corrected as one. */
  samples?: { entry_id: number; results: ProductionQCReading[] }[];
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
  /** Active defaults: when there are any, New asks which to use (or none). */
  default_count: number;
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

// ==================== Defaults ====================

/**
 * What one default sets for one parameter. The spec — standard, min, max —
 * replaces the parameter's own when any of the three is set (a blank standard
 * then reads "-"); all three blank keeps the parameter's. `value` pre-fills the
 * reading, which stays editable.
 */
export interface ProductionParameterDefaultValue {
  parameter_id: number;
  standard_value: string;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  value: string;
}

/** A named set of values for one report type — e.g. one SKU's standards. */
export interface ProductionParameterTypeDefault {
  id: number;
  parameter_type_id: number;
  name: string;
  is_active: boolean;
  values: ProductionParameterDefaultValue[];
  created_at: string;
  updated_at: string;
}

export interface ProductionParameterTypeDefaultRequest {
  name: string;
  /** The whole default: rows that set nothing may be left out. */
  values: {
    parameter_id: number;
    standard_value: string;
    min_value: number | null;
    max_value: number | null;
    value: string;
  }[];
}
