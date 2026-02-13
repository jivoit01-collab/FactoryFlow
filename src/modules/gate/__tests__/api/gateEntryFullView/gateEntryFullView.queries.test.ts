// ═══════════════════════════════════════════════════════════════
// Gate Entry Full View Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for the gate entry full
// view are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/gateEntryFullView/gateEntryFullView.api', () => ({
  gateEntryFullViewApi: {
    get: vi.fn(),
    complete: vi.fn(),
  },
}));

import {
  useGateEntryFullView,
  useCompleteGateEntry,
} from '../../../api/gateEntryFullView/gateEntryFullView.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('gateEntryFullView queries', () => {
  it('exports useGateEntryFullView as a function', () => {
    expect(typeof useGateEntryFullView).toBe('function');
  });

  it('exports useCompleteGateEntry as a function', () => {
    expect(typeof useCompleteGateEntry).toBe('function');
  });
});
