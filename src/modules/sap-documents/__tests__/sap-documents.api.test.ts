import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
  },
}));

import { attachmentErrorMessage, sapDocumentsApi } from '../api/sap-documents.api';

describe('sapDocumentsApi', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('reads the document types', async () => {
    get.mockResolvedValue({ data: [{ key: 'Invoices' }] });
    expect(await sapDocumentsApi.types()).toEqual([{ key: 'Invoices' }]);
    expect(get).toHaveBeenCalledWith('/sap-documents/types/');
  });

  it('lists one type without the filters left blank', async () => {
    get.mockResolvedValue({ data: { results: [], has_more: false } });
    await sapDocumentsApi.list('PurchaseInvoices', {
      number: '',
      partner: 'shiv',
      date_from: '2026-07-01',
      date_to: '',
      status: '',
      top: 20,
      skip: 40,
    });
    expect(get).toHaveBeenCalledWith('/sap-documents/documents/PurchaseInvoices/', {
      params: { partner: 'shiv', date_from: '2026-07-01', top: 20, skip: 40 },
    });
  });

  it('opens one document by type and entry', async () => {
    get.mockResolvedValue({ data: { kind: 'marketing' } });
    await sapDocumentsApi.detail('JournalEntries', 90001);
    expect(get).toHaveBeenCalledWith('/sap-documents/documents/JournalEntries/90001/');
  });

  it('reads payment drafts from their own endpoint', async () => {
    get.mockResolvedValue({ data: { kind: 'payment_draft' } });
    await sapDocumentsApi.paymentDraft(812);
    expect(get).toHaveBeenCalledWith('/sap-documents/payment-drafts/812/');
  });

  it('lists the files of one attachment entry', async () => {
    get.mockResolvedValue({ data: { abs_entry: 53121, lines: [{ line: 1, file_name: 'SN.jpeg' }] } });
    expect(await sapDocumentsApi.attachments(53121)).toEqual([{ line: 1, file_name: 'SN.jpeg' }]);
    expect(get).toHaveBeenCalledWith('/sap-documents/attachments/53121/');
  });

  it('downloads a file as a blob by entry and line, without the global toast', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    get.mockResolvedValue({ data: blob });
    expect(await sapDocumentsApi.downloadAttachment(53121, 2)).toBe(blob);
    expect(get).toHaveBeenCalledWith('/sap-documents/attachments/53121/2/download/', {
      responseType: 'blob',
      suppressErrorToast: true,
    });
  });
});

describe('attachmentErrorMessage', () => {
  it('reads the server detail out of a blob error body', async () => {
    const body = new Blob([JSON.stringify({ detail: 'The attachment file service has no copy of this file.' })]);
    expect(await attachmentErrorMessage({ response: { data: body } })).toBe(
      'The attachment file service has no copy of this file.',
    );
  });

  it('falls back when the body is not JSON', async () => {
    expect(await attachmentErrorMessage({ response: { data: new Blob(['<html>']) } })).toBe(
      'The attachment could not be opened.',
    );
    expect(await attachmentErrorMessage({ message: 'Network Error' })).toBe('Network Error');
  });
});
