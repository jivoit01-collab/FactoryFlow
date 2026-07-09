import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  SafetyFine,
  SafetyFineFilters,
  SafetyFinePayload,
  SafetyFinePhoto,
  SafetyFinePhotoUploadPayload,
  SafetyFineSettlePayload,
  SafetyFineUpdatePayload,
  SafetyViolationType,
  SafetyViolationTypeFilters,
  SafetyViolationTypePayload,
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

export const safetyFineApi = {
  // ---- Violation type master ----

  async getViolationTypes(filters?: SafetyViolationTypeFilters): Promise<SafetyViolationType[]> {
    const response = await apiClient.get<SafetyViolationType[]>(EP.SAFETY_VIOLATION_TYPES, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createViolationType(payload: SafetyViolationTypePayload): Promise<SafetyViolationType> {
    const response = await apiClient.post<SafetyViolationType>(EP.SAFETY_VIOLATION_TYPES, payload);
    return response.data;
  },

  async updateViolationType(
    typeId: number,
    payload: Partial<SafetyViolationTypePayload>,
  ): Promise<SafetyViolationType> {
    const response = await apiClient.patch<SafetyViolationType>(
      EP.SAFETY_VIOLATION_TYPE_DETAIL(typeId),
      payload,
    );
    return response.data;
  },

  async deleteViolationType(typeId: number): Promise<void> {
    await apiClient.delete(EP.SAFETY_VIOLATION_TYPE_DETAIL(typeId));
  },

  // ---- Fines ----

  async getFines(filters?: SafetyFineFilters): Promise<SafetyFine[]> {
    const response = await apiClient.get<SafetyFine[]>(EP.SAFETY_FINES, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getFine(fineId: number): Promise<SafetyFine> {
    const response = await apiClient.get<SafetyFine>(EP.SAFETY_FINE_DETAIL(fineId));
    return response.data;
  },

  async createFine(payload: SafetyFinePayload): Promise<SafetyFine> {
    const response = await apiClient.post<SafetyFine>(EP.SAFETY_FINES, payload);
    return response.data;
  },

  async updateFine(fineId: number, payload: SafetyFineUpdatePayload): Promise<SafetyFine> {
    const response = await apiClient.patch<SafetyFine>(EP.SAFETY_FINE_DETAIL(fineId), payload);
    return response.data;
  },

  async deleteFine(fineId: number): Promise<void> {
    await apiClient.delete(EP.SAFETY_FINE_DETAIL(fineId));
  },

  // Mark a pending fine PAID or WAIVED (a waiver requires remarks).
  async settleFine(fineId: number, payload: SafetyFineSettlePayload): Promise<SafetyFine> {
    const response = await apiClient.post<SafetyFine>(EP.SAFETY_FINE_SETTLE(fineId), payload);
    return response.data;
  },

  // ---- Evidence photos ----

  async uploadPhoto(payload: SafetyFinePhotoUploadPayload): Promise<SafetyFinePhoto> {
    const formData = new FormData();
    formData.append('fine', String(payload.fine));
    formData.append('photo', payload.file);
    if (payload.caption?.trim()) formData.append('caption', payload.caption.trim());

    const response = await apiClient.post<SafetyFinePhoto>(EP.SAFETY_FINE_PHOTOS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(photoId: number): Promise<void> {
    await apiClient.delete(EP.SAFETY_FINE_PHOTO_DETAIL(photoId));
  },
};
