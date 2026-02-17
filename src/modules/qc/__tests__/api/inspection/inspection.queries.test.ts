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
    getList: vi.fn(),
    getPendingList: vi.fn(),
    getDraftList: vi.fn(),
    getActionableList: vi.fn(),
    getCompletedList: vi.fn(),
    getRejectedList: vi.fn(),
    getCounts: vi.fn(),
    getAwaitingChemist: vi.fn(),
    getAwaitingQAM: vi.fn(),
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
  useActionableInspections,
  useInspectionCounts,
  useInspectionsByTab,
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

  it('draft key extends all', () => {
    expect(INSPECTION_QUERY_KEYS.draft()).toEqual(['inspections', 'draft']);
  });

  it('actionable key extends all', () => {
    expect(INSPECTION_QUERY_KEYS.actionable()).toEqual(['inspections', 'actionable']);
  });

  it('counts key extends all', () => {
    expect(INSPECTION_QUERY_KEYS.counts()).toEqual(['inspections', 'counts']);
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

describe('useActionableInspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls useQuery', () => {
    useActionableInspections();
    expect(mockUseQuery).toHaveBeenCalled();
  });
});

describe('useInspectionCounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls useQuery', () => {
    useInspectionCounts();
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('has staleTime of 30 seconds', () => {
    useInspectionCounts();
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(config.staleTime).toBe(30_000);
  });
});

describe('useInspectionsByTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls useQuery for all tab', () => {
    useInspectionsByTab('all');
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('calls useQuery for pending tab', () => {
    useInspectionsByTab('pending');
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('calls useQuery for draft tab', () => {
    useInspectionsByTab('draft');
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('defaults to all for unknown tab', () => {
    useInspectionsByTab('unknown');
    expect(mockUseQuery).toHaveBeenCalled();
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
