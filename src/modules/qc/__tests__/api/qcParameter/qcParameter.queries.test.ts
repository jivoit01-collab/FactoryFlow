import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockUseQuery = vi.fn(() => ({ data: undefined, isLoading: false }));
const mockUseMutation = vi.fn(() => ({ mutate: vi.fn(), isPending: false }));
const mockInvalidateQueries = vi.fn();
const mockUseQueryClient = vi.fn(() => ({ invalidateQueries: mockInvalidateQueries }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock('../../../api/qcParameter/qcParameter.api', () => ({
  qcParameterApi: {
    getByMaterialType: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  QC_PARAMETER_QUERY_KEYS,
  useQCParametersByMaterialType,
  useQCParameter,
  useCreateQCParameter,
  useUpdateQCParameter,
  useDeleteQCParameter,
} from '../../../api/qcParameter/qcParameter.queries';

// ═══════════════════════════════════════════════════════════════
// QC_PARAMETER_QUERY_KEYS
// ═══════════════════════════════════════════════════════════════

describe('QC_PARAMETER_QUERY_KEYS', () => {
  it('has all key as [qcParameters]', () => {
    expect(QC_PARAMETER_QUERY_KEYS.all).toEqual(['qcParameters']);
  });

  it('byMaterialType key includes materialTypeId', () => {
    const key = QC_PARAMETER_QUERY_KEYS.byMaterialType(3);
    expect(key).toEqual(['qcParameters', 'byMaterialType', 3]);
  });

  it('detail key includes id', () => {
    const key = QC_PARAMETER_QUERY_KEYS.detail(7);
    expect(key).toEqual(['qcParameters', 'detail', 7]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════════════════════════

describe('useQCParametersByMaterialType', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls useQuery', () => {
    useQCParametersByMaterialType(1);
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('passes enabled: false when materialTypeId is null', () => {
    useQCParametersByMaterialType(null);
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.enabled).toBe(false);
  });
});

describe('useQCParameter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes enabled: false when id is null', () => {
    useQCParameter(null);
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.enabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════════

describe('useCreateQCParameter', () => {
  it('calls useMutation', () => {
    useCreateQCParameter();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useUpdateQCParameter', () => {
  it('calls useMutation', () => {
    useUpdateQCParameter();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useDeleteQCParameter', () => {
  it('calls useMutation', () => {
    useDeleteQCParameter();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});
