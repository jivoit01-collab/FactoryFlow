// ═══════════════════════════════════════════════════════════════
// Quality Control Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for quality control are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/quality/qualityControl.api', () => ({
  qualityControlApi: {
    get: vi.fn(),
    create: vi.fn(),
  },
}));

import { useCreateQualityControl } from '../../../api/quality/qualityControl.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('qualityControl queries', () => {
  it('exports useCreateQualityControl as a function', () => {
    expect(typeof useCreateQualityControl).toBe('function');
  });
});
