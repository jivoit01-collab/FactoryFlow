import type { ApiError } from '@/core/api/types'

/**
 * Extracts a user-friendly error message from an API error.
 * Handles various error response formats.
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage

  const apiError = error as ApiError

  // Try to get detail from response.data first (most specific)
  if (apiError.response?.data?.detail) {
    return apiError.response.data.detail
  }

  // Try direct detail property
  if (apiError.detail) {
    return apiError.detail
  }

  // Try message property
  if (apiError.message) {
    return apiError.message
  }

  return fallbackMessage
}

/**
 * Extracts error detail in lowercase for comparison.
 * Useful for checking specific error conditions.
 */
export function getErrorDetailLower(error: unknown): string {
  if (!error) return ''

  const apiError = error as ApiError

  const detail = apiError.response?.data?.detail || apiError.detail || apiError.message || ''

  return detail.toLowerCase()
}

/**
 * Checks if an error is a "not found" error (404).
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error) return false

  const apiError = error as ApiError

  // Check status code
  if (apiError.status === 404 || apiError.response?.status === 404) {
    return true
  }

  // Check error message
  const detail = getErrorDetailLower(error)
  return detail.includes('not found')
}

/**
 * Checks if an error is a server error (5xx).
 */
export function isServerError(error: unknown): boolean {
  if (!error) return false

  const apiError = error as ApiError

  // Check status code for 5xx errors
  const status = apiError.status || apiError.response?.status
  if (status && status >= 500 && status < 600) {
    return true
  }

  return false
}

/**
 * Gets a user-friendly message for server errors.
 */
export function getServerErrorMessage(): string {
  return 'Something went wrong on the server. Please check your internet connection or try reloading the page.'
}

/**
 * Converts API error field errors to a record of field -> message.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!error) return {}

  const apiError = error as ApiError
  const fieldErrors: Record<string, string> = {}

  const errors = apiError.errors || apiError.response?.data?.errors

  if (errors) {
    Object.entries(errors).forEach(([field, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0]
      }
    })
  }

  return fieldErrors
}
