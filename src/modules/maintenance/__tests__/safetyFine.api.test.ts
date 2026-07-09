import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    MAINTENANCE: {
      SAFETY_VIOLATION_TYPES: '/maintenance/safety-violation-types/',
      SAFETY_VIOLATION_TYPE_DETAIL: (id: number) => `/maintenance/safety-violation-types/${id}/`,
      SAFETY_FINES: '/maintenance/safety-fines/',
      SAFETY_FINE_DETAIL: (id: number) => `/maintenance/safety-fines/${id}/`,
      SAFETY_FINE_SETTLE: (id: number) => `/maintenance/safety-fines/${id}/settle/`,
      SAFETY_FINE_PHOTOS: '/maintenance/safety-fine-photos/',
      SAFETY_FINE_PHOTO_DETAIL: (id: number) => `/maintenance/safety-fine-photos/${id}/`,
    },
  },
}));

import { apiClient } from '@/core/api';

import { safetyFineApi } from '../api/safetyFine.api';

const mockedApiClient = vi.mocked(apiClient);

describe('safetyFineApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops empty/ALL filter values when listing fines', async () => {
    await safetyFineApi.getFines({ search: '', status: 'ALL', violation_type: 3 });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/safety-fines/', {
      params: { violation_type: 3 },
    });
  });

  it('creates a fine at the collection endpoint', async () => {
    await safetyFineApi.createFine({ violation_type: 1, offender_name: 'Ramesh' });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/safety-fines/',
      expect.objectContaining({ offender_name: 'Ramesh' }),
    );
  });

  it('settles a fine as paid or waived', async () => {
    await safetyFineApi.settleFine(5, { status: 'PAID' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/safety-fines/5/settle/', {
      status: 'PAID',
    });

    await safetyFineApi.settleFine(5, { status: 'WAIVED', settlement_remarks: 'warned' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/safety-fines/5/settle/', {
      status: 'WAIVED',
      settlement_remarks: 'warned',
    });
  });

  it('creates violation types on the master endpoint', async () => {
    await safetyFineApi.createViolationType({ name: 'No Helmet', default_fine_amount: '500' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/safety-violation-types/', {
      name: 'No Helmet',
      default_fine_amount: '500',
    });
  });

  it('sends evidence photo uploads as multipart form data', async () => {
    const file = new File(['x'], 'evidence.jpg', { type: 'image/jpeg' });
    await safetyFineApi.uploadPhoto({ fine: 3, file, caption: 'No helmet' });

    const [url, body, config] = mockedApiClient.post.mock.calls.at(-1)!;
    expect(url).toBe('/maintenance/safety-fine-photos/');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('fine')).toBe('3');
    expect((body as FormData).get('caption')).toBe('No helmet');
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
});
