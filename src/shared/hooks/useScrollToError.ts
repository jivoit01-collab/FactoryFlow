import { useEffect, useCallback, useRef } from 'react'
import type { FieldErrors } from 'react-hook-form'

/**
 * Hook that automatically scrolls to the first form error when validation fails.
 * Works with react-hook-form by watching the errors object.
 *
 * @param errors - The errors object from react-hook-form's formState
 * @param options - Configuration options
 * @returns Object with scrollToFirstError function for manual triggering
 *
 * @example
 * const { formState: { errors } } = useForm()
 * useScrollToError(errors)
 */
export function useScrollToError<T extends FieldErrors>(
  errors: T,
  options: {
    /** Whether to automatically scroll when errors change. Default: true */
    enabled?: boolean
    /** Scroll behavior. Default: 'smooth' */
    behavior?: ScrollBehavior
    /** Block alignment. Default: 'center' */
    block?: ScrollLogicalPosition
    /** Whether to focus the element after scrolling. Default: true */
    shouldFocus?: boolean
    /** Offset from top in pixels (useful for fixed headers). Default: 0 */
    offset?: number
  } = {}
) {
  const {
    enabled = true,
    behavior = 'smooth',
    block = 'center',
    shouldFocus = true,
    offset = 0,
  } = options

  // Track the previous error count to detect when new errors appear
  const prevErrorCount = useRef(0)

  /**
   * Get the first error field name from nested errors object
   */
  const getFirstErrorKey = useCallback((errors: FieldErrors): string | null => {
    const keys = Object.keys(errors)
    if (keys.length === 0) return null

    for (const key of keys) {
      const error = errors[key]
      if (!error) continue

      // If it's a nested error (like array fields), recurse
      if (typeof error === 'object' && !('message' in error) && !('type' in error)) {
        const nestedKey = getFirstErrorKey(error as FieldErrors)
        if (nestedKey) return `${key}.${nestedKey}`
      }

      // Found a direct error
      return key
    }

    return keys[0]
  }, [])

  /**
   * Scroll to the first error field in the form
   */
  const scrollToFirstError = useCallback(() => {
    const firstErrorKey = getFirstErrorKey(errors)
    if (!firstErrorKey) return

    // Try multiple selectors to find the error element
    const selectors = [
      `[name="${firstErrorKey}"]`,
      `#${firstErrorKey}`,
      `[data-field="${firstErrorKey}"]`,
      // For nested fields like "items.0.name"
      `[name="${firstErrorKey.replace(/\./g, '\\.')}"]`,
    ]

    let element: HTMLElement | null = null

    for (const selector of selectors) {
      try {
        element = document.querySelector(selector)
        if (element) break
      } catch {
        // Invalid selector, continue to next
      }
    }

    if (!element) {
      // Fallback: try to find the first visible error message
      const errorMessage = document.querySelector('.text-destructive')
      if (errorMessage) {
        element = errorMessage as HTMLElement
      }
    }

    if (element) {
      // If there's an offset, we need to calculate the position manually
      if (offset > 0) {
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - offset

        window.scrollTo({
          top: offsetPosition,
          behavior,
        })
      } else {
        element.scrollIntoView({
          behavior,
          block,
        })
      }

      // Focus the element after scrolling
      if (shouldFocus && 'focus' in element && typeof element.focus === 'function') {
        // Small delay to ensure scroll completes
        setTimeout(() => {
          element.focus({ preventScroll: true })
        }, behavior === 'smooth' ? 300 : 0)
      }
    }
  }, [errors, getFirstErrorKey, behavior, block, shouldFocus, offset])

  // Auto-scroll when errors appear
  useEffect(() => {
    if (!enabled) return

    const errorKeys = Object.keys(errors)
    const currentErrorCount = errorKeys.length

    // Only scroll when new errors appear (count increased)
    if (currentErrorCount > 0 && currentErrorCount > prevErrorCount.current) {
      // Small delay to ensure the DOM has updated with error messages
      requestAnimationFrame(() => {
        scrollToFirstError()
      })
    }

    prevErrorCount.current = currentErrorCount
  }, [errors, enabled, scrollToFirstError])

  return { scrollToFirstError }
}
