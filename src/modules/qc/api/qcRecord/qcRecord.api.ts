import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateQCRecordRequest,
  ListQCRecordsParams,
  QCRecord,
  QCRecordListItem,
  RecordCellWrite,
  RecordTemplate,
  RecordTemplateListItem,
} from '../../types/qcRecord.types';

export const qcRecordApi = {
  // ---- forms (templates) ----

  async listTemplates(): Promise<RecordTemplateListItem[]> {
    const response = await apiClient.get<RecordTemplateListItem[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.RECORD_TEMPLATES,
    );
    return response.data;
  },

  async getTemplate(id: number): Promise<RecordTemplate> {
    const response = await apiClient.get<RecordTemplate>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.RECORD_TEMPLATE_BY_ID(id),
    );
    return response.data;
  },

  // ---- filled records ----

  async list(params: ListQCRecordsParams = {}): Promise<QCRecordListItem[]> {
    const response = await apiClient.get<QCRecordListItem[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORDS,
      { params },
    );
    return response.data;
  },

  async getById(id: number): Promise<QCRecord> {
    const response = await apiClient.get<QCRecord>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORD_BY_ID(id),
    );
    return response.data;
  },

  /** Open a sheet. Returns the existing one if that day is already open. */
  async create(data: CreateQCRecordRequest): Promise<QCRecord> {
    const response = await apiClient.post<QCRecord>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORDS,
      data,
    );
    return response.data;
  },

  /** Bulk-save cells. Time columns are created on demand by the backend. */
  async saveValues(id: number, cells: RecordCellWrite[]): Promise<QCRecord> {
    const response = await apiClient.post<QCRecord>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORD_VALUES(id),
      { cells },
    );
    return response.data;
  },

  async submit(id: number): Promise<QCRecord> {
    const response = await apiClient.post<QCRecord>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORD_SUBMIT(id),
    );
    return response.data;
  },

  async decide(
    id: number,
    decision: 'APPROVE' | 'REJECT',
    remarks = '',
  ): Promise<QCRecord> {
    const response = await apiClient.post<QCRecord>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORD_APPROVE(id),
      { decision, remarks },
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.QC_RECORD_BY_ID(id));
  },
};
