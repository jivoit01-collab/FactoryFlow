import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

import { WIZARD_CONFIG, TABLE_CONFIG, DEBOUNCE_CONFIG } from '../../constants/wizard.constants';

// ═══════════════════════════════════════════════════════════════
// Tests — WIZARD_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('WIZARD_CONFIG', () => {
  it('has TOTAL_STEPS = 5', () => {
    expect(WIZARD_CONFIG.TOTAL_STEPS).toBe(5);
  });

  it('has STEPS.VEHICLE_DRIVER = 1', () => {
    expect(WIZARD_CONFIG.STEPS.VEHICLE_DRIVER).toBe(1);
  });

  it('has STEPS.SECURITY_CHECK = 2', () => {
    expect(WIZARD_CONFIG.STEPS.SECURITY_CHECK).toBe(2);
  });

  it('has STEPS.PO_RECEIPT = 3', () => {
    expect(WIZARD_CONFIG.STEPS.PO_RECEIPT).toBe(3);
  });

  it('has STEPS.ARRIVAL_SLIP = 4', () => {
    expect(WIZARD_CONFIG.STEPS.ARRIVAL_SLIP).toBe(4);
  });

  it('has STEPS.WEIGHMENT = 5', () => {
    expect(WIZARD_CONFIG.STEPS.WEIGHMENT).toBe(5);
  });

  it('has STEP_TITLES for step 1', () => {
    expect(WIZARD_CONFIG.STEP_TITLES[1]).toBe('Vehicle & Driver');
  });

  it('has STEP_TITLES for step 2', () => {
    expect(WIZARD_CONFIG.STEP_TITLES[2]).toBe('Security Check');
  });

  it('has STEP_TITLES for step 3', () => {
    expect(WIZARD_CONFIG.STEP_TITLES[3]).toBe('PO Receipt');
  });

  it('has STEP_TITLES for step 4', () => {
    expect(WIZARD_CONFIG.STEP_TITLES[4]).toBe('Arrival Slip');
  });

  it('has STEP_TITLES for step 5', () => {
    expect(WIZARD_CONFIG.STEP_TITLES[5]).toBe('Weighment');
  });
});

// ═══════════════════════════════════════════════════════════════
// Tests — TABLE_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('TABLE_CONFIG', () => {
  it('has MIN_WIDTH = 800px', () => {
    expect(TABLE_CONFIG.MIN_WIDTH).toBe('800px');
  });
});

// ═══════════════════════════════════════════════════════════════
// Tests — DEBOUNCE_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('DEBOUNCE_CONFIG', () => {
  it('has SEARCH_DELAY = 100', () => {
    expect(DEBOUNCE_CONFIG.SEARCH_DELAY).toBe(100);
  });
});
