import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type ArtworkSubGroup = 'LABEL' | 'CARTON';
export type ArtworkStatus = 'CAPTURED' | 'PENDING';
export type ArtworkFileKind = 'pdf' | 'cdr';

/**
 * One row of the register: a SAP label or carton item, with the artwork on
 * file for it if there is any.
 *
 * A row with `status: 'PENDING'` has no record behind it at all — the fields
 * below `record_id` are empty, and the row exists so the gap is visible.
 */
export interface ArtworkItemRow {
  item_code: string;
  item_name: string;
  sub_group: ArtworkSubGroup | '';
  uom: string;
  /** False for a record whose item the SAP item master no longer returns. */
  in_sap: boolean;
  status: ArtworkStatus;
  record_id: number | null;
  document_number: string;
  revision_number: number | null;
  /** Revision zero-padded the way it is printed, e.g. '02'. */
  revision_label: string;
  revision_date: string | null;
  barcode: string;
  has_pdf: boolean;
  has_cdr: boolean;
  updated_at: string | null;
}

export interface ArtworkItemList {
  /**
   * False when SAP could not be reached. The captured artwork still comes
   * back; what is missing is every item that has none, so the page must say
   * the gaps are unknown rather than imply there are none.
   */
  sap_available: boolean;
  sap_error: string;
  summary: { total: number; captured: number; pending: number };
  rows: ArtworkItemRow[];
}

/** An artwork on file, in full. */
export interface ArtworkRecord {
  id: number;
  company_code: string;
  item_code: string;
  item_name: string;
  sub_group: ArtworkSubGroup;
  sub_group_label: string;
  document_number: string;
  revision_number: number;
  revision_label: string;
  revision_date: string;
  barcode: string;
  remarks: string;
  pdf_original_name: string;
  pdf_size: number | null;
  /** API path, permission-checked — never a raw media URL. */
  pdf_download_url: string | null;
  cdr_original_name: string;
  cdr_size: number | null;
  cdr_download_url: string | null;
  revision_count: number;
  /** Offered as the default when the revise dialog opens. */
  next_revision_number: number;
  is_active: boolean;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/** One superseded state, kept so an old artwork stays retrievable. */
export interface ArtworkRevision {
  id: number;
  document_number: string;
  revision_number: number;
  revision_label: string;
  revision_date: string;
  barcode: string;
  remarks: string;
  pdf_original_name: string;
  cdr_original_name: string;
  pdf_download_url: string | null;
  cdr_download_url: string | null;
  superseded_at: string;
  superseded_by_name: string | null;
}

export interface ArtworkOptions {
  sub_groups: { value: ArtworkSubGroup; label: string }[];
  statuses: { value: ArtworkStatus; label: string }[];
  max_pdf_bytes: number;
  max_cdr_bytes: number;
  accepted_pdf: string;
  accepted_cdr: string;
  /** Whether this user may capture and revise. Decided by the server. */
  can_manage: boolean;
}

export interface ArtworkItemListParams {
  subGroup?: ArtworkSubGroup;
  search?: string;
  status?: ArtworkStatus;
}

export interface CaptureArtworkPayload {
  item_code: string;
  document_number: string;
  revision_number: number;
  revision_date: string;
  barcode?: string;
  remarks?: string;
  pdf_file: File;
  cdr_file: File;
}

/** Everything optional: a mistyped barcode is as valid a change as a revision. */
export interface ReviseArtworkPayload {
  document_number?: string;
  revision_number?: number;
  revision_date?: string;
  barcode?: string;
  remarks?: string;
  pdf_file?: File | null;
  cdr_file?: File | null;
}

function toFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    form.append(key, value instanceof File ? value : String(value));
  }
  return form;
}

export const artworkApi = {
  /** Every label and carton item, captured or not. The page's main list. */
  async items(params?: ArtworkItemListParams): Promise<ArtworkItemList> {
    const { data } = await apiClient.get<ArtworkItemList>(API_ENDPOINTS.ARTWORK.ITEMS, {
      params: {
        ...(params?.subGroup ? { sub_group: params.subGroup } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    return data;
  },

  async options(): Promise<ArtworkOptions> {
    const { data } = await apiClient.get<ArtworkOptions>(API_ENDPOINTS.ARTWORK.OPTIONS);
    return data;
  },

  async detail(recordId: number): Promise<ArtworkRecord> {
    const { data } = await apiClient.get<ArtworkRecord>(
      API_ENDPOINTS.ARTWORK.RECORD_DETAIL(recordId),
    );
    return data;
  },

  async revisions(recordId: number): Promise<ArtworkRevision[]> {
    const { data } = await apiClient.get<ArtworkRevision[]>(
      API_ENDPOINTS.ARTWORK.RECORD_REVISIONS(recordId),
    );
    return data;
  },

  /** Files artwork for an item that has none. Both files are required. */
  async capture(payload: CaptureArtworkPayload): Promise<ArtworkRecord> {
    const { data } = await apiClient.post<ArtworkRecord>(
      API_ENDPOINTS.ARTWORK.RECORDS,
      toFormData(payload as unknown as Record<string, unknown>),
    );
    return data;
  },

  /** Changes an artwork, keeping what it replaces in the history. */
  async revise(recordId: number, payload: ReviseArtworkPayload): Promise<ArtworkRecord> {
    const { data } = await apiClient.patch<ArtworkRecord>(
      API_ENDPOINTS.ARTWORK.RECORD_DETAIL(recordId),
      toFormData(payload as unknown as Record<string, unknown>),
    );
    return data;
  },

  /** Retires by deactivating, so the artwork and its history survive. */
  async retire(recordId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ARTWORK.RECORD_DETAIL(recordId));
  },

  /**
   * Fetches one stored file as a blob.
   *
   * Downloaded through the API rather than linked to directly: the endpoint is
   * permission-checked, so the request has to carry the auth header, and a
   * plain `<a href>` would not. The caller is responsible for revoking the
   * object URL it is handed.
   */
  async file(recordId: number, kind: ArtworkFileKind): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      API_ENDPOINTS.ARTWORK.RECORD_DOWNLOAD(recordId, kind),
      { responseType: 'blob' },
    );
    return data;
  },

  async revisionFile(revisionId: number, kind: ArtworkFileKind): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      API_ENDPOINTS.ARTWORK.REVISION_DOWNLOAD(revisionId, kind),
      { responseType: 'blob' },
    );
    return data;
  },
};
