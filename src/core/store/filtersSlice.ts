import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const STORAGE_KEY = 'app_filters'

// Helper function to get default date range (last 1 month)
function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date()
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  return {
    from: formatDateToString(oneMonthAgo),
    to: formatDateToString(today),
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDateToString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to load filters from localStorage
function loadFiltersFromStorage(): FiltersState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as FiltersState
      // Validate the stored data has required fields
      if (parsed.dateRange?.from && parsed.dateRange?.to) {
        return parsed
      }
    }
  } catch {
    // Invalid stored data, return null
  }
  return null
}

// Helper function to save filters to localStorage
export function saveFiltersToStorage(state: FiltersState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage might be full or disabled
  }
}

export interface DateRange {
  from: string // ISO date string YYYY-MM-DD
  to: string // ISO date string YYYY-MM-DD
}

export interface FiltersState {
  dateRange: DateRange
}

// Load initial state from localStorage or use defaults
const storedFilters = loadFiltersFromStorage()
const initialState: FiltersState = storedFilters || {
  dateRange: getDefaultDateRange(),
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    /**
     * Set the date range filter
     */
    setDateRange: (state, action: PayloadAction<DateRange>) => {
      state.dateRange = action.payload
    },

    /**
     * Set date range from Date objects (convenience action)
     */
    setDateRangeFromDates: (
      state,
      action: PayloadAction<{ from: Date | undefined; to: Date | undefined }>
    ) => {
      const { from, to } = action.payload
      if (from) {
        state.dateRange.from = formatDateToString(from)
      }
      if (to) {
        state.dateRange.to = formatDateToString(to)
      }
    },

    /**
     * Reset date range to default (last month)
     */
    resetDateRange: (state) => {
      state.dateRange = getDefaultDateRange()
    },
  },
})

export const { setDateRange, setDateRangeFromDates, resetDateRange } = filtersSlice.actions

export default filtersSlice.reducer
