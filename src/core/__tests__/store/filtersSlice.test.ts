import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, {
  setDateRange,
  setDateRangeFromDates,
  resetDateRange,
  saveFiltersToStorage,
} from '@/core/store/filtersSlice';
import type { DateRange, FiltersState } from '@/core/store/filtersSlice';

// ═══════════════════════════════════════════════════════════════
// Filters Slice (src/core/store/filtersSlice.ts) — Direct Import
//
// Only depends on @reduxjs/toolkit. Uses localStorage (mocked).
// ═══════════════════════════════════════════════════════════════

// ─── Mock localStorage ──────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ─── Helpers ────────────────────────────────────────────────

function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('Filters Slice', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ─── Initial State ────────────────────────────────────────

  it('has initial state with dateRange containing from and to strings', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.dateRange).toHaveProperty('from');
    expect(state.dateRange).toHaveProperty('to');
    expect(typeof state.dateRange.from).toBe('string');
    expect(typeof state.dateRange.to).toBe('string');
  });

  it('initial from date is approximately 1 month ago', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const from = new Date(state.dateRange.from);
    const now = new Date();
    const diffMs = now.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Should be roughly 28-31 days
    expect(diffDays).toBeGreaterThan(25);
    expect(diffDays).toBeLessThan(35);
  });

  it('initial to date is today', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.dateRange.to).toBe(formatDateToString(new Date()));
  });

  // ─── setDateRange ─────────────────────────────────────────

  it('setDateRange replaces the entire dateRange', () => {
    const initial: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    const newRange: DateRange = { from: '2024-06-01', to: '2024-06-30' };
    const state = reducer(initial, setDateRange(newRange));
    expect(state.dateRange).toEqual(newRange);
  });

  // ─── setDateRangeFromDates ────────────────────────────────

  it('setDateRangeFromDates sets from when provided', () => {
    const initial: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    const fromDate = new Date(2024, 5, 15); // June 15, 2024
    const state = reducer(initial, setDateRangeFromDates({ from: fromDate, to: undefined }));
    expect(state.dateRange.from).toBe('2024-06-15');
    expect(state.dateRange.to).toBe('2024-01-31'); // unchanged
  });

  it('setDateRangeFromDates sets to when provided', () => {
    const initial: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    const toDate = new Date(2024, 11, 25); // Dec 25, 2024
    const state = reducer(initial, setDateRangeFromDates({ from: undefined, to: toDate }));
    expect(state.dateRange.from).toBe('2024-01-01'); // unchanged
    expect(state.dateRange.to).toBe('2024-12-25');
  });

  it('setDateRangeFromDates sets both when both provided', () => {
    const initial: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    const state = reducer(
      initial,
      setDateRangeFromDates({ from: new Date(2024, 2, 1), to: new Date(2024, 2, 31) }),
    );
    expect(state.dateRange.from).toBe('2024-03-01');
    expect(state.dateRange.to).toBe('2024-03-31');
  });

  it('setDateRangeFromDates ignores both when both undefined', () => {
    const initial: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    const state = reducer(initial, setDateRangeFromDates({ from: undefined, to: undefined }));
    expect(state.dateRange).toEqual({ from: '2024-01-01', to: '2024-01-31' });
  });

  // ─── resetDateRange ───────────────────────────────────────

  it('resetDateRange sets dateRange back to default (last month)', () => {
    const initial: FiltersState = { dateRange: { from: '2020-01-01', to: '2020-12-31' } };
    const state = reducer(initial, resetDateRange());
    expect(state.dateRange.to).toBe(formatDateToString(new Date()));
    const from = new Date(state.dateRange.from);
    const diffDays = (new Date().getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(25);
    expect(diffDays).toBeLessThan(35);
  });

  // ─── saveFiltersToStorage ─────────────────────────────────

  it('saveFiltersToStorage writes to localStorage', () => {
    const state: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
    saveFiltersToStorage(state);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('app_filters', JSON.stringify(state));
  });

  // ─── DateRange Type ───────────────────────────────────────

  it('DateRange has from and to string fields', () => {
    const range: DateRange = { from: '2024-01-01', to: '2024-12-31' };
    expect(typeof range.from).toBe('string');
    expect(typeof range.to).toBe('string');
  });

  // ─── FiltersState Type ────────────────────────────────────

  it('FiltersState has dateRange field', () => {
    const state: FiltersState = { dateRange: { from: '2024-01-01', to: '2024-12-31' } };
    expect(state).toHaveProperty('dateRange');
  });

  // ─── Exported Actions ─────────────────────────────────────

  it('exports all 3 action creators', () => {
    expect(typeof setDateRange).toBe('function');
    expect(typeof setDateRangeFromDates).toBe('function');
    expect(typeof resetDateRange).toBe('function');
  });

  it('exports saveFiltersToStorage as named function', () => {
    expect(typeof saveFiltersToStorage).toBe('function');
  });

  it('exports default reducer as function', () => {
    expect(typeof reducer).toBe('function');
  });
});
