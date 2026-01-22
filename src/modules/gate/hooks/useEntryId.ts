import { useParams, useSearchParams, useLocation } from 'react-router-dom'

interface UseEntryIdResult {
  entryId: string | null
  entryIdNumber: number | null
  isEditMode: boolean
}

/**
 * Custom hook for consistent entry ID extraction across step pages.
 * Handles both create mode (query params) and edit mode (route params).
 *
 * @returns Object containing:
 *   - entryId: The entry ID as a string, or null if not found
 *   - entryIdNumber: The entry ID as a number, or null if not found/invalid
 *   - isEditMode: Whether the current route is an edit route
 */
export function useEntryId(): UseEntryIdResult {
  const { entryId: routeEntryId } = useParams<{ entryId?: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const isEditMode = location.pathname.includes('/edit/')

  // In edit mode, use route params; in create mode, use query params
  const entryId = isEditMode
    ? routeEntryId || null
    : searchParams.get('entryId')

  const entryIdNumber = entryId ? parseInt(entryId, 10) : null
  const validEntryIdNumber = entryIdNumber && !isNaN(entryIdNumber) ? entryIdNumber : null

  return {
    entryId,
    entryIdNumber: validEntryIdNumber,
    isEditMode,
  }
}
