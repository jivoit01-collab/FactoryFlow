// ═══════════════════════════════════════════════════════════════
// Purchase Order Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for purchase orders are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/po/po.api', () => ({
  poApi: {
    getOpenPOs: vi.fn(),
    getVendors: vi.fn(),
  },
}));

import { useOpenPOs, useVendors } from '../../../api/po/po.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('po queries', () => {
  it('exports useOpenPOs as a function', () => {
    expect(typeof useOpenPOs).toBe('function');
  });

  it('exports useVendors as a function', () => {
    expect(typeof useVendors).toBe('function');
  });
});
