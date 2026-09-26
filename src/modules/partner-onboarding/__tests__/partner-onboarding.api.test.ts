import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ data: {} });
const patch = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

import {
  partnerLookupsApi,
  partnerOnboardingApi,
  publicRegistrationApi,
} from '../api/partner-onboarding.api';

describe('partnerOnboardingApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockClear();
    patch.mockClear();
  });

  it('lists one kind with only the filters that were set', async () => {
    get.mockResolvedValue({ data: { count: 0, counts: {}, results: [] } });
    await partnerOnboardingApi.list('vendor', { status: '', search: 'acme', limit: 200 });
    expect(get).toHaveBeenCalledWith('/partner-onboarding/vendors/', {
      params: { search: 'acme', limit: 200 },
    });
  });

  it('reads, edits, verifies and rejects at the kind’s own paths', async () => {
    get.mockResolvedValue({ data: {} });
    await partnerOnboardingApi.detail('customer', 7);
    expect(get).toHaveBeenCalledWith('/partner-onboarding/customers/7/');
    await partnerOnboardingApi.update('customer', 7, { industry: 'RETAIL' });
    expect(patch).toHaveBeenCalledWith(
      '/partner-onboarding/customers/7/',
      { industry: 'RETAIL' },
      { suppressErrorToast: true },
    );
    await partnerOnboardingApi.verify('customer', 7, 'ok');
    expect(post).toHaveBeenCalledWith('/partner-onboarding/customers/7/verify/', { note: 'ok' });
    await partnerOnboardingApi.reject('vendor', 3, 'wrong GSTIN');
    expect(post).toHaveBeenCalledWith('/partner-onboarding/vendors/3/reject/', {
      reason: 'wrong GSTIN',
    });
  });

  it('creates in SAP with a long timeout and leaves the 409 to the page', async () => {
    await partnerOnboardingApi.approve('vendor', 3, {
      confirm_duplicate: true,
      bank_accounts: [{ id: 1, sap_bank_code: 'TST' }],
    });
    const [url, body, config] = post.mock.calls.at(-1)!;
    expect(url).toBe('/partner-onboarding/vendors/3/approve/');
    expect(body).toEqual({
      confirm_duplicate: true,
      bank_accounts: [{ id: 1, sap_bank_code: 'TST' }],
    });
    expect(config.suppressErrorToast).toBe(true);
    expect(config.timeout).toBeGreaterThanOrEqual(120_000);
  });

  it('downloads a document as a blob through the API, not a media link', async () => {
    get.mockResolvedValue({ data: new Blob(['x']) });
    await partnerOnboardingApi.document('customer', 7, 9);
    expect(get).toHaveBeenCalledWith('/partner-onboarding/customers/7/attachments/9/', {
      responseType: 'blob',
    });
  });
});

describe('partnerLookupsApi', () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: [] }));

  it('reads the registration’s own company, whatever company the screen is in', async () => {
    await partnerLookupsApi.bpGroups('JIVO_MART', 'vendor');
    expect(get).toHaveBeenCalledWith('/sap-lookups/bp-groups/', {
      headers: { 'Company-Code': 'JIVO_MART' },
      params: { type: 'S' },
    });
    await partnerLookupsApi.controlAccounts('JIVO_OIL', 'customer');
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/ar-accounts/', {
      headers: { 'Company-Code': 'JIVO_OIL' },
    });
    await partnerLookupsApi.controlAccounts('JIVO_OIL', 'vendor');
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/ap-accounts/', {
      headers: { 'Company-Code': 'JIVO_OIL' },
    });
    await partnerLookupsApi.banks('JIVO_BEVERAGES');
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/banks/', {
      headers: { 'Company-Code': 'JIVO_BEVERAGES' },
    });
  });
});

describe('publicRegistrationApi', () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: [] }));

  it('reads the company list and a company’s states without a toast', async () => {
    await publicRegistrationApi.companies();
    expect(get).toHaveBeenCalledWith('/partner-onboarding/public/companies/', {
      suppressErrorToast: true,
    });
    await publicRegistrationApi.states('JIVO_OIL');
    expect(get).toHaveBeenLastCalledWith('/partner-onboarding/public/states/', {
      params: { company: 'JIVO_OIL' },
      suppressErrorToast: true,
    });
  });

  it('posts a registration as multipart to the kind’s public path', async () => {
    const form = new FormData();
    await publicRegistrationApi.submit('customer', form);
    expect(post.mock.calls.at(-1)?.[0]).toBe('/partner-onboarding/public/customers/');
    expect(post.mock.calls.at(-1)?.[1]).toBe(form);
    await publicRegistrationApi.submit('vendor', form);
    expect(post.mock.calls.at(-1)?.[0]).toBe('/partner-onboarding/public/vendors/');
    expect(post.mock.calls.at(-1)?.[2]).toMatchObject({ suppressErrorToast: true });
  });
});
