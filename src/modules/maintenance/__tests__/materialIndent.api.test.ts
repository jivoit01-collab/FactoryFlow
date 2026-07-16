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
      MATERIAL_INDENTS: '/maintenance/material-indents/',
      MATERIAL_INDENT_DETAIL: (id: number) => `/maintenance/material-indents/${id}/`,
      MATERIAL_INDENT_SUBMIT: (id: number) => `/maintenance/material-indents/${id}/submit/`,
      MATERIAL_INDENT_APPROVE: (id: number) => `/maintenance/material-indents/${id}/approve/`,
      MATERIAL_INDENT_REJECT: (id: number) => `/maintenance/material-indents/${id}/reject/`,
      MATERIAL_INDENT_CANCEL: (id: number) => `/maintenance/material-indents/${id}/cancel/`,
    },
  },
}));

import { apiClient } from '@/core/api';

import { materialIndentApi } from '../api/materialIndent.api';

const mockedApiClient = vi.mocked(apiClient);

describe('materialIndentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops empty/ALL filter values when listing', async () => {
    await materialIndentApi.getIndents({ search: '', status: 'ALL', department: 3 });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/material-indents/', {
      params: { department: 3 },
    });
  });

  it('creates an indent at the collection endpoint', async () => {
    await materialIndentApi.createIndent({
      indent_date: '2026-07-09',
      purpose: 'Stationery',
      items_input: [{ particulars: 'A4 Paper box', quantity: '30' }],
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/material-indents/',
      expect.objectContaining({ purpose: 'Stationery' }),
    );
  });

  it('routes each workflow action to its endpoint', async () => {
    await materialIndentApi.submitIndent(4);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/material-indents/4/submit/');

    await materialIndentApi.approveIndent(4, { decision_remarks: 'ok' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/material-indents/4/approve/', {
      decision_remarks: 'ok',
    });

    await materialIndentApi.rejectIndent(4, { decision_remarks: 'no' });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/material-indents/4/reject/', {
      decision_remarks: 'no',
    });

    await materialIndentApi.cancelIndent(4);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/material-indents/4/cancel/');
  });
});
