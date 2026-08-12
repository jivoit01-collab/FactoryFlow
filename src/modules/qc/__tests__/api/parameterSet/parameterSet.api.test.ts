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
      MATERIAL_TYPE_PARAMETER_SETS: (id: number) =>
        `/api/v2/qc/material-types/${id}/parameter-sets/`,
      PARAMETER_SET_BY_ID: (id: number) => `/api/v2/qc/parameter-sets/${id}/`,
      PARAMETER_SET_COPY_PARAMETERS: (id: number) =>
        `/api/v2/qc/parameter-sets/${id}/copy-parameters/`,
    },
  },
}));

import { parameterSetApi } from '../../../api/parameterSet/parameterSet.api';

// ═══════════════════════════════════════════════════════════════
// parameterSetApi
// ═══════════════════════════════════════════════════════════════

describe('parameterSetApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      data: [{ id: 1, vendor_code: '', label: 'Default (all vendors)', is_default: true }],
    });
    mockPost.mockResolvedValue({ data: { id: 2, vendor_code: 'V001' } });
    mockPut.mockResolvedValue({ data: { id: 2, vendor_code: 'V001' } });
    mockDelete.mockResolvedValue({});
  });

  it('getByMaterialType lists every set of a material type', async () => {
    const result = await parameterSetApi.getByMaterialType(3);
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/material-types/3/parameter-sets/');
    expect(result[0].is_default).toBe(true);
  });

  it('create posts the vendor and the set to seed from', async () => {
    const data = { vendor_code: 'V001', vendor_name: 'Supplier A', copy_parameters_from_set_id: 1 };
    await parameterSetApi.create(3, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/material-types/3/parameter-sets/', data);
  });

  it('update puts to the set endpoint', async () => {
    await parameterSetApi.update(2, { vendor_code: 'V001', vendor_name: 'Supplier A Ltd' });
    expect(mockPut).toHaveBeenCalledWith('/api/v2/qc/parameter-sets/2/', {
      vendor_code: 'V001',
      vendor_name: 'Supplier A Ltd',
    });
  });

  it('delete removes one vendor set', async () => {
    await parameterSetApi.delete(2);
    expect(mockDelete).toHaveBeenCalledWith('/api/v2/qc/parameter-sets/2/');
  });

  it('copyParameters posts the source set to the target set', async () => {
    mockPost.mockResolvedValue({ data: { copied: 5, updated: 0 } });
    const result = await parameterSetApi.copyParameters(2, { source_parameter_set_id: 1 });
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/parameter-sets/2/copy-parameters/', {
      source_parameter_set_id: 1,
    });
    expect(result.copied).toBe(5);
  });

  it('propagates errors from API calls', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    await expect(parameterSetApi.getByMaterialType(1)).rejects.toThrow('Server error');
  });
});
