import { apiClient } from '@/core/api';

import type {
  CustomsRates,
  Licence,
  LicenceCreatePayload,
  LicenceDetail,
  LicenceKind,
  LicencePayload,
  LicenceStatus,
  LineCreatePayload,
  LinePayload,
} from '../types';

/**
 * The module's endpoints, kept here rather than in the shared
 * `API_ENDPOINTS`: nothing outside Import / Export calls them.
 */
export const EXIM_ENDPOINTS = {
  LICENCES: '/exim/licences/',
  LICENCE: (id: number) => `/exim/licences/${id}/`,
  LICENCE_LINES: (id: number) => `/exim/licences/${id}/lines/`,
  LICENCE_LINE: (lineId: number) => `/exim/licence-lines/${lineId}/`,
  CUSTOMS_RATES: '/exim/customs-rates/',
} as const;

/**
 * Writes opt out of the global error toast: they are made from a dialog, which
 * shows the server's reason beside the fields instead.
 */
const QUIET = { suppressErrorToast: true };

export const eximApi = {
  async listLicences(kind: LicenceKind, status?: LicenceStatus): Promise<Licence[]> {
    return (
      await apiClient.get<Licence[]>(EXIM_ENDPOINTS.LICENCES, {
        params: status ? { kind, status } : { kind },
      })
    ).data;
  },

  async getLicence(id: number): Promise<LicenceDetail> {
    return (await apiClient.get<LicenceDetail>(EXIM_ENDPOINTS.LICENCE(id))).data;
  },

  async createLicence(payload: LicenceCreatePayload): Promise<LicenceDetail> {
    return (await apiClient.post<LicenceDetail>(EXIM_ENDPOINTS.LICENCES, payload, QUIET)).data;
  },

  async updateLicence(id: number, payload: Partial<LicencePayload>): Promise<LicenceDetail> {
    return (await apiClient.patch<LicenceDetail>(EXIM_ENDPOINTS.LICENCE(id), payload, QUIET)).data;
  },

  async deleteLicence(id: number): Promise<void> {
    await apiClient.delete(EXIM_ENDPOINTS.LICENCE(id));
  },

  async addLine(licenceId: number, payload: LineCreatePayload): Promise<LicenceDetail> {
    return (
      await apiClient.post<LicenceDetail>(EXIM_ENDPOINTS.LICENCE_LINES(licenceId), payload, QUIET)
    ).data;
  },

  async updateLine(lineId: number, payload: Partial<LinePayload>): Promise<LicenceDetail> {
    return (
      await apiClient.patch<LicenceDetail>(EXIM_ENDPOINTS.LICENCE_LINE(lineId), payload, QUIET)
    ).data;
  },

  async deleteLine(lineId: number): Promise<LicenceDetail> {
    return (await apiClient.delete<LicenceDetail>(EXIM_ENDPOINTS.LICENCE_LINE(lineId))).data;
  },

  async getCustomsRates(refresh = false): Promise<CustomsRates> {
    return (
      await apiClient.get<CustomsRates>(EXIM_ENDPOINTS.CUSTOMS_RATES, {
        params: refresh ? { refresh: 1 } : undefined,
      })
    ).data;
  },
};
