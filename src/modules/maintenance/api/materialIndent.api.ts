import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  MaterialIndent,
  MaterialIndentAttachment,
  MaterialIndentAttachmentUploadPayload,
  MaterialIndentDecisionPayload,
  MaterialIndentFilters,
  MaterialIndentGateInPayload,
  MaterialIndentPayload,
  MaterialIndentPurchasePayload,
  MaterialIndentQuotation,
  MaterialIndentQuotationPayload,
  MaterialIndentQuotationReturnPayload,
  MaterialIndentQuotationSelectPayload,
  MaterialIndentQuotationUpdatePayload,
  MaterialIndentReceivePayload,
  MaterialIndentReviewPayload,
  MaterialIndentUpdatePayload,
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

export const materialIndentApi = {
  async getIndents(filters?: MaterialIndentFilters): Promise<MaterialIndent[]> {
    const response = await apiClient.get<MaterialIndent[]>(EP.MATERIAL_INDENTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.get<MaterialIndent>(EP.MATERIAL_INDENT_DETAIL(indentId));
    return response.data;
  },

  async createIndent(payload: MaterialIndentPayload): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENTS, payload);
    return response.data;
  },

  async updateIndent(
    indentId: number,
    payload: MaterialIndentUpdatePayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.patch<MaterialIndent>(
      EP.MATERIAL_INDENT_DETAIL(indentId),
      payload,
    );
    return response.data;
  },

  async deleteIndent(indentId: number): Promise<void> {
    await apiClient.delete(EP.MATERIAL_INDENT_DETAIL(indentId));
  },

  // ---- Workflow (each stamps user + timestamp server-side) ----

  // Requester → Store Engineer.
  async submitIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENT_SUBMIT(indentId));
    return response.data;
  },

  // Store engineer records issued qty per item; shortfall goes for purchase approval.
  async reviewIndent(
    indentId: number,
    payload: MaterialIndentReviewPayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_REVIEW(indentId),
      payload,
    );
    return response.data;
  },

  // Higher authority approves the purchase of the shortfall.
  async approveIndent(
    indentId: number,
    payload: MaterialIndentDecisionPayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_APPROVE(indentId),
      payload,
    );
    return response.data;
  },

  // Purchaser marks the approved shortfall as purchased.
  async purchaseIndent(
    indentId: number,
    payload: MaterialIndentPurchasePayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_PURCHASE(indentId),
      payload,
    );
    return response.data;
  },

  // ---- Quotation round ----

  async getQuotations(indentId: number): Promise<MaterialIndentQuotation[]> {
    const response = await apiClient.get<MaterialIndentQuotation[]>(
      EP.MATERIAL_INDENT_QUOTATIONS,
      { params: { indent: indentId } },
    );
    return response.data;
  },

  async createQuotation(payload: MaterialIndentQuotationPayload): Promise<MaterialIndentQuotation> {
    const response = await apiClient.post<MaterialIndentQuotation>(
      EP.MATERIAL_INDENT_QUOTATIONS,
      payload,
    );
    return response.data;
  },

  async updateQuotation(
    quotationId: number,
    payload: MaterialIndentQuotationUpdatePayload,
  ): Promise<MaterialIndentQuotation> {
    const response = await apiClient.patch<MaterialIndentQuotation>(
      EP.MATERIAL_INDENT_QUOTATION_DETAIL(quotationId),
      payload,
    );
    return response.data;
  },

  async deleteQuotation(quotationId: number): Promise<void> {
    await apiClient.delete(EP.MATERIAL_INDENT_QUOTATION_DETAIL(quotationId));
  },

  // Purchaser sends the collected quotations back for company selection.
  async submitQuotations(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_SUBMIT_QUOTATIONS(indentId),
    );
    return response.data;
  },

  // Higher authority picks the company to buy from.
  async selectQuotation(
    indentId: number,
    payload: MaterialIndentQuotationSelectPayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_SELECT_QUOTATION(indentId),
      payload,
    );
    return response.data;
  },

  // Higher authority sends the quotes back for more / better prices.
  async returnQuotations(
    indentId: number,
    payload: MaterialIndentQuotationReturnPayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_RETURN_QUOTATIONS(indentId),
      payload,
    );
    return response.data;
  },

  // Gate records vehicle when the purchased goods arrive.
  async gateInIndent(
    indentId: number,
    payload: MaterialIndentGateInPayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_GATE_IN(indentId),
      payload,
    );
    return response.data;
  },

  // Store collects the arrival into Store/Spares stock.
  async receiveIndent(
    indentId: number,
    payload: MaterialIndentReceivePayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_RECEIVE(indentId),
      payload,
    );
    return response.data;
  },

  // ---- Invoice / bill attachments ----

  async uploadAttachment(
    payload: MaterialIndentAttachmentUploadPayload,
  ): Promise<MaterialIndentAttachment> {
    const formData = new FormData();
    formData.append('indent', String(payload.indent));
    formData.append('file', payload.file);
    if (payload.quotation) formData.append('quotation', String(payload.quotation));
    formData.append('doc_type', payload.doc_type ?? 'INVOICE');
    if (payload.title?.trim()) formData.append('title', payload.title.trim());

    const response = await apiClient.post<MaterialIndentAttachment>(
      EP.MATERIAL_INDENT_ATTACHMENTS,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(EP.MATERIAL_INDENT_ATTACHMENT_DETAIL(attachmentId));
  },

  async rejectIndent(
    indentId: number,
    payload: MaterialIndentDecisionPayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_REJECT(indentId),
      payload,
    );
    return response.data;
  },

  async cancelIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENT_CANCEL(indentId));
    return response.data;
  },
};
