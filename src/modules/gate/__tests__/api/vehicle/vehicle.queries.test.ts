// ═══════════════════════════════════════════════════════════════
// Vehicle Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for vehicles are exported
// as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}));

vi.mock('../../../api/vehicle/vehicle.api', () => ({
  vehicleApi: {
    getVehicleTypes: vi.fn(),
    getNames: vi.fn(),
    getById: vi.fn(),
    getList: vi.fn(),
    create: vi.fn(),
  },
}));

import {
  useVehicleTypes,
  useVehicleNames,
  useVehicleById,
  useVehicles,
  useCreateVehicle,
} from '../../../api/vehicle/vehicle.queries';

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('vehicle queries', () => {
  it('exports useVehicleTypes as a function', () => {
    expect(typeof useVehicleTypes).toBe('function');
  });

  it('exports useVehicleNames as a function', () => {
    expect(typeof useVehicleNames).toBe('function');
  });

  it('exports useVehicleById as a function', () => {
    expect(typeof useVehicleById).toBe('function');
  });

  it('exports useVehicles as a function', () => {
    expect(typeof useVehicles).toBe('function');
  });

  it('exports useCreateVehicle as a function', () => {
    expect(typeof useCreateVehicle).toBe('function');
  });
});
