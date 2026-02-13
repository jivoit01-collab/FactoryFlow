import { describe, it, expect } from 'vitest';
import {
  ENTRY_TYPES,
  ENTRY_TYPE_LABELS,
  VEHICLE_CONDITIONS,
  TYRE_CONDITIONS,
  getVehicleConditionLabel,
  getTyreConditionLabel,
  WIZARD_CONFIGS,
  getWizardConfig,
} from '@/config/constants/vehicle.constants';

// ═══════════════════════════════════════════════════════════════
// ENTRY_TYPES
// ═══════════════════════════════════════════════════════════════

describe('ENTRY_TYPES', () => {
  it('has RAW_MATERIAL, CONSTRUCTION, DAILY_NEED, MAINTENANCE', () => {
    expect(ENTRY_TYPES).toHaveProperty('RAW_MATERIAL');
    expect(ENTRY_TYPES).toHaveProperty('CONSTRUCTION');
    expect(ENTRY_TYPES).toHaveProperty('DAILY_NEED');
    expect(ENTRY_TYPES).toHaveProperty('MAINTENANCE');
  });

  it('all values are uppercase strings', () => {
    for (const [key, value] of Object.entries(ENTRY_TYPES)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// ENTRY_TYPE_LABELS
// ═══════════════════════════════════════════════════════════════

describe('ENTRY_TYPE_LABELS', () => {
  it('maps RAW_MATERIAL to "Raw Material"', () => {
    expect(ENTRY_TYPE_LABELS.RAW_MATERIAL).toBe('Raw Material');
  });

  it('maps CONSTRUCTION to "Construction"', () => {
    expect(ENTRY_TYPE_LABELS.CONSTRUCTION).toBe('Construction');
  });

  it('maps DAILY_NEED to "Daily Needs"', () => {
    expect(ENTRY_TYPE_LABELS.DAILY_NEED).toBe('Daily Needs');
  });

  it('maps MAINTENANCE to "Maintenance"', () => {
    expect(ENTRY_TYPE_LABELS.MAINTENANCE).toBe('Maintenance');
  });

  it('has an entry for every ENTRY_TYPES key', () => {
    for (const key of Object.keys(ENTRY_TYPES)) {
      expect(ENTRY_TYPE_LABELS).toHaveProperty(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// VEHICLE_CONDITIONS
// ═══════════════════════════════════════════════════════════════

describe('VEHICLE_CONDITIONS', () => {
  it('has LOADED, PARTIALLY_LOADED, EMPTY', () => {
    expect(VEHICLE_CONDITIONS.LOADED).toBe('Loaded');
    expect(VEHICLE_CONDITIONS.PARTIALLY_LOADED).toBe('Partially Loaded');
    expect(VEHICLE_CONDITIONS.EMPTY).toBe('Empty');
  });
});

// ═══════════════════════════════════════════════════════════════
// TYRE_CONDITIONS
// ═══════════════════════════════════════════════════════════════

describe('TYRE_CONDITIONS', () => {
  it('has GOOD and POOR', () => {
    expect(TYRE_CONDITIONS.GOOD).toBe('Good');
    expect(TYRE_CONDITIONS.POOR).toBe('Poor');
  });
});

// ═══════════════════════════════════════════════════════════════
// getVehicleConditionLabel
// ═══════════════════════════════════════════════════════════════

describe('getVehicleConditionLabel()', () => {
  it('returns "Loaded" when isOk is true', () => {
    expect(getVehicleConditionLabel(true)).toBe('Loaded');
  });

  it('returns "Partially Loaded" when isOk is false', () => {
    expect(getVehicleConditionLabel(false)).toBe('Partially Loaded');
  });
});

// ═══════════════════════════════════════════════════════════════
// getTyreConditionLabel
// ═══════════════════════════════════════════════════════════════

describe('getTyreConditionLabel()', () => {
  it('returns "Good" when isOk is true', () => {
    expect(getTyreConditionLabel(true)).toBe('Good');
  });

  it('returns "Poor" when isOk is false', () => {
    expect(getTyreConditionLabel(false)).toBe('Poor');
  });
});

// ═══════════════════════════════════════════════════════════════
// WIZARD_CONFIGS
// ═══════════════════════════════════════════════════════════════

describe('WIZARD_CONFIGS', () => {
  it('has a config for each ENTRY_TYPES key', () => {
    for (const key of Object.keys(ENTRY_TYPES)) {
      expect(WIZARD_CONFIGS).toHaveProperty(key);
    }
  });

  it('RAW_MATERIAL has 6 totalSteps', () => {
    expect(WIZARD_CONFIGS.RAW_MATERIAL.totalSteps).toBe(6);
  });

  it('RAW_MATERIAL stepLabels has 6 entries', () => {
    expect(WIZARD_CONFIGS.RAW_MATERIAL.stepLabels).toHaveLength(6);
  });

  it('CONSTRUCTION has 4 totalSteps', () => {
    expect(WIZARD_CONFIGS.CONSTRUCTION.totalSteps).toBe(4);
  });

  it('DAILY_NEED has 4 totalSteps', () => {
    expect(WIZARD_CONFIGS.DAILY_NEED.totalSteps).toBe(4);
  });

  it('MAINTENANCE has 4 totalSteps', () => {
    expect(WIZARD_CONFIGS.MAINTENANCE.totalSteps).toBe(4);
  });

  it('all stepLabels arrays have length matching totalSteps', () => {
    for (const config of Object.values(WIZARD_CONFIGS)) {
      expect(config.stepLabels).toHaveLength(config.totalSteps);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// getWizardConfig
// ═══════════════════════════════════════════════════════════════

describe('getWizardConfig()', () => {
  it('returns correct config for RAW_MATERIAL', () => {
    expect(getWizardConfig('RAW_MATERIAL')).toBe(WIZARD_CONFIGS.RAW_MATERIAL);
  });

  it('returns correct config for CONSTRUCTION', () => {
    expect(getWizardConfig('CONSTRUCTION')).toBe(WIZARD_CONFIGS.CONSTRUCTION);
  });
});
