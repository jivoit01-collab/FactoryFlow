import { describe, it, expect, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mock centralized constants
// ═══════════════════════════════════════════════════════════════

vi.mock('@/config/constants', () => ({
  GRPO_STATUS_CONFIG: {
    PENDING: { label: 'Pending', color: 'yellow' },
    POSTED: { label: 'Posted', color: 'green' },
    FAILED: { label: 'Failed', color: 'red' },
    PARTIALLY_POSTED: { label: 'Partially Posted', color: 'orange' },
  },
  GRPO_STATUS: {
    PENDING: 'PENDING',
    POSTED: 'POSTED',
    FAILED: 'FAILED',
    PARTIALLY_POSTED: 'PARTIALLY_POSTED',
  },
}));

import { GRPO_STATUS_CONFIG, GRPO_STATUS, DEFAULT_BRANCH_ID } from '../../constants/grpo.constants';

describe('GRPO Constants', () => {
  // ═══════════════════════════════════════════════════════════════
  // DEFAULT_BRANCH_ID
  // ═══════════════════════════════════════════════════════════════

  it('DEFAULT_BRANCH_ID is a number', () => {
    expect(typeof DEFAULT_BRANCH_ID).toBe('number');
  });

  it('DEFAULT_BRANCH_ID defaults to 2 when env is not set', () => {
    expect(DEFAULT_BRANCH_ID).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // Re-exported constants
  // ═══════════════════════════════════════════════════════════════

  it('GRPO_STATUS_CONFIG is defined', () => {
    expect(GRPO_STATUS_CONFIG).toBeDefined();
    expect(typeof GRPO_STATUS_CONFIG).toBe('object');
  });

  it('GRPO_STATUS is defined', () => {
    expect(GRPO_STATUS).toBeDefined();
    expect(typeof GRPO_STATUS).toBe('object');
  });

  it('GRPO_STATUS contains expected status values', () => {
    expect(GRPO_STATUS.PENDING).toBe('PENDING');
    expect(GRPO_STATUS.POSTED).toBe('POSTED');
    expect(GRPO_STATUS.FAILED).toBe('FAILED');
    expect(GRPO_STATUS.PARTIALLY_POSTED).toBe('PARTIALLY_POSTED');
  });
});
