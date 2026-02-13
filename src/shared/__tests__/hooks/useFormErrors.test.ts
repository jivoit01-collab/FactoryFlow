import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormErrors } from '../../hooks/useFormErrors';

describe('useFormErrors', () => {
  // ─── Initial State ──────────────────────────────────────────────

  describe('Initial State', () => {
    it('starts with empty errors by default', () => {
      const { result } = renderHook(() => useFormErrors());
      expect(result.current.errors).toEqual({});
      expect(result.current.hasAnyError).toBe(false);
    });

    it('accepts initial errors', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Name is required' }));
      expect(result.current.errors).toEqual({ name: 'Name is required' });
      expect(result.current.hasAnyError).toBe(true);
    });
  });

  // ─── setError ──────────────────────────────────────────────────

  describe('setError', () => {
    it('sets a single field error', () => {
      const { result } = renderHook(() => useFormErrors());

      act(() => {
        result.current.setError('email', 'Invalid email');
      });

      expect(result.current.errors.email).toBe('Invalid email');
      expect(result.current.hasAnyError).toBe(true);
    });

    it('overwrites existing error for the same field', () => {
      const { result } = renderHook(() => useFormErrors());

      act(() => {
        result.current.setError('email', 'First error');
      });

      act(() => {
        result.current.setError('email', 'Second error');
      });

      expect(result.current.errors.email).toBe('Second error');
    });

    it('preserves other field errors', () => {
      const { result } = renderHook(() => useFormErrors());

      act(() => {
        result.current.setError('name', 'Required');
        result.current.setError('email', 'Invalid');
      });

      expect(result.current.errors.name).toBe('Required');
      expect(result.current.errors.email).toBe('Invalid');
    });
  });

  // ─── setErrors ─────────────────────────────────────────────────

  describe('setErrors', () => {
    it('replaces all errors at once', () => {
      const { result } = renderHook(() => useFormErrors());

      act(() => {
        result.current.setError('old', 'Old error');
      });

      act(() => {
        result.current.setErrors({ name: 'Required', email: 'Invalid' });
      });

      expect(result.current.errors).toEqual({ name: 'Required', email: 'Invalid' });
      expect(result.current.errors.old).toBeUndefined();
    });
  });

  // ─── clearError ────────────────────────────────────────────────

  describe('clearError', () => {
    it('clears a specific field error', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required', email: 'Invalid' }));

      act(() => {
        result.current.clearError('name');
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBe('Invalid');
    });

    it('does nothing when field has no error', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));

      act(() => {
        result.current.clearError('nonexistent');
      });

      expect(result.current.errors).toEqual({ name: 'Required' });
    });
  });

  // ─── clearAllErrors ────────────────────────────────────────────

  describe('clearAllErrors', () => {
    it('clears all errors', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required', email: 'Invalid' }));

      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.hasAnyError).toBe(false);
    });
  });

  // ─── clearErrors ───────────────────────────────────────────────

  describe('clearErrors', () => {
    it('clears errors for specified fields', () => {
      const { result } = renderHook(() =>
        useFormErrors({ name: 'Required', email: 'Invalid', phone: 'Too short' }),
      );

      act(() => {
        result.current.clearErrors(['name', 'email']);
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeUndefined();
      expect(result.current.errors.phone).toBe('Too short');
    });

    it('does nothing for non-existent fields', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));

      act(() => {
        result.current.clearErrors(['nonexistent']);
      });

      expect(result.current.errors).toEqual({ name: 'Required' });
    });
  });

  // ─── hasError ──────────────────────────────────────────────────

  describe('hasError', () => {
    it('returns true when field has error', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));
      expect(result.current.hasError('name')).toBe(true);
    });

    it('returns false when field has no error', () => {
      const { result } = renderHook(() => useFormErrors());
      expect(result.current.hasError('name')).toBe(false);
    });
  });

  // ─── getError ──────────────────────────────────────────────────

  describe('getError', () => {
    it('returns error message for a field', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));
      expect(result.current.getError('name')).toBe('Required');
    });

    it('returns undefined for field with no error', () => {
      const { result } = renderHook(() => useFormErrors());
      expect(result.current.getError('name')).toBeUndefined();
    });
  });

  // ─── hasAnyError ───────────────────────────────────────────────

  describe('hasAnyError', () => {
    it('is false when no errors exist', () => {
      const { result } = renderHook(() => useFormErrors());
      expect(result.current.hasAnyError).toBe(false);
    });

    it('is true when errors exist', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));
      expect(result.current.hasAnyError).toBe(true);
    });

    it('becomes false after clearing all errors', () => {
      const { result } = renderHook(() => useFormErrors({ name: 'Required' }));

      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.hasAnyError).toBe(false);
    });
  });
});
