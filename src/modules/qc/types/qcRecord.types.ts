/**
 * Fillable QC record forms (the "Documents" screen).
 *
 * Mirrors `quality_control.models.qc_record`. A *template* is the blank
 * printed form — sections down the page, parameters down the left, each with
 * its own frequency and specification. A *record* is one day's filled sheet:
 * a set of time columns, and one value per (time slot × parameter) cell.
 */

export type ValueType = 'NUMBER' | 'TEXT' | 'CHOICE';

export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface RecordTemplateParameter {
  id: number;
  sequence: number;
  /** Sr.No as printed. */
  sr_no: string;
  name: string;
  frequency: string;
  specification: string;
  unit: string;
  value_type: ValueType;
  min_value: string | null;
  max_value: string | null;
  /** Suggestions offered for a CHOICE parameter; free text is still allowed. */
  allowed_values: string[];
  /** The subset of observations that meet the specification. */
  conforming_values: string[];
}

export interface RecordTemplateSection {
  id: number;
  sequence: number;
  title: string;
  parameters: RecordTemplateParameter[];
}

export interface RecordTemplate {
  id: number;
  document_code: string;
  title: string;
  organisation: string;
  revision_number: string;
  revision_date: string | null;
  revision_label: string;
  classification: string;
  description: string;
  sections: RecordTemplateSection[];
}

export interface RecordTemplateListItem {
  id: number;
  document_code: string;
  title: string;
  organisation: string;
  revision_number: string;
  revision_date: string | null;
  revision_label: string;
  classification: string;
  description: string;
  parameter_count: number;
  record_count: number;
}

export interface RecordTimeSlot {
  id: number;
  sequence: number;
  /** 'HH:MM:SS' from the API. */
  slot_time: string;
}

export interface RecordValue {
  id: number;
  time_slot: number;
  parameter: number;
  value: string;
  /** true = in spec, false = out of spec, null = not checkable. */
  in_spec: boolean | null;
}

export interface QCRecord {
  id: number;
  template: number;
  template_detail: RecordTemplate;
  record_date: string;
  shift: string;
  remarks: string;
  status: RecordStatus;
  status_label: string;
  time_slots: RecordTimeSlot[];
  values: RecordValue[];
  submitted_by_name: string;
  submitted_at: string | null;
  approved_by_name: string;
  approved_at: string | null;
  approval_remarks: string;
  created_at: string;
  updated_at: string;
}

export interface QCRecordListItem {
  id: number;
  template: number;
  template_title: string;
  template_code: string;
  record_date: string;
  shift: string;
  status: RecordStatus;
  status_label: string;
  slot_count: number;
  filled_count: number;
  created_at: string;
  updated_at: string;
}

/** One cell as sent to the bulk-save endpoint. */
export interface RecordCellWrite {
  /** 'HH:MM'. The time column is created on demand if it doesn't exist. */
  slot_time: string;
  parameter: number;
  value: string;
}

export interface CreateQCRecordRequest {
  template: number;
  record_date: string;
  shift?: string;
}

export interface ListQCRecordsParams {
  template?: number;
  status?: RecordStatus;
  date_from?: string;
  date_to?: string;
}
