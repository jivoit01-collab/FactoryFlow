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

vi.mock('@/core/auth', () => ({
  useAuth: vi.fn(() => ({ currentCompany: { company_code: 'JIVO_OIL' } })),
}));

vi.mock('../../../api/transporter/transporter.api', () => ({
  transporterApi: {
    getNames: vi.fn(),
    getById: vi.fn(),
    getList: vi.fn(),
    create: vi.fn(),
    getSapVendors: vi.fn(),
    resolve: vi.fn(),
  },
}));

import {
  useTransporterNames,
  useTransporterById,
  useTransporters,
  useCreateTransporter,
  useResolveTransporter,
  useSapTransporterVendors,
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

  it('exports useSapTransporterVendors as a function', () => {
    expect(typeof useSapTransporterVendors).toBe('function');
  });

  it('exports useResolveTransporter as a function', () => {
    expect(typeof useResolveTransporter).toBe('function');
  });
});
