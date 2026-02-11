import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  getErrorDetailLower,
  isNotFoundError,
  isServerError,
  isUnauthorizedError,
  isForbiddenError,
  isValidationError,
  getServerErrorMessage,
  getUnauthorizedErrorMessage,
  getForbiddenErrorMessage,
  getNotFoundErrorMessage,
  getFieldErrors,
  getSmartErrorMessage,
} from '../../utils/error'
import type { ApiError } from '@/core/api/types'

// Helper to create partial ApiError objects for testing
function makeError(overrides: Partial<ApiError> & { response?: ApiError['response'] }): ApiError {
  return {
    message: 'Default error',
    status: 500,
    ...overrides,
  } as ApiError
}

describe('Error Utilities', () => {
  // ═══════════════════════════════════════════════════════════════
  // getErrorMessage
  // ═══════════════════════════════════════════════════════════════

  describe('getErrorMessage', () => {
    it('returns fallback when error is null', () => {
      expect(getErrorMessage(null, 'Fallback')).toBe('Fallback')
    })

    it('returns fallback when error is undefined', () => {
      expect(getErrorMessage(undefined, 'Fallback')).toBe('Fallback')
    })

    it('returns fallback when error is falsy (0)', () => {
      expect(getErrorMessage(0, 'Fallback')).toBe('Fallback')
    })

    it('returns fallback when error is empty string', () => {
      expect(getErrorMessage('', 'Fallback')).toBe('Fallback')
    })

    it('extracts detail from response.data.detail', () => {
      const error = makeError({
        response: { data: { detail: 'Server detail message' }, status: 400 },
      })
      expect(getErrorMessage(error, 'Fallback')).toBe('Server detail message')
    })

    it('extracts detail from error.detail', () => {
      const error = makeError({ detail: 'Direct detail' })
      expect(getErrorMessage(error, 'Fallback')).toBe('Direct detail')
    })

    it('extracts message from error.message', () => {
      const error = makeError({ message: 'Error message' })
      expect(getErrorMessage(error, 'Fallback')).toBe('Error message')
    })

    it('prioritizes response.data.detail over error.detail', () => {
      const error = makeError({
        detail: 'Direct detail',
        message: 'Generic message',
        response: { data: { detail: 'Response detail' }, status: 400 },
      })
      expect(getErrorMessage(error, 'Fallback')).toBe('Response detail')
    })

    it('prioritizes error.detail over error.message', () => {
      const error = makeError({
        detail: 'Direct detail',
        message: 'Generic message',
      })
      expect(getErrorMessage(error, 'Fallback')).toBe('Direct detail')
    })

    it('returns fallback for an error object with no extractable message', () => {
      const error = {} as ApiError
      expect(getErrorMessage(error, 'Fallback')).toBe('Fallback')
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // getErrorDetailLower
  // ═══════════════════════════════════════════════════════════════

  describe('getErrorDetailLower', () => {
    it('returns empty string for null error', () => {
      expect(getErrorDetailLower(null)).toBe('')
    })

    it('returns empty string for undefined error', () => {
      expect(getErrorDetailLower(undefined)).toBe('')
    })

    it('returns lowercase detail from response.data.detail', () => {
      const error = makeError({
        response: { data: { detail: 'NOT FOUND' }, status: 404 },
      })
      expect(getErrorDetailLower(error)).toBe('not found')
    })

    it('returns lowercase from error.detail', () => {
      const error = makeError({ detail: 'Something WRONG' })
      expect(getErrorDetailLower(error)).toBe('something wrong')
    })

    it('returns lowercase from error.message', () => {
      const error = makeError({ message: 'Network ERROR' })
      expect(getErrorDetailLower(error)).toBe('network error')
    })

    it('returns empty string when no detail is available', () => {
      const error = {} as ApiError
      expect(getErrorDetailLower(error)).toBe('')
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isNotFoundError
  // ═══════════════════════════════════════════════════════════════

  describe('isNotFoundError', () => {
    it('returns false for null', () => {
      expect(isNotFoundError(null)).toBe(false)
    })

    it('detects 404 via error.status', () => {
      const error = makeError({ status: 404 })
      expect(isNotFoundError(error)).toBe(true)
    })

    it('detects 404 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 404 },
      })
      expect(isNotFoundError(error)).toBe(true)
    })

    it('detects "not found" in detail text', () => {
      const error = makeError({
        status: 400,
        detail: 'Resource not found',
      })
      expect(isNotFoundError(error)).toBe(true)
    })

    it('returns false for non-404 errors', () => {
      const error = makeError({ status: 500, message: 'Server error' })
      expect(isNotFoundError(error)).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isServerError
  // ═══════════════════════════════════════════════════════════════

  describe('isServerError', () => {
    it('returns false for null', () => {
      expect(isServerError(null)).toBe(false)
    })

    it('detects 500 status', () => {
      expect(isServerError(makeError({ status: 500 }))).toBe(true)
    })

    it('detects 503 status', () => {
      expect(isServerError(makeError({ status: 503 }))).toBe(true)
    })

    it('detects 502 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 502 },
      })
      expect(isServerError(error)).toBe(true)
    })

    it('returns false for 499', () => {
      expect(isServerError(makeError({ status: 499 }))).toBe(false)
    })

    it('returns false for 600', () => {
      expect(isServerError(makeError({ status: 600 }))).toBe(false)
    })

    it('returns false for 400 errors', () => {
      expect(isServerError(makeError({ status: 400 }))).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isUnauthorizedError
  // ═══════════════════════════════════════════════════════════════

  describe('isUnauthorizedError', () => {
    it('returns false for null', () => {
      expect(isUnauthorizedError(null)).toBe(false)
    })

    it('detects 401 via error.status', () => {
      expect(isUnauthorizedError(makeError({ status: 401 }))).toBe(true)
    })

    it('detects 401 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 401 },
      })
      expect(isUnauthorizedError(error)).toBe(true)
    })

    it('returns false for 403', () => {
      expect(isUnauthorizedError(makeError({ status: 403 }))).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isForbiddenError
  // ═══════════════════════════════════════════════════════════════

  describe('isForbiddenError', () => {
    it('returns false for null', () => {
      expect(isForbiddenError(null)).toBe(false)
    })

    it('detects 403 via error.status', () => {
      expect(isForbiddenError(makeError({ status: 403 }))).toBe(true)
    })

    it('detects 403 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 403 },
      })
      expect(isForbiddenError(error)).toBe(true)
    })

    it('returns false for 401', () => {
      expect(isForbiddenError(makeError({ status: 401 }))).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isValidationError
  // ═══════════════════════════════════════════════════════════════

  describe('isValidationError', () => {
    it('returns false for null', () => {
      expect(isValidationError(null)).toBe(false)
    })

    it('detects 400 via error.status', () => {
      expect(isValidationError(makeError({ status: 400 }))).toBe(true)
    })

    it('detects 400 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 400 },
      })
      expect(isValidationError(error)).toBe(true)
    })

    it('detects 422 via error.status', () => {
      expect(isValidationError(makeError({ status: 422 }))).toBe(true)
    })

    it('detects 422 via response.status', () => {
      const error = makeError({
        status: 0,
        response: { status: 422 },
      })
      expect(isValidationError(error)).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Static Error Messages
  // ═══════════════════════════════════════════════════════════════

  describe('Static Error Messages', () => {
    it('getServerErrorMessage returns a non-empty string', () => {
      expect(getServerErrorMessage()).toBeTruthy()
      expect(typeof getServerErrorMessage()).toBe('string')
    })

    it('getUnauthorizedErrorMessage returns a non-empty string', () => {
      expect(getUnauthorizedErrorMessage()).toBeTruthy()
    })

    it('getForbiddenErrorMessage returns a non-empty string', () => {
      expect(getForbiddenErrorMessage()).toBeTruthy()
    })

    it('getNotFoundErrorMessage returns a non-empty string', () => {
      expect(getNotFoundErrorMessage()).toBeTruthy()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // getFieldErrors
  // ═══════════════════════════════════════════════════════════════

  describe('getFieldErrors', () => {
    it('returns empty object for null error', () => {
      expect(getFieldErrors(null)).toEqual({})
    })

    it('returns empty object for undefined error', () => {
      expect(getFieldErrors(undefined)).toEqual({})
    })

    it('extracts field errors from error.errors (array values)', () => {
      const error = makeError({
        errors: {
          name: ['Name is required'],
          email: ['Invalid email', 'Email already taken'],
        },
      })
      const result = getFieldErrors(error)
      expect(result).toEqual({
        name: 'Name is required',
        email: 'Invalid email',  // Only first message
      })
    })

    it('extracts field errors from response.data.errors', () => {
      const error = makeError({
        response: {
          data: {
            errors: {
              password: ['Too short'],
            },
          },
          status: 400,
        },
      })
      const result = getFieldErrors(error)
      expect(result).toEqual({ password: 'Too short' })
    })

    it('handles string error values', () => {
      const error = makeError({
        errors: {
          name: 'Name is required' as any,
        },
      })
      const result = getFieldErrors(error)
      expect(result).toEqual({ name: 'Name is required' })
    })

    it('handles empty arrays', () => {
      const error = makeError({
        errors: {
          name: [],
        },
      })
      const result = getFieldErrors(error)
      // Empty array doesn't match any condition (not > 0, not string)
      expect(result).toEqual({})
    })

    it('returns empty object when no errors property exists', () => {
      const error = makeError({ message: 'Something failed' })
      expect(getFieldErrors(error)).toEqual({})
    })

    it('prefers error.errors over response.data.errors', () => {
      const error = makeError({
        errors: { field1: ['From errors'] },
        response: {
          data: { errors: { field2: ['From response'] } },
          status: 400,
        },
      })
      // The `||` operator: errors || response.data.errors - picks first truthy
      const result = getFieldErrors(error)
      expect(result).toEqual({ field1: 'From errors' })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // getSmartErrorMessage
  // ═══════════════════════════════════════════════════════════════

  describe('getSmartErrorMessage', () => {
    it('returns fallback for null error', () => {
      expect(getSmartErrorMessage(null, 'Fallback')).toBe('Fallback')
    })

    it('returns server error message for 5xx', () => {
      const error = makeError({ status: 500 })
      expect(getSmartErrorMessage(error, 'Fallback')).toBe(getServerErrorMessage())
    })

    it('returns unauthorized message for 401', () => {
      const error = makeError({ status: 401 })
      expect(getSmartErrorMessage(error, 'Fallback')).toBe(getUnauthorizedErrorMessage())
    })

    it('returns forbidden message for 403', () => {
      const error = makeError({ status: 403 })
      expect(getSmartErrorMessage(error, 'Fallback')).toBe(getForbiddenErrorMessage())
    })

    it('returns not found message for 404', () => {
      const error = makeError({ status: 404 })
      expect(getSmartErrorMessage(error, 'Fallback')).toBe(getNotFoundErrorMessage())
    })

    it('returns extracted message for other errors', () => {
      const error = makeError({ status: 422, detail: 'Custom validation error' })
      expect(getSmartErrorMessage(error, 'Fallback')).toBe('Custom validation error')
    })

    it('returns fallback for unknown errors with no message', () => {
      const error = { status: 422 } as ApiError
      expect(getSmartErrorMessage(error, 'Fallback')).toBe('Fallback')
    })

    // BUG: Priority issue - 500 + 401 status is treated as server error
    it('server error check runs before unauthorized check (priority order)', () => {
      // This documents the priority order: server > unauthorized > forbidden > notFound
      const error = makeError({ status: 500 })
      // Even if somehow 500 was also a match for others, server is checked first
      expect(getSmartErrorMessage(error, 'Fallback')).toBe(getServerErrorMessage())
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Network / Unknown Error Safety
  // ═══════════════════════════════════════════════════════════════

  describe('Network / Unknown Error Safety', () => {
    it('handles plain Error object', () => {
      const error = new Error('Network failure')
      expect(getErrorMessage(error, 'Fallback')).toBe('Network failure')
    })

    it('handles error with only message property', () => {
      const error = { message: 'Connection refused' }
      expect(getErrorMessage(error, 'Fallback')).toBe('Connection refused')
    })

    it('handles non-object errors gracefully', () => {
      expect(getErrorMessage(42, 'Fallback')).toBe('Fallback')
    })

    it('returns fallback for string error', () => {
      expect(getErrorMessage('some error', 'Fallback')).toBe('Fallback')
    })

    it('returns fallback for boolean error', () => {
      expect(getErrorMessage(true, 'Fallback')).toBe('Fallback')
    })

    it('type guard returns false for primitive errors in type checks', () => {
      expect(isNotFoundError(42)).toBe(false)
      expect(isNotFoundError('not found')).toBe(false)
      expect(isServerError(500)).toBe(false)
      expect(isUnauthorizedError(true)).toBe(false)
      expect(isForbiddenError('forbidden')).toBe(false)
      expect(isValidationError(400)).toBe(false)
    })

    it('type guard returns empty for primitive errors in detail functions', () => {
      expect(getErrorDetailLower(42)).toBe('')
      expect(getErrorDetailLower('some string')).toBe('')
      expect(getFieldErrors(42)).toEqual({})
      expect(getFieldErrors('some string')).toEqual({})
    })

    it('handles error with deeply nested response', () => {
      const error = {
        response: {
          data: {
            detail: 'Deep detail',
          },
          status: 400,
        },
        message: 'Axios error',
        status: 400,
      }
      expect(getErrorMessage(error, 'Fallback')).toBe('Deep detail')
    })
  })
})
