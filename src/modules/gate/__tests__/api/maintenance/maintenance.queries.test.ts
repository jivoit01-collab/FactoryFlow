// ═══════════════════════════════════════════════════════════════
// Maintenance Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for maintenance entries
// are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/maintenance/maintenance.api', () => ({
  maintenanceApi: {
    getUnitChoices: vi.fn(),
    getTypes: vi.fn(),
    getByEntryId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getFullView: vi.fn(),
    complete: vi.fn(),
  },
}));

import {
  useUnitChoices,
  useMaintenanceTypes,
  useMaintenanceEntry,
  useCreateMaintenanceEntry,
  useUpdateMaintenanceEntry,
  useMaintenanceFullView,
  useCompleteMaintenanceEntry,
} from '../../../api/maintenance/maintenance.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('maintenance queries', () => {
  it('exports useUnitChoices as a function', () => {
    expect(typeof useUnitChoices).toBe('function');
  });

  it('exports useMaintenanceTypes as a function', () => {
    expect(typeof useMaintenanceTypes).toBe('function');
  });

  it('exports useMaintenanceEntry as a function', () => {
    expect(typeof useMaintenanceEntry).toBe('function');
  });

  it('exports useCreateMaintenanceEntry as a function', () => {
    expect(typeof useCreateMaintenanceEntry).toBe('function');
  });

  it('exports useUpdateMaintenanceEntry as a function', () => {
    expect(typeof useUpdateMaintenanceEntry).toBe('function');
  });

  it('exports useMaintenanceFullView as a function', () => {
    expect(typeof useMaintenanceFullView).toBe('function');
  });

  it('exports useCompleteMaintenanceEntry as a function', () => {
    expect(typeof useCompleteMaintenanceEntry).toBe('function');
  });
});
