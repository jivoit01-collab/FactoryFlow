import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  FireReportReviewPayload,
  FireShiftReport,
  FireShiftReportAttachment,
  FireShiftReportAttachmentUploadPayload,
  FireShiftReportFilters,
  FireShiftReportItem,
  FireShiftReportItemPayload,
  FireShiftReportPayload,
  FireShiftReportPhoto,
  FireShiftReportPhotoUploadPayload,
  FireShiftReportUpdatePayload,
} from '../types';

const EP = API_ENDPOINTS.MAINTENANCE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

export const fireReportApi = {
  async getReports(filters?: FireShiftReportFilters): Promise<FireShiftReport[]> {
    const response = await apiClient.get<FireShiftReport[]>(EP.FIRE_REPORTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getReport(reportId: number): Promise<FireShiftReport> {
    const response = await apiClient.get<FireShiftReport>(EP.FIRE_REPORT_DETAIL(reportId));
    return response.data;
  },

  async createReport(payload: FireShiftReportPayload): Promise<FireShiftReport> {
    const response = await apiClient.post<FireShiftReport>(EP.FIRE_REPORTS, payload);
    return response.data;
  },

  async updateReport(
    reportId: number,
    payload: FireShiftReportUpdatePayload,
  ): Promise<FireShiftReport> {
    const response = await apiClient.patch<FireShiftReport>(EP.FIRE_REPORT_DETAIL(reportId), payload);
    return response.data;
  },

  async deleteReport(reportId: number): Promise<void> {
    await apiClient.delete(EP.FIRE_REPORT_DETAIL(reportId));
  },

  async reviewReport(
    reportId: number,
    payload: FireReportReviewPayload,
  ): Promise<FireShiftReport> {
    const response = await apiClient.post<FireShiftReport>(EP.FIRE_REPORT_REVIEW(reportId), payload);
    return response.data;
  },

  async createItem(payload: FireShiftReportItemPayload): Promise<FireShiftReportItem> {
    const response = await apiClient.post<FireShiftReportItem>(EP.FIRE_REPORT_ITEMS, payload);
    return response.data;
  },

  async updateItem(
    itemId: number,
    payload: Partial<FireShiftReportItemPayload>,
  ): Promise<FireShiftReportItem> {
    const response = await apiClient.patch<FireShiftReportItem>(
      EP.FIRE_REPORT_ITEM_DETAIL(itemId),
      payload,
    );
    return response.data;
  },

  async deleteItem(itemId: number): Promise<void> {
    await apiClient.delete(EP.FIRE_REPORT_ITEM_DETAIL(itemId));
  },

  async uploadPhoto(payload: FireShiftReportPhotoUploadPayload): Promise<FireShiftReportPhoto> {
    const formData = new FormData();
    formData.append('item', String(payload.item));
    formData.append('photo', payload.file);
    if (payload.caption?.trim()) formData.append('caption', payload.caption.trim());
    if (payload.taken_on) formData.append('taken_on', payload.taken_on);

    const response = await apiClient.post<FireShiftReportPhoto>(EP.FIRE_REPORT_PHOTOS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(photoId: number): Promise<void> {
    await apiClient.delete(EP.FIRE_REPORT_PHOTO_DETAIL(photoId));
  },

  async uploadAttachment(
    payload: FireShiftReportAttachmentUploadPayload,
  ): Promise<FireShiftReportAttachment> {
    const formData = new FormData();
    formData.append('report', String(payload.report));
    formData.append('file', payload.file);
    if (payload.title?.trim()) formData.append('title', payload.title.trim());

    const response = await apiClient.post<FireShiftReportAttachment>(
      EP.FIRE_REPORT_ATTACHMENTS,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(EP.FIRE_REPORT_ATTACHMENT_DETAIL(attachmentId));
  },
};
