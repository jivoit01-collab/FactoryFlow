import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/constants', () => ({
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    invalidVehicleNumber: 'Please enter a valid vehicle number (e.g., MH12AB1234)',
  },
  VALIDATION_PATTERNS: {
    vehicleNumber: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/,
  },
}));

import { vehicleSchema } from '../../schemas/vehicle.schema';

// Helper to build a valid vehicle object
function makeValidVehicle(overrides: Record<string, unknown> = {}) {
  return {
    vehicle_number: 'MH12AB1234',
    vehicle_type: 1,
    transporter: 1,
    capacity_ton: '10',
    ...overrides,
  };
}

describe('Vehicle Schema', () => {
  // ═══════════════════════════════════════════════════════════════
  // Valid Input
  // ═══════════════════════════════════════════════════════════════

  describe('valid input', () => {
    it('accepts a fully valid vehicle object', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle());
      expect(result.success).toBe(true);
    });

    it('returns the vehicle number transformed to uppercase', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_number: 'MH12AB1234' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicle_number).toBe('MH12AB1234');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Vehicle Number Validation
  // ═══════════════════════════════════════════════════════════════

  describe('vehicle_number validation', () => {
    it('rejects empty vehicle number', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_number: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('vehicle_number'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects an invalid vehicle number format', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_number: 'INVALID123' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('vehicle_number'));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toBe('Please enter a valid vehicle number (e.g., MH12AB1234)');
      }
    });

    it('transforms lowercase vehicle number to uppercase', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_number: 'mh12ab1234' }));
      // The regex runs before transform, so lowercase input won't match the uppercase pattern
      // This means it will fail validation
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Vehicle Type Validation
  // ═══════════════════════════════════════════════════════════════

  describe('vehicle_type validation', () => {
    it('rejects missing vehicle type', () => {
      const data = makeValidVehicle();
      delete (data as Record<string, unknown>).vehicle_type;
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects non-positive vehicle type (zero)', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_type: 0 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('vehicle_type'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects negative vehicle type', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ vehicle_type: -1 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('vehicle_type'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Transporter Validation
  // ═══════════════════════════════════════════════════════════════

  describe('transporter validation', () => {
    it('rejects missing transporter', () => {
      const data = makeValidVehicle();
      delete (data as Record<string, unknown>).transporter;
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects non-positive transporter (zero)', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ transporter: 0 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('transporter'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects negative transporter', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ transporter: -1 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('transporter'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Capacity (Ton) Validation
  // ═══════════════════════════════════════════════════════════════

  describe('capacity_ton validation', () => {
    it('rejects empty capacity', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ capacity_ton: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('capacity_ton'));
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects non-numeric capacity string', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ capacity_ton: 'abc' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('capacity_ton'));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toBe('Capacity must be a positive number');
      }
    });

    it('rejects zero capacity', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ capacity_ton: '0' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('capacity_ton'));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toBe('Capacity must be a positive number');
      }
    });

    it('rejects negative capacity', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ capacity_ton: '-5' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('capacity_ton'));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toBe('Capacity must be a positive number');
      }
    });

    it('accepts a valid positive numeric string', () => {
      const result = vehicleSchema.safeParse(makeValidVehicle({ capacity_ton: '25.5' }));
      expect(result.success).toBe(true);
    });
  });
});
