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

/**
 * GRID: laid out as sections and parameters in the format builder.
 * SHEET: uploaded as an Excel sheet and drawn exactly as the sheet looks.
 */
export type RecordTemplateKind = 'GRID' | 'SHEET';

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
  kind: RecordTemplateKind;
  /** The uploaded sheet; null for a GRID form. */
  layout: SheetLayout | null;
  /** Which cells of `layout` are filled in, keyed by cell ('D10'). */
  cell_fields: CellFields;
  source_file_name: string;
  /** True once a sheet has been filled against the form: only its header may change. */
  is_locked: boolean;
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
  kind: RecordTemplateKind;
  /** Cells typed into on a SHEET form — its counterpart of parameter_count. */
  field_count: number;
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
  /** A SHEET form's values, keyed by cell. */
  cell_values: Record<string, string>;
  /** Per judged cell: true = meets its spec, false = does not. */
  cell_checks: Record<string, boolean>;
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

// ---------------------------------------------------------------------------
// Writing a form back (the "Customize format" screen)
// ---------------------------------------------------------------------------

/** One parameter row as sent to the form builder endpoints. */
export interface RecordTemplateParameterWrite {
  sequence: number;
  sr_no: string;
  name: string;
  frequency: string;
  specification: string;
  unit: string;
  value_type: ValueType;
  /** Null rather than '' — the backend column is a nullable decimal. */
  min_value: string | null;
  max_value: string | null;
  allowed_values: string[];
  conforming_values: string[];
}

export interface RecordTemplateSectionWrite {
  sequence: number;
  title: string;
  parameters: RecordTemplateParameterWrite[];
}

export interface RecordTemplateWrite {
  document_code: string;
  title: string;
  organisation: string;
  revision_number: string;
  revision_date: string | null;
  classification: string;
  description: string;
  /**
   * Leave out to edit only the header. The backend refuses to rewrite the
   * rows of a form that already carries readings, so a header-only save is
   * the way to correct a title or revision on a form that is in use.
   */
  sections?: RecordTemplateSectionWrite[];
  /** A SHEET form's layout, exactly as the import returned it. */
  layout?: SheetLayout;
  /** The token the import issued for `layout`; required whenever it is sent. */
  layout_token?: string;
  cell_fields?: CellFields;
  source_file_name?: string;
}

// ---------------------------------------------------------------------------
// Excel sheet forms
// ---------------------------------------------------------------------------

/**
 * One distinct cell look, in the compact keys the backend parser emits
 * (`quality_control/services/record_sheet.py`). Sizes are Excel's: font in
 * points; borders by Excel style name.
 */
export interface SheetStyle {
  ff?: string;
  fs?: number;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  st?: boolean;
  /** '#rrggbb' */
  fc?: string;
  bg?: string;
  ha?: 'left' | 'center' | 'right' | 'justify';
  va?: 'top' | 'middle' | 'bottom';
  wr?: boolean;
  rot?: number;
  ind?: number;
  bl?: string;
  br?: string;
  bt?: string;
  bb?: string;
}

export interface SheetCell {
  /** Index into `SheetLayout.styles`. */
  s: number;
  /** The text as Excel shows it; absent for a blank cell. */
  v?: string;
  /** A number, so "general" alignment puts it on the right. */
  n?: boolean;
}

export interface SheetImage {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetHeaderFooter {
  left: string;
  center: string;
  right: string;
}

/** An uploaded sheet, as data. Pixel sizes are at Excel's 100% zoom. */
export interface SheetLayout {
  version: number;
  sheet: string;
  /** e.g. 'A1:M30' — the print area. */
  range: string;
  cols: { w: number; hidden?: boolean }[];
  rows: { h: number; hidden?: boolean }[];
  styles: SheetStyle[];
  /** Every cell in range except those covered by a merge, keyed 'D10'. */
  cells: Record<string, SheetCell>;
  /** 'A1:M1' blocks; the first cell holds the content. */
  merges: string[];
  images: SheetImage[];
  header: SheetHeaderFooter;
  footer: SheetHeaderFooter;
  orientation: 'portrait' | 'landscape';
}

/**
 * The first five are typed in and stored per record. The rest are *bound* to
 * the record and only shown: its date, shift, remarks, and who submitted and
 * approved it (the Q.A Chemist / Q.A.M signatures on the paper form).
 */
export type CellFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'TIME'
  | 'DATE'
  | 'CHOICE'
  | 'RECORD_DATE'
  | 'SHIFT'
  | 'REMARKS'
  | 'SIGN_SUBMITTED'
  | 'SIGN_APPROVED';

export interface CellField {
  type: CellFieldType;
  /** What the cell is, e.g. 'Free Fatty Acids · Time 3'. */
  label?: string;
  /** NUMBER limits, as decimal strings. */
  min?: string | null;
  max?: string | null;
  /** CHOICE suggestions; free text is still allowed. */
  options?: string[];
  /** CHOICE values that meet the specification. */
  ok?: string[];
  /** The specification as printed on the sheet. */
  spec?: string;
}

export type CellFields = Record<string, CellField>;

/** What the import endpoint returns: nothing is saved until the designer saves. */
export interface SheetImportResult {
  sheets: string[];
  sheet: string;
  layout: SheetLayout;
  layout_token: string;
  cell_fields: CellFields;
  header: {
    document_code: string;
    title: string;
    organisation: string;
    revision_number: string;
    revision_date: string | null;
    classification: string;
  };
  source_file_name: string;
}
