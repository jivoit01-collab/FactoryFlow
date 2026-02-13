import { describe, it, expect } from 'vitest';
import {
  PAGINATION,
  TABLE_CONFIG,
  SIDEBAR_CONFIG,
  TOAST_CONFIG,
  DEBOUNCE_DELAY,
} from '@/config/constants/ui.constants';

// ═══════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════

describe('PAGINATION', () => {
  it('defaultPage is 1', () => {
    expect(PAGINATION.defaultPage).toBe(1);
  });

  it('defaultPageSize is 10', () => {
    expect(PAGINATION.defaultPageSize).toBe(10);
  });

  it('pageSizeOptions contains [10, 20, 50, 100]', () => {
    expect([...PAGINATION.pageSizeOptions]).toEqual([10, 20, 50, 100]);
  });

  it('pageSizeOptions includes defaultPageSize', () => {
    expect(PAGINATION.pageSizeOptions).toContain(PAGINATION.defaultPageSize);
  });
});

// ═══════════════════════════════════════════════════════════════
// TABLE_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('TABLE_CONFIG', () => {
  it('defaultSortOrder is "desc"', () => {
    expect(TABLE_CONFIG.defaultSortOrder).toBe('desc');
  });

  it('dateColumns contains "createdAt" and "updatedAt"', () => {
    expect([...TABLE_CONFIG.dateColumns]).toContain('createdAt');
    expect([...TABLE_CONFIG.dateColumns]).toContain('updatedAt');
  });
});

// ═══════════════════════════════════════════════════════════════
// SIDEBAR_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('SIDEBAR_CONFIG', () => {
  it('collapsedWidth is 64', () => {
    expect(SIDEBAR_CONFIG.collapsedWidth).toBe(64);
  });

  it('expandedWidth is 256', () => {
    expect(SIDEBAR_CONFIG.expandedWidth).toBe(256);
  });

  it('mobileBreakpoint is 768', () => {
    expect(SIDEBAR_CONFIG.mobileBreakpoint).toBe(768);
  });

  it('expandedWidth is greater than collapsedWidth', () => {
    expect(SIDEBAR_CONFIG.expandedWidth).toBeGreaterThan(SIDEBAR_CONFIG.collapsedWidth);
  });
});

// ═══════════════════════════════════════════════════════════════
// TOAST_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('TOAST_CONFIG', () => {
  it('duration is 5000', () => {
    expect(TOAST_CONFIG.duration).toBe(5000);
  });

  it('position is "bottom-right"', () => {
    expect(TOAST_CONFIG.position).toBe('bottom-right');
  });
});

// ═══════════════════════════════════════════════════════════════
// DEBOUNCE_DELAY
// ═══════════════════════════════════════════════════════════════

describe('DEBOUNCE_DELAY', () => {
  it('search is 300', () => {
    expect(DEBOUNCE_DELAY.search).toBe(300);
  });

  it('input is 150', () => {
    expect(DEBOUNCE_DELAY.input).toBe(150);
  });

  it('resize is 100', () => {
    expect(DEBOUNCE_DELAY.resize).toBe(100);
  });

  it('all delay values are positive numbers', () => {
    for (const [, value] of Object.entries(DEBOUNCE_DELAY)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// All UI constants — integrity
// ═══════════════════════════════════════════════════════════════

describe('All UI constants — integrity', () => {
  it('all five exports are defined', () => {
    expect(PAGINATION).toBeDefined();
    expect(TABLE_CONFIG).toBeDefined();
    expect(SIDEBAR_CONFIG).toBeDefined();
    expect(TOAST_CONFIG).toBeDefined();
    expect(DEBOUNCE_DELAY).toBeDefined();
  });

  it('no values are undefined or null', () => {
    const allValues = [
      ...Object.values(PAGINATION),
      ...Object.values(TABLE_CONFIG),
      ...Object.values(SIDEBAR_CONFIG),
      ...Object.values(TOAST_CONFIG),
      ...Object.values(DEBOUNCE_DELAY),
    ];
    for (const value of allValues) {
      expect(value).not.toBeUndefined();
      expect(value).not.toBeNull();
    }
  });
});
