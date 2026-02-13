// ═══════════════════════════════════════════════════════════════
// Security Check Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for security checks are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/securityCheck/securityCheck.api', () => ({
  securityCheckApi: {
    get: vi.fn(),
    submit: vi.fn(),
    create: vi.fn(),
  },
}));

import {
  useSecurityCheck,
  useCreateSecurityCheck,
} from '../../../api/securityCheck/securityCheck.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('securityCheck queries', () => {
  it('exports useSecurityCheck as a function', () => {
    expect(typeof useSecurityCheck).toBe('function');
  });

  it('exports useCreateSecurityCheck as a function', () => {
    expect(typeof useCreateSecurityCheck).toBe('function');
  });
});
