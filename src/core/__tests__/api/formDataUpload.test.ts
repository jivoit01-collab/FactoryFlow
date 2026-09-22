import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/client.ts — a FormData body must go up as multipart
//
// The instance defaults to application/json, and axios answers that
// by serialising a FormData body TO JSON: the files never leave the
// browser and DRF replies 415 'Unsupported media type "application/
// json" in request'. The request interceptor clears the header for
// FormData so the browser sets multipart with its own boundary.
// ═══════════════════════════════════════════════════════════════

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: {
    getAccessToken: vi.fn().mockResolvedValue('a-token'),
    getCurrentCompany: vi.fn().mockResolvedValue({ company_code: 'OIL' }),
    getUser: vi.fn().mockResolvedValue(null),
    updateCurrentCompany: vi.fn(),
    clearAuthData: vi.fn(),
  },
}));

vi.mock('@/core/auth/utils/tokenRefresh.util', () => ({
  refreshAccessToken: vi.fn(),
  shouldRefreshToken: vi.fn().mockResolvedValue(false),
}));

import { apiClient } from '@/core/api/client';

let sent: InternalAxiosRequestConfig | null = null;

beforeEach(() => {
  sent = null;
  apiClient.defaults.adapter = async (config) => {
    sent = config as InternalAxiosRequestConfig;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
});

describe('apiClient — file uploads', () => {
  it('sends a FormData body untouched, without the JSON content type', async () => {
    const form = new FormData();
    form.append('files', new File(['a bill'], 'bill.pdf', { type: 'application/pdf' }));

    await apiClient.post('/cash-book/entries/1/attachments/', form);

    expect(sent!.data).toBeInstanceOf(FormData);
    expect(sent!.headers.getContentType()).toBeFalsy();
  });

  it('clears the JSON content type even when the caller asked for multipart', async () => {
    // Browsers must add the boundary themselves, so a bare
    // 'multipart/form-data' is dropped here the same way.
    const form = new FormData();
    form.append('files', new File(['a bill'], 'bill.pdf', { type: 'application/pdf' }));

    await apiClient.post('/cash-book/entries/1/attachments/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    expect(sent!.data).toBeInstanceOf(FormData);
  });

  it('still sends a plain object as JSON', async () => {
    await apiClient.post('/cash-book/entries/', { amount: '500.00' });

    expect(sent!.headers.getContentType()).toContain('application/json');
    expect(sent!.data).toBe('{"amount":"500.00"}');
  });
});
