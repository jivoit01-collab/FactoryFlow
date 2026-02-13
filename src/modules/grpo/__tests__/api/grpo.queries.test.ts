// ═══════════════════════════════════════════════════════════════
// GRPO Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks and query keys for GRPO
// are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../../api/grpo.api', () => ({
  grpoApi: {
    getPendingEntries: vi.fn(),
    getPreview: vi.fn(),
    post: vi.fn(),
    getHistory: vi.fn(),
    getDetail: vi.fn(),
    getWarehouses: vi.fn(),
  },
}));

import {
  GRPO_QUERY_KEYS,
  usePendingGRPOEntries,
  useGRPOPreview,
  usePostGRPO,
  useGRPOHistory,
  useGRPODetail,
  useWarehouses,
} from '../../api/grpo.queries';

// ═══════════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════════

describe('GRPO_QUERY_KEYS', () => {
  it('is defined as an object', () => {
    expect(GRPO_QUERY_KEYS).toBeDefined();
    expect(typeof GRPO_QUERY_KEYS).toBe('object');
  });

  it('has "all" key starting with "grpo"', () => {
    expect(GRPO_QUERY_KEYS.all).toEqual(['grpo']);
  });

  it('pending() returns correct key', () => {
    expect(GRPO_QUERY_KEYS.pending()).toEqual(['grpo', 'pending']);
  });

  it('preview() returns correct key with id', () => {
    expect(GRPO_QUERY_KEYS.preview(123)).toEqual(['grpo', 'preview', 123]);
  });

  it('history() returns correct key with optional id', () => {
    expect(GRPO_QUERY_KEYS.history()).toEqual(['grpo', 'history', undefined]);
    expect(GRPO_QUERY_KEYS.history(42)).toEqual(['grpo', 'history', 42]);
  });

  it('detail() returns correct key with id', () => {
    expect(GRPO_QUERY_KEYS.detail(99)).toEqual(['grpo', 'detail', 99]);
  });

  it('warehouses() returns correct key', () => {
    expect(GRPO_QUERY_KEYS.warehouses()).toEqual(['warehouses']);
  });
});

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('GRPO query hooks', () => {
  it('exports usePendingGRPOEntries as a function', () => {
    expect(typeof usePendingGRPOEntries).toBe('function');
  });

  it('exports useGRPOPreview as a function', () => {
    expect(typeof useGRPOPreview).toBe('function');
  });

  it('exports usePostGRPO as a function', () => {
    expect(typeof usePostGRPO).toBe('function');
  });

  it('exports useGRPOHistory as a function', () => {
    expect(typeof useGRPOHistory).toBe('function');
  });

  it('exports useGRPODetail as a function', () => {
    expect(typeof useGRPODetail).toBe('function');
  });

  it('exports useWarehouses as a function', () => {
    expect(typeof useWarehouses).toBe('function');
  });
});
