/**
 * The QC PDF library — a controlled document kept as its original file.
 *
 * Mirrors `quality_control.models.qc_document_file`. Three identifiers the
 * user types (document code, title, revision) plus the PDF itself, which is
 * shown back exactly as uploaded.
 */

export interface QCDocumentFile {
  id: number;
  document_code: string;
  title: string;
  revision: string;
  /** Absolute URL of the stored PDF, ready to load in a viewer. */
  url: string | null;
  original_name: string;
  content_type: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Multipart upload: the three fields plus the file. */
export interface UploadQCDocumentFileRequest {
  document_code: string;
  title: string;
  revision: string;
  file: File;
}

/** Only the three identifiers are editable; the PDF is never swapped. */
export interface UpdateQCDocumentFileRequest {
  document_code?: string;
  title?: string;
  revision?: string;
}
