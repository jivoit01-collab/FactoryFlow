// ═══════════════════════════════════════════════════════════════
// PO Receipt Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for PO receipts are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/po/poReceipt.api', () => ({
  poReceiptApi: {
    get: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../api/po/po.api', () => ({
  poApi: {
    getOpenPOs: vi.fn(),
    getVendors: vi.fn(),
  },
}));

import { usePOReceipts, useCreatePOReceipt } from '../../../api/po/poReceipt.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('poReceipt queries', () => {
  it('exports usePOReceipts as a function', () => {
    expect(typeof usePOReceipts).toBe('function');
  });

  it('exports useCreatePOReceipt as a function', () => {
    expect(typeof useCreatePOReceipt).toBe('function');
  });
});
