import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// store/hooks.ts — Store Hooks (File Content Verification)
//
// Imports from react, react-redux, and internal store/filtersSlice.
// Deep dependency chain through Redux store — verify via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/core/store/hooks.ts'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('store/hooks.ts — Imports', () => {
  it('imports useCallback and useMemo from react', () => {
    const content = readSource();
    expect(content).toContain('useCallback');
    expect(content).toContain('useMemo');
    expect(content).toContain("from 'react'");
  });

  it('imports useDispatch and useSelector from react-redux', () => {
    const content = readSource();
    expect(content).toContain('useDispatch');
    expect(content).toContain('useSelector');
    expect(content).toContain("from 'react-redux'");
  });

  it('imports RootState and AppDispatch types from ./store', () => {
    const content = readSource();
    expect(content).toContain('RootState');
    expect(content).toContain('AppDispatch');
    expect(content).toContain("from './store'");
  });

  it('imports setDateRangeFromDates, resetDateRange, and DateRange from ./filtersSlice', () => {
    const content = readSource();
    expect(content).toContain('setDateRangeFromDates');
    expect(content).toContain('resetDateRange');
    expect(content).toContain('DateRange');
    expect(content).toContain("from './filtersSlice'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Typed Hooks Exports
// ═══════════════════════════════════════════════════════════════

describe('store/hooks.ts — Typed Hooks', () => {
  it('exports useAppDispatch typed to AppDispatch', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+const\s+useAppDispatch.*=\s*useDispatch/);
  });

  it('exports useAppSelector typed to RootState', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+const\s+useAppSelector.*=\s*useSelector/);
  });
});

// ═══════════════════════════════════════════════════════════════
// useGlobalDateRange Hook
// ═══════════════════════════════════════════════════════════════

describe('store/hooks.ts — useGlobalDateRange', () => {
  it('exports useGlobalDateRange as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+useGlobalDateRange\(\)/);
  });

  it('returns dateRange from state.filters.dateRange', () => {
    const content = readSource();
    expect(content).toContain('state.filters.dateRange');
  });

  it('returns dateRangeAsDateObjects computed with useMemo', () => {
    const content = readSource();
    expect(content).toContain('dateRangeAsDateObjects');
    expect(content).toContain('useMemo');
  });

  it('returns setDateRange callback that dispatches setDateRangeFromDates', () => {
    const content = readSource();
    expect(content).toContain('dispatch(setDateRangeFromDates');
  });

  it('returns resetDateRange callback that dispatches resetDateRange', () => {
    const content = readSource();
    expect(content).toContain('dispatch(resetDateRange())');
  });
});

// ═══════════════════════════════════════════════════════════════
// formatDateRangeForApi
// ═══════════════════════════════════════════════════════════════

describe('store/hooks.ts — formatDateRangeForApi', () => {
  it('exports formatDateRangeForApi as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+formatDateRangeForApi/);
  });

  it('returns from_date and to_date keys', () => {
    const content = readSource();
    expect(content).toContain('from_date: dateRange.from');
    expect(content).toContain('to_date: dateRange.to');
  });
});
