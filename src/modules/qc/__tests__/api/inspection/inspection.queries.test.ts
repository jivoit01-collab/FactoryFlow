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

vi.mock('../../../api/inspection/inspection.api', () => ({
  inspectionApi: {
    getPendingList: vi.fn(),
    getById: vi.fn(),
    getForSlip: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateParameters: vi.fn(),
    submit: vi.fn(),
    approveAsChemist: vi.fn(),
    approveAsQAM: vi.fn(),
    reject: vi.fn(),
  },
}));

import {
  INSPECTION_QUERY_KEYS,
  usePendingInspections,
  useInspection,
  useInspectionForSlip,
  useCreateInspection,
  useUpdateInspection,
  useUpdateParameterResults,
  useSubmitInspection,
  useApproveAsChemist,
  useApproveAsQAM,
  useRejectInspection,
} from '../../../api/inspection/inspection.queries';

// ═══════════════════════════════════════════════════════════════
// INSPECTION_QUERY_KEYS
// ═══════════════════════════════════════════════════════════════

describe('INSPECTION_QUERY_KEYS', () => {
  it('has all key as [inspections]', () => {
    expect(INSPECTION_QUERY_KEYS.all).toEqual(['inspections']);
  });

  it('pending key extends all', () => {
    expect(INSPECTION_QUERY_KEYS.pending()).toEqual(['inspections', 'pending']);
  });

  it('detail key includes id', () => {
    expect(INSPECTION_QUERY_KEYS.detail(42)).toEqual(['inspections', 'detail', 42]);
  });

  it('forSlip key includes slipId', () => {
    expect(INSPECTION_QUERY_KEYS.forSlip(10)).toEqual(['inspections', 'forSlip', 10]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════════════════════════

describe('usePendingInspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls useQuery', () => {
    usePendingInspections();
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('has staleTime of 30 seconds', () => {
    usePendingInspections();
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.staleTime).toBe(30_000);
  });

  it('has refetchInterval of 60 seconds', () => {
    usePendingInspections();
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.refetchInterval).toBe(60_000);
  });
});

describe('useInspection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes enabled: false when id is null', () => {
    useInspection(null);
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.enabled).toBe(false);
  });

  it('passes enabled: true when id is truthy', () => {
    useInspection(5);
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.enabled).toBe(true);
  });
});

describe('useInspectionForSlip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes enabled: false when slipId is null', () => {
    useInspectionForSlip(null);
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.enabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════════

describe('useCreateInspection', () => {
  it('calls useMutation', () => {
    useCreateInspection();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useUpdateInspection', () => {
  it('calls useMutation', () => {
    useUpdateInspection();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useUpdateParameterResults', () => {
  it('calls useMutation', () => {
    useUpdateParameterResults();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useSubmitInspection', () => {
  it('calls useMutation', () => {
    useSubmitInspection();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useApproveAsChemist', () => {
  it('calls useMutation', () => {
    useApproveAsChemist();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useApproveAsQAM', () => {
  it('calls useMutation', () => {
    useApproveAsQAM();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});

describe('useRejectInspection', () => {
  it('calls useMutation', () => {
    useRejectInspection();
    expect(mockUseMutation).toHaveBeenCalled();
  });
});
