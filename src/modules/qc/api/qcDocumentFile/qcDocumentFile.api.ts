import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  QCDocumentFile,
  UpdateQCDocumentFileRequest,
  UploadQCDocumentFileRequest,
} from '../../types/qcDocumentFile.types';

export const qcDocumentFileApi = {
  async list(search = ''): Promise<QCDocumentFile[]> {
    const response = await apiClient.get<QCDocumentFile[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILES,
      { params: search ? { search } : {} },
    );
    return response.data;
  },

  async getById(id: number): Promise<QCDocumentFile> {
    const response = await apiClient.get<QCDocumentFile>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_BY_ID(id),
    );
    return response.data;
  },

  /** Upload the PDF with its three identifiers. */
  async upload(data: UploadQCDocumentFileRequest): Promise<QCDocumentFile> {
    const form = new FormData();
    form.append('document_code', data.document_code);
    form.append('title', data.title);
    form.append('revision', data.revision);
    form.append('file', data.file);

    // The shared client defaults every request to application/json, which
    // would send the body without a multipart boundary. Overriding here is the
    // same approach the ETP and gate uploads use.
    const response = await apiClient.post<QCDocumentFile>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILES,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async update(id: number, data: UpdateQCDocumentFileRequest): Promise<QCDocumentFile> {
    const response = await apiClient.put<QCDocumentFile>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_BY_ID(id),
      data,
    );
    return response.data;
  },

  /**
   * Fetch the PDF bytes through the authenticated API.
   *
   * The viewer renders these from a blob rather than pointing an iframe at the
   * media URL: that URL is unauthenticated, and every Django response carries
   * `X-Frame-Options: DENY`, which stops a frame rendering it at all.
   */
  async download(id: number): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_DOWNLOAD(id),
      { responseType: 'blob' },
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.QC_DOCUMENT_FILE_BY_ID(id));
  },
};
