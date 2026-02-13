import type { ApiError } from '@/core/api/types';

// ============================================================================
// Error Message Extraction
// ============================================================================

/**
 * Extracts a user-friendly error message from an API error.
 * Handles various error response formats from different API implementations.
 *
 * @param error - The error object (can be unknown type)
 * @param fallbackMessage - Default message if no specific error message is found
 * @returns A user-friendly error message string
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage;
  if (typeof error !== 'object') return fallbackMessage;

  const apiError = error as ApiError;

  // Try to get detail from response.data first (most specific)
  if (apiError.response?.data?.detail) {
    return apiError.response.data.detail;
  }

  // Try direct detail property
  if (apiError.detail) {
    return apiError.detail;
  }

  // Try message property
  if (apiError.message) {
    return apiError.message;
  }

  return fallbackMessage;
}

/**
 * Extracts error detail in lowercase for comparison.
 * Useful for checking specific error conditions like "not found".
 *
 * @param error - The error object
 * @returns Lowercase error detail string
 */
export function getErrorDetailLower(error: unknown): string {
  if (!error) return '';
  if (typeof error !== 'object') return '';

  const apiError = error as ApiError;

  const detail = apiError.response?.data?.detail || apiError.detail || apiError.message || '';

  return detail.toLowerCase();
}

// ============================================================================
// Error Type Checks
// ============================================================================

/**
 * Checks if an error is a "not found" error (404).
 *
 * @param error - The error object
 * @returns True if the error is a 404 not found error
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return false;

  const apiError = error as ApiError;

  // Check status code
  if (apiError.status === 404 || apiError.response?.status === 404) {
    return true;
  }

  // Check error message
  const detail = getErrorDetailLower(error);
  return detail.includes('not found');
}

/**
 * Checks if an error is a server error (5xx).
 *
 * @param error - The error object
 * @returns True if the error is a server error (status 500-599)
 */
export function isServerError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return false;

  const apiError = error as ApiError;

  // Check status code for 5xx errors
  const status = apiError.status || apiError.response?.status;
  if (status && status >= 500 && status < 600) {
    return true;
  }

  return false;
}

/**
 * Checks if an error is an unauthorized error (401).
 *
 * @param error - The error object
 * @returns True if the error is a 401 unauthorized error
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return false;

  const apiError = error as ApiError;

  return apiError.status === 401 || apiError.response?.status === 401;
}

/**
 * Checks if an error is a forbidden error (403).
 *
 * @param error - The error object
 * @returns True if the error is a 403 forbidden error
 */
export function isForbiddenError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return false;

  const apiError = error as ApiError;

  return apiError.status === 403 || apiError.response?.status === 403;
}

/**
 * Checks if an error is a validation error (400).
 *
 * @param error - The error object
 * @returns True if the error is a 400 bad request error
 */
export function isValidationError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error !== 'object') return false;

  const apiError = error as ApiError;
  const status = apiError.status || apiError.response?.status;

  return status === 400 || status === 422;
}

// ============================================================================
// Error Message Getters
// ============================================================================

/**
 * Gets a user-friendly message for server errors.
 *
 * @returns A generic server error message
 */
export function getServerErrorMessage(): string {
  return 'Something went wrong on the server. Please check your internet connection or try reloading the page.';
}

/**
 * Gets a user-friendly message for unauthorized errors.
 *
 * @returns A generic unauthorized error message
 */
export function getUnauthorizedErrorMessage(): string {
  return 'Your session has expired. Please log in again.';
}

/**
 * Gets a user-friendly message for forbidden errors.
 *
 * @returns A generic forbidden error message
 */
export function getForbiddenErrorMessage(): string {
  return 'You do not have permission to perform this action.';
}

/**
 * Gets a user-friendly message for not found errors.
 *
 * @returns A generic not found error message
 */
export function getNotFoundErrorMessage(): string {
  return 'The requested resource was not found.';
}

// ============================================================================
// Field Error Extraction
// ============================================================================

/**
 * Converts API error field errors to a record of field -> message.
 * Useful for form validation error display.
 *
 * @param error - The error object
 * @returns A record of field names to error messages
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!error) return {};
  if (typeof error !== 'object') return {};

  const apiError = error as ApiError;
  const fieldErrors: Record<string, string> = {};

  const errors = apiError.errors || apiError.response?.data?.errors;

  if (errors) {
    Object.entries(errors).forEach(([field, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0];
      } else if (typeof messages === 'string') {
        fieldErrors[field] = messages;
      }
    });
  }

  return fieldErrors;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Gets the appropriate error message based on error type.
 * Provides different messages for different HTTP status codes.
 *
 * @param error - The error object
 * @param fallbackMessage - Default message if no specific handler matches
 * @returns A user-friendly error message
 */
export function getSmartErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage;

  if (isServerError(error)) {
    return getServerErrorMessage();
  }

  if (isUnauthorizedError(error)) {
    return getUnauthorizedErrorMessage();
  }

  if (isForbiddenError(error)) {
    return getForbiddenErrorMessage();
  }

  if (isNotFoundError(error)) {
    return getNotFoundErrorMessage();
  }

  return getErrorMessage(error, fallbackMessage);
}
