import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    QUALITY_CONTROL_V2: {
      MATERIAL_TYPE_PARAMETERS: (id: number) => `/api/v2/qc/material-types/${id}/parameters/`,
      QC_PARAMETER_BY_ID: (id: number) => `/api/v2/qc/parameters/${id}/`,
    },
  },
}));

import { qcParameterApi } from '../../../api/qcParameter/qcParameter.api';

// ═══════════════════════════════════════════════════════════════
// qcParameterApi
// ═══════════════════════════════════════════════════════════════

describe('qcParameterApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [{ id: 1, parameter_name: 'pH' }] });
    mockPost.mockResolvedValue({ data: { id: 2, parameter_name: 'New' } });
    mockPut.mockResolvedValue({ data: { id: 1, parameter_name: 'Updated' } });
    mockDelete.mockResolvedValue({});
  });

  it('is defined as an object', () => {
    expect(qcParameterApi).toBeDefined();
    expect(typeof qcParameterApi).toBe('object');
  });

  // ─── getByMaterialType ────────────────────────────────────────

  it('getByMaterialType calls apiClient.get with materialTypeId in endpoint', async () => {
    await qcParameterApi.getByMaterialType(3);
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/material-types/3/parameters/');
  });

  it('getByMaterialType returns response.data', async () => {
    const result = await qcParameterApi.getByMaterialType(3);
    expect(result).toEqual([{ id: 1, parameter_name: 'pH' }]);
  });

  // ─── getById ──────────────────────────────────────────────────

  it('getById calls apiClient.get with parameter id', async () => {
    mockGet.mockResolvedValue({ data: { id: 7, parameter_name: 'Viscosity' } });
    await qcParameterApi.getById(7);
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/parameters/7/');
  });

  // ─── create ───────────────────────────────────────────────────

  it('create calls apiClient.post with materialTypeId and data', async () => {
    const data = {
      parameter_code: 'PH',
      parameter_name: 'pH',
      standard_value: '7',
      parameter_type: 'NUMERIC' as const,
      uom: 'pH',
      sequence: 1,
      is_mandatory: true,
    };
    await qcParameterApi.create(3, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/material-types/3/parameters/', data);
  });

  // ─── update ───────────────────────────────────────────────────

  it('update calls apiClient.put with id and data', async () => {
    const data = {
      parameter_code: 'PH',
      parameter_name: 'pH Updated',
      standard_value: '7',
      parameter_type: 'NUMERIC' as const,
      uom: 'pH',
      sequence: 1,
      is_mandatory: true,
    };
    await qcParameterApi.update(1, data);
    expect(mockPut).toHaveBeenCalledWith('/api/v2/qc/parameters/1/', data);
  });

  // ─── delete ───────────────────────────────────────────────────

  it('delete calls apiClient.delete with id endpoint', async () => {
    await qcParameterApi.delete(1);
    expect(mockDelete).toHaveBeenCalledWith('/api/v2/qc/parameters/1/');
  });

  // ─── Error propagation ───────────────────────────────────────

  it('propagates errors from API calls', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    await expect(qcParameterApi.getByMaterialType(1)).rejects.toThrow('Server error');
  });
});
