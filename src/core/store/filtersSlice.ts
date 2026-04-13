import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { ignoreStorageError } from '@/shared/utils/error';
import { formatDateToISOString, getDefaultDateRange } from '@/shared/utils/format';

const STORAGE_KEY = 'app_filters';

// Helper function to load filters from localStorage
function loadFiltersFromStorage(): FiltersState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FiltersState;
      // Validate the stored data has required fields
      if (parsed.dateRange?.from && parsed.dateRange?.to) {
        return parsed;
      }
    }
  } catch {
    ignoreStorageError();
  }
  return null;
}

// Helper function to save filters to localStorage
export function saveFiltersToStorage(state: FiltersState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    ignoreStorageError();
  }
}

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string; // ISO date string YYYY-MM-DD
}

export interface FiltersState {
  dateRange: DateRange;
}

// Load initial state from localStorage or use defaults.
// Always clamp `to` to today so stale stored dates don't hide recent data.
function getInitialState(): FiltersState {
  const stored = loadFiltersFromStorage();
  const defaults = { dateRange: getDefaultDateRange() };
  if (!stored) return defaults;

  const today = formatDateToISOString(new Date());
  if (stored.dateRange.to < today) {
    const clamped: FiltersState = {
      dateRange: { from: stored.dateRange.from, to: today },
    };
    // Persist the clamped value so it doesn't revert on next read
    saveFiltersToStorage(clamped);
    return clamped;
  }
  return stored;
}

const initialState: FiltersState = getInitialState();

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    /**
     * Set the date range filter
     */
    setDateRange: (state, action: PayloadAction<DateRange>) => {
      state.dateRange = action.payload;
    },

    /**
     * Set date range from Date objects (convenience action)
     */
    setDateRangeFromDates: (
      state,
      action: PayloadAction<{ from: Date | undefined; to: Date | undefined }>,
    ) => {
      const { from, to } = action.payload;
      if (from) {
        state.dateRange.from = formatDateToISOString(from);
      }
      if (to) {
        state.dateRange.to = formatDateToISOString(to);
      }
    },

    /**
     * Reset date range to default (last month)
     */
    resetDateRange: (state) => {
      state.dateRange = getDefaultDateRange();
    },
  },
});

export const { setDateRange, setDateRangeFromDates, resetDateRange } = filtersSlice.actions;

export default filtersSlice.reducer;
