// ═══════════════════════════════════════════════════════════════
// Department Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for departments are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/department/department.api', () => ({
  departmentApi: {
    getDepartments: vi.fn(),
  },
}));

import { useDepartments } from '../../../api/department/department.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('department queries', () => {
  it('exports useDepartments as a function', () => {
    expect(typeof useDepartments).toBe('function');
  });
});
