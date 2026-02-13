import { useCallback, useState } from 'react';

/**
 * Return type for the form errors hook.
 */
export interface UseFormErrorsReturn {
  /** Current error messages keyed by field name */
  errors: Record<string, string>;
  /** Sets an error for a specific field */
  setError: (field: string, message: string) => void;
  /** Sets multiple errors at once */
  setErrors: (errors: Record<string, string>) => void;
  /** Clears the error for a specific field */
  clearError: (field: string) => void;
  /** Clears all errors */
  clearAllErrors: () => void;
  /** Clears errors for multiple fields */
  clearErrors: (fields: string[]) => void;
  /** Checks if a specific field has an error */
  hasError: (field: string) => boolean;
  /** Checks if there are any errors */
  hasAnyError: boolean;
  /** Gets the error message for a specific field */
  getError: (field: string) => string | undefined;
}

/**
 * Hook to manage form error state.
 *
 * Provides a consistent API for handling API errors and form validation errors
 * across all form components.
 *
 * @example
 * ```tsx
 * const {
 *   errors,
 *   setError,
 *   setErrors,
 *   clearError,
 *   clearAllErrors,
 *   hasError,
 * } = useFormErrors()
 *
 * // In input handler:
 * const handleInputChange = (field: string, value: string) => {
 *   setFormData(prev => ({ ...prev, [field]: value }))
 *   clearError(field) // Clear error when user starts typing
 * }
 *
 * // In API error handler:
 * catch (error) {
 *   const fieldErrors = getFieldErrors(error)
 *   setErrors(fieldErrors)
 * }
 * ```
 */
export function useFormErrors(initialErrors: Record<string, string> = {}): UseFormErrorsReturn {
  const [errors, setErrorsState] = useState<Record<string, string>>(initialErrors);

  const setError = useCallback((field: string, message: string) => {
    setErrorsState((prev) => ({ ...prev, [field]: message }));
  }, []);

  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors);
  }, []);

  const clearError = useCallback((field: string) => {
    setErrorsState((prev) => {
      if (!(field in prev)) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  const clearErrors = useCallback((fields: string[]) => {
    setErrorsState((prev) => {
      const newErrors = { ...prev };
      let changed = false;
      fields.forEach((field) => {
        if (field in newErrors) {
          delete newErrors[field];
          changed = true;
        }
      });
      return changed ? newErrors : prev;
    });
  }, []);

  const hasError = useCallback(
    (field: string) => {
      return field in errors;
    },
    [errors],
  );

  const getError = useCallback(
    (field: string) => {
      return errors[field];
    },
    [errors],
  );

  const hasAnyError = Object.keys(errors).length > 0;

  return {
    errors,
    setError,
    setErrors,
    clearError,
    clearAllErrors,
    clearErrors,
    hasError,
    hasAnyError,
    getError,
  };
}
