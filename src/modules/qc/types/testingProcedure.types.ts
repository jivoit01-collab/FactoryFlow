/**
 * Controlled testing procedures (the QC "Documents" screen).
 *
 * Mirrors `quality_control.models.testing_procedure` on the backend. A
 * procedure is a document header plus ordered sections, each holding ordered
 * lines. A bullet, a numbered step and a two-column observation table row are
 * all the same `TestingProcedureLine` — `kind` says which, and
 * `interpretation` holds the second column when there is one.
 */

export type ProcedureType = 'INHOUSE' | 'STANDARD';

export type ProcedureStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ProcedureSectionKey =
  | 'SCOPE'
  | 'PRINCIPLE'
  | 'RESPONSIBILITY'
  | 'APPARATUS'
  | 'REAGENT'
  | 'SAMPLE_REQUIREMENT'
  | 'PROCEDURE'
  | 'OBSERVATION'
  | 'ACCEPTANCE_CRITERIA'
  | 'PRECAUTIONS'
  | 'SAFETY'
  | 'CALCULATION'
  | 'REFERENCE'
  | 'OTHER';

export type LineKind = 'BULLET' | 'STEP' | 'TABLE_ROW' | 'PARAGRAPH';

export interface TestingProcedureLine {
  id?: number;
  sequence: number;
  kind: LineKind;
  /** Step number or bullet as printed, e.g. '3'. */
  marker: string;
  /** The line, or the first column of a table row. */
  text: string;
  /** Second column of a table row. Blank for bullets and steps. */
  interpretation: string;
}

export interface TestingProcedureSection {
  id?: number;
  sequence: number;
  /** Number as printed, e.g. '7'. */
  section_number: string;
  section_key: ProcedureSectionKey;
  section_key_label?: string;
  title: string;
  body: string;
  lines: TestingProcedureLine[];
}

/** The full document, as returned by the detail endpoint and sent on save. */
export interface TestingProcedure {
  id: number;
  document_code: string;
  title: string;
  procedure_type: ProcedureType;
  procedure_type_label?: string;
  heading: string;
  organisation: string;
  revision_number: string;
  /** ISO date (YYYY-MM-DD) or null. */
  revision_date: string | null;
  total_pages: number | null;
  classification: string;
  status: ProcedureStatus;
  status_label?: string;
  /** As printed, e.g. '00/15-10-2023'. */
  revision_label?: string;
  source_text: string;
  notes: string;
  sections: TestingProcedureSection[];
  created_at: string;
  updated_at: string;
}

/** Slim row for the list screens — counts instead of the full body. */
export interface TestingProcedureListItem {
  id: number;
  document_code: string;
  title: string;
  procedure_type: ProcedureType;
  procedure_type_label: string;
  heading: string;
  organisation: string;
  revision_number: string;
  revision_date: string | null;
  revision_label: string;
  total_pages: number | null;
  classification: string;
  status: ProcedureStatus;
  status_label: string;
  section_count: number;
  line_count: number;
  created_at: string;
  updated_at: string;
}

/** The POST/PUT body. Everything the analyser produced, ready to store. */
export interface SaveTestingProcedureRequest {
  document_code: string;
  title: string;
  procedure_type: ProcedureType;
  heading: string;
  organisation: string;
  revision_number: string;
  revision_date: string | null;
  total_pages: number | null;
  classification: string;
  status: ProcedureStatus;
  source_text: string;
  notes: string;
  sections: TestingProcedureSection[];
}

export interface TestingProcedureCounts {
  total: number;
  inhouse: number;
  standard: number;
}

export interface ListTestingProceduresParams {
  procedure_type?: ProcedureType;
  status?: ProcedureStatus;
  search?: string;
}
