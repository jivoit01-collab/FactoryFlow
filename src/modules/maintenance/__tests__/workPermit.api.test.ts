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
      WORK_PERMITS: '/maintenance/work-permits/',
      WORK_PERMIT_DETAIL: (id: number) => `/maintenance/work-permits/${id}/`,
      WORK_PERMIT_SUBMIT: (id: number) => `/maintenance/work-permits/${id}/submit/`,
      WORK_PERMIT_APPROVE: (id: number) => `/maintenance/work-permits/${id}/approve/`,
      WORK_PERMIT_START: (id: number) => `/maintenance/work-permits/${id}/start/`,
      WORK_PERMIT_RENEW: (id: number) => `/maintenance/work-permits/${id}/renew/`,
      WORK_PERMIT_COMPLETE: (id: number) => `/maintenance/work-permits/${id}/complete/`,
      WORK_PERMIT_CLOSE: (id: number) => `/maintenance/work-permits/${id}/close/`,
      WORK_PERMIT_CANCEL: (id: number) => `/maintenance/work-permits/${id}/cancel/`,
      WORK_PERMIT_WORKERS: '/maintenance/work-permit-workers/',
      WORK_PERMIT_WORKER_DETAIL: (id: number) => `/maintenance/work-permit-workers/${id}/`,
      WORK_PERMIT_ATTACHMENTS: '/maintenance/work-permit-attachments/',
      WORK_PERMIT_ATTACHMENT_DETAIL: (id: number) =>
        `/maintenance/work-permit-attachments/${id}/`,
    },
  },
}));

import { apiClient } from '@/core/api';

import { workPermitApi } from '../api/workPermit.api';

const mockedApiClient = vi.mocked(apiClient);

describe('workPermitApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops empty/ALL filter values when listing permits', async () => {
    await workPermitApi.getPermits({ search: '', status: 'ALL', permit_type: 'HOT_WORK' });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/work-permits/', {
      params: { permit_type: 'HOT_WORK' },
    });
  });

  it('creates a permit at the collection endpoint', async () => {
    await workPermitApi.createPermit({
      permit_types: ['GENERAL'],
      valid_date: '2026-07-04',
      time_start: '09:00',
      time_end: '17:00',
      job_location: 'Plant 1',
      job_description: 'Weld a bracket',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/work-permits/',
      expect.objectContaining({ job_location: 'Plant 1' }),
    );
  });

  it('routes each workflow action to its endpoint', async () => {
    await workPermitApi.submitPermit(7);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/submit/');

    await workPermitApi.approvePermit(7, { remarks: 'ok' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/approve/', {
      remarks: 'ok',
    });

    await workPermitApi.startPermit(7);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/start/');

    await workPermitApi.renewPermit(7);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/renew/');

    await workPermitApi.completePermit(7, { completion_type: 'VERIFIED' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/complete/', {
      completion_type: 'VERIFIED',
    });

    await workPermitApi.closePermit(7);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-permits/7/close/');
  });

  it('sends attachment uploads as multipart form data', async () => {
    const file = new File(['x'], 'method.pdf', { type: 'application/pdf' });
    await workPermitApi.uploadAttachment({ permit: 3, file, title: 'Method statement' });

    const [url, body, config] = mockedApiClient.post.mock.calls.at(-1)!;
    expect(url).toBe('/maintenance/work-permit-attachments/');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('permit')).toBe('3');
    expect((body as FormData).get('title')).toBe('Method statement');
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
});
