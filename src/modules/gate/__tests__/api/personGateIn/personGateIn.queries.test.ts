// ═══════════════════════════════════════════════════════════════
// Person Gate In Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for person gate-in
// operations are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/personGateIn/personGateIn.api', () => ({
  personGateInApi: {
    getPersonTypes: vi.fn(),
    createPersonType: vi.fn(),
    updatePersonType: vi.fn(),
    deletePersonType: vi.fn(),
    getGates: vi.fn(),
    createGate: vi.fn(),
    updateGate: vi.fn(),
    deleteGate: vi.fn(),
    getContractors: vi.fn(),
    createContractor: vi.fn(),
    updateContractor: vi.fn(),
    deleteContractor: vi.fn(),
    getVisitors: vi.fn(),
    getVisitor: vi.fn(),
    createVisitor: vi.fn(),
    updateVisitor: vi.fn(),
    deleteVisitor: vi.fn(),
    getLabours: vi.fn(),
    getLabour: vi.fn(),
    createLabour: vi.fn(),
    updateLabour: vi.fn(),
    deleteLabour: vi.fn(),
    createEntry: vi.fn(),
    getEntry: vi.fn(),
    exitEntry: vi.fn(),
    cancelEntry: vi.fn(),
    updateEntry: vi.fn(),
    getInsideList: vi.fn(),
    getAllEntries: vi.fn().mockResolvedValue({ results: [] }),
    searchEntries: vi.fn().mockResolvedValue({ results: [] }),
    getEntryCounts: vi.fn(),
    getDashboard: vi.fn(),
    getVisitorHistory: vi.fn(),
    getLabourHistory: vi.fn(),
    checkPersonStatus: vi.fn(),
  },
}));

import {
  usePersonTypes,
  useCreatePersonType,
  useUpdatePersonType,
  useDeletePersonType,
  useGates,
  useCreateGate,
  useUpdateGate,
  useDeleteGate,
  useContractors,
  useCreateContractor,
  useUpdateContractor,
  useDeleteContractor,
  useVisitors,
  useVisitor,
  useCreateVisitor,
  useUpdateVisitor,
  useDeleteVisitor,
  useLabours,
  useLabour,
  useCreateLabour,
  useUpdateLabour,
  useDeleteLabour,
  usePersonEntries,
  usePersonEntryCounts,
  useInsideList,
  usePersonEntry,
  useCreatePersonEntry,
  useExitPersonEntry,
  useCancelPersonEntry,
  useUpdatePersonEntry,
  useSearchPersonEntries,
  usePersonGateInDashboard,
  useVisitorHistory,
  useLabourHistory,
  useCheckPersonStatus,
} from '../../../api/personGateIn/personGateIn.queries';

// ═══════════════════════════════════════════════════════════════
// Person Types hooks
// ═══════════════════════════════════════════════════════════════

describe('personGateIn queries', () => {
  it('exports usePersonTypes as a function', () => {
    expect(typeof usePersonTypes).toBe('function');
  });

  it('exports useCreatePersonType as a function', () => {
    expect(typeof useCreatePersonType).toBe('function');
  });

  it('exports useUpdatePersonType as a function', () => {
    expect(typeof useUpdatePersonType).toBe('function');
  });

  it('exports useDeletePersonType as a function', () => {
    expect(typeof useDeletePersonType).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Gates hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports useGates as a function', () => {
    expect(typeof useGates).toBe('function');
  });

  it('exports useCreateGate as a function', () => {
    expect(typeof useCreateGate).toBe('function');
  });

  it('exports useUpdateGate as a function', () => {
    expect(typeof useUpdateGate).toBe('function');
  });

  it('exports useDeleteGate as a function', () => {
    expect(typeof useDeleteGate).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Contractors hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports useContractors as a function', () => {
    expect(typeof useContractors).toBe('function');
  });

  it('exports useCreateContractor as a function', () => {
    expect(typeof useCreateContractor).toBe('function');
  });

  it('exports useUpdateContractor as a function', () => {
    expect(typeof useUpdateContractor).toBe('function');
  });

  it('exports useDeleteContractor as a function', () => {
    expect(typeof useDeleteContractor).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Visitors hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports useVisitors as a function', () => {
    expect(typeof useVisitors).toBe('function');
  });

  it('exports useVisitor as a function', () => {
    expect(typeof useVisitor).toBe('function');
  });

  it('exports useCreateVisitor as a function', () => {
    expect(typeof useCreateVisitor).toBe('function');
  });

  it('exports useUpdateVisitor as a function', () => {
    expect(typeof useUpdateVisitor).toBe('function');
  });

  it('exports useDeleteVisitor as a function', () => {
    expect(typeof useDeleteVisitor).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Labours hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports useLabours as a function', () => {
    expect(typeof useLabours).toBe('function');
  });

  it('exports useLabour as a function', () => {
    expect(typeof useLabour).toBe('function');
  });

  it('exports useCreateLabour as a function', () => {
    expect(typeof useCreateLabour).toBe('function');
  });

  it('exports useUpdateLabour as a function', () => {
    expect(typeof useUpdateLabour).toBe('function');
  });

  it('exports useDeleteLabour as a function', () => {
    expect(typeof useDeleteLabour).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Entry Logs hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports usePersonEntries as a function', () => {
    expect(typeof usePersonEntries).toBe('function');
  });

  it('exports usePersonEntryCounts as a function', () => {
    expect(typeof usePersonEntryCounts).toBe('function');
  });

  it('exports useInsideList as a function', () => {
    expect(typeof useInsideList).toBe('function');
  });

  it('exports usePersonEntry as a function', () => {
    expect(typeof usePersonEntry).toBe('function');
  });

  it('exports useCreatePersonEntry as a function', () => {
    expect(typeof useCreatePersonEntry).toBe('function');
  });

  it('exports useExitPersonEntry as a function', () => {
    expect(typeof useExitPersonEntry).toBe('function');
  });

  it('exports useCancelPersonEntry as a function', () => {
    expect(typeof useCancelPersonEntry).toBe('function');
  });

  it('exports useUpdatePersonEntry as a function', () => {
    expect(typeof useUpdatePersonEntry).toBe('function');
  });

  it('exports useSearchPersonEntries as a function', () => {
    expect(typeof useSearchPersonEntries).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // Dashboard & History hooks
  // ═══════════════════════════════════════════════════════════════

  it('exports usePersonGateInDashboard as a function', () => {
    expect(typeof usePersonGateInDashboard).toBe('function');
  });

  it('exports useVisitorHistory as a function', () => {
    expect(typeof useVisitorHistory).toBe('function');
  });

  it('exports useLabourHistory as a function', () => {
    expect(typeof useLabourHistory).toBe('function');
  });

  it('exports useCheckPersonStatus as a function', () => {
    expect(typeof useCheckPersonStatus).toBe('function');
  });
});
