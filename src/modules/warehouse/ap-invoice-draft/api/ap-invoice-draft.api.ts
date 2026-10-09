import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  APInvoiceDraftCheck,
  APInvoiceDraftDetail,
  APInvoiceDraftListItem,
  CreateAPInvoiceDraftPayload,
  GRPOAPStatusMap,
  OpenGRPO,
  ReviewCheckPayload,
} from '../types';

const ENDPOINTS = API_ENDPOINTS.AP_INVOICE_DRAFT;

/** Making an entry makes the SAP draft in the same request. */
const SAP_DRAFT_TIMEOUT_MS = 90_000;
/** OCR reads a page in about five seconds; a long PDF takes longer. */
const READ_INVOICE_TIMEOUT_MS = 120_000;

export const apInvoiceDraftApi = {
  async list(params?: {
    search?: string;
    all_companies?: boolean;
  }): Promise<APInvoiceDraftListItem[]> {
    const response = await apiClient.get<APInvoiceDraftListItem[]>(ENDPOINTS.LIST, { params });
    return response.data;
  },

  async get(id: number): Promise<APInvoiceDraftDetail> {
    const response = await apiClient.get<APInvoiceDraftDetail>(ENDPOINTS.BY_ID(id));
    return response.data;
  },

  async openGrpos(search?: string, docEntry?: number): Promise<OpenGRPO[]> {
    const response = await apiClient.get<OpenGRPO[]>(ENDPOINTS.GRPOS, {
      params: docEntry ? { doc_entry: docEntry } : search ? { search } : undefined,
      // The picker says "SAP is not answering" itself.
      suppressErrorToast: true,
    });
    return response.data;
  },

  /** Where these GRPOs' A/P invoices stand. Quiet on failure: the GRPO pages
   *  just leave the status out while SAP is not answering. */
  async grpoStatus(docEntries: number[]): Promise<GRPOAPStatusMap> {
    const response = await apiClient.get<GRPOAPStatusMap>(ENDPOINTS.GRPO_STATUS, {
      params: { doc_entries: docEntries.join(',') },
      suppressErrorToast: true,
    });
    return response.data;
  },

  async create(payload: CreateAPInvoiceDraftPayload): Promise<APInvoiceDraftDetail> {
    const form = new FormData();
    form.append('grpo_doc_entry', String(payload.grpo_doc_entry));
    form.append('invoice_file', payload.invoice_file);
    const response = await apiClient.post<APInvoiceDraftDetail>(ENDPOINTS.CREATE, form, {
      timeout: SAP_DRAFT_TIMEOUT_MS,
      // The dialog shows the refusal itself.
      suppressErrorToast: true,
    });
    return response.data;
  },

  async readInvoice(id: number): Promise<APInvoiceDraftDetail> {
    const response = await apiClient.post<APInvoiceDraftDetail>(ENDPOINTS.READ_INVOICE(id), null, {
      timeout: READ_INVOICE_TIMEOUT_MS,
    });
    return response.data;
  },

  async sendToSap(id: number): Promise<APInvoiceDraftDetail> {
    const response = await apiClient.post<APInvoiceDraftDetail>(ENDPOINTS.SEND_TO_SAP(id), null, {
      timeout: SAP_DRAFT_TIMEOUT_MS,
    });
    return response.data;
  },

  async recheck(id: number): Promise<APInvoiceDraftDetail> {
    const response = await apiClient.post<APInvoiceDraftDetail>(ENDPOINTS.RECHECK(id), null, {
      timeout: SAP_DRAFT_TIMEOUT_MS,
    });
    return response.data;
  },

  async reviewCheck(
    id: number,
    key: string,
    payload: ReviewCheckPayload,
  ): Promise<APInvoiceDraftCheck> {
    const response = await apiClient.post<APInvoiceDraftCheck>(
      ENDPOINTS.REVIEW_CHECK(id, key),
      payload,
    );
    return response.data;
  },
};
