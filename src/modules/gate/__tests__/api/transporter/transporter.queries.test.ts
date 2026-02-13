// ═══════════════════════════════════════════════════════════════
// Transporter Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for transporters are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/transporter/transporter.api', () => ({
  transporterApi: {
    getNames: vi.fn(),
    getById: vi.fn(),
    getList: vi.fn(),
    create: vi.fn(),
  },
}));

import {
  useTransporterNames,
  useTransporterById,
  useTransporters,
  useCreateTransporter,
} from '../../../api/transporter/transporter.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('transporter queries', () => {
  it('exports useTransporterNames as a function', () => {
    expect(typeof useTransporterNames).toBe('function');
  });

  it('exports useTransporterById as a function', () => {
    expect(typeof useTransporterById).toBe('function');
  });

  it('exports useTransporters as a function', () => {
    expect(typeof useTransporters).toBe('function');
  });

  it('exports useCreateTransporter as a function', () => {
    expect(typeof useCreateTransporter).toBe('function');
  });
});
