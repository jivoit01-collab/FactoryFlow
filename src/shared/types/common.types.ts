export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface TableState extends PaginationState, SortState {
  search?: string;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
}

/**
 * Controlled-document identity assigned by the backend document-numbering
 * service (Jivo "Document Management Procedure", DOC-SOP-04-02-00-01).
 *
 * Every uploaded PDF in GATE / QC / GRPO carries these. They are read-only and
 * may be empty strings on legacy records created before numbering existed.
 */
export interface ControlledDocumentFields {
  /** e.g. "STR-FRM-08-05-00-01" */
  document_code?: string;
  /** Revision, zero-padded to two digits, e.g. "00". */
  document_revision?: string;
  /** Issue / revision date as DD-MM-YYYY. */
  document_issue_date?: string;
}
