import { useCallback, useMemo } from 'react'
import type { DateRange as ReactDayPickerDateRange } from 'react-day-picker'
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import { type DateRange, resetDateRange, setDateRangeFromDates } from './filtersSlice'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * Hook for accessing and updating the global date range filter
 * Returns the date range as both string format (for API) and Date objects (for UI components)
 */
export function useGlobalDateRange() {
  const dispatch = useAppDispatch()
  const dateRange = useAppSelector((state) => state.filters.dateRange)

  // Convert string dates to Date objects for UI components (like DateRangePicker)
  const dateRangeAsDateObjects = useMemo((): ReactDayPickerDateRange => {
    return {
      from: dateRange.from ? new Date(dateRange.from + 'T00:00:00') : undefined,
      to: dateRange.to ? new Date(dateRange.to + 'T00:00:00') : undefined,
    }
  }, [dateRange])

  // Set date range from Date objects (what DateRangePicker provides)
  const setDateRange = useCallback(
    (range: ReactDayPickerDateRange | undefined) => {
      if (range) {
        dispatch(setDateRangeFromDates({ from: range.from, to: range.to }))
      }
    },
    [dispatch]
  )

  // Reset to default (last month)
  const reset = useCallback(() => {
    dispatch(resetDateRange())
  }, [dispatch])

  return {
    // String format for API calls (YYYY-MM-DD)
    dateRange,
    // Date objects for UI components
    dateRangeAsDateObjects,
    // Actions
    setDateRange,
    resetDateRange: reset,
  }
}

/**
 * Helper function to format date range for API params
 */
export function formatDateRangeForApi(dateRange: DateRange) {
  return {
    from_date: dateRange.from,
    to_date: dateRange.to,
  }
}
