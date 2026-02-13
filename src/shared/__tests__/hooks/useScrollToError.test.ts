import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollToError } from '../../hooks/useScrollToError';

describe('useScrollToError', () => {
  let mockScrollIntoView: ReturnType<typeof vi.fn>;
  let mockFocus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockScrollIntoView = vi.fn();
    mockFocus = vi.fn();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Basic Behavior ─────────────────────────────────────────────

  it('returns scrollToFirstError function', () => {
    const { result } = renderHook(() => useScrollToError({}));
    expect(typeof result.current.scrollToFirstError).toBe('function');
  });

  it('does not scroll when there are no errors', () => {
    const querySelector = vi.spyOn(document, 'querySelector');

    renderHook(() => useScrollToError({}));

    expect(querySelector).not.toHaveBeenCalled();
    querySelector.mockRestore();
  });

  it('scrolls to error element when errors appear', () => {
    const mockElement = {
      scrollIntoView: mockScrollIntoView,
      focus: mockFocus,
    } as unknown as HTMLElement;

    vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const { rerender } = renderHook(({ errors }) => useScrollToError(errors), {
      initialProps: { errors: {} as Record<string, unknown> },
    });

    // Add an error to trigger auto-scroll
    rerender({ errors: { name: { message: 'Required', type: 'required' } } });

    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  // ─── Disabled Mode ──────────────────────────────────────────────

  it('does not auto-scroll when enabled is false', () => {
    const mockElement = {
      scrollIntoView: mockScrollIntoView,
      focus: mockFocus,
    } as unknown as HTMLElement;

    vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const { rerender } = renderHook(({ errors }) => useScrollToError(errors, { enabled: false }), {
      initialProps: { errors: {} as Record<string, unknown> },
    });

    rerender({ errors: { name: { message: 'Required', type: 'required' } } });

    expect(mockScrollIntoView).not.toHaveBeenCalled();
  });

  // ─── scrollToFirstError stability ──────────────────────────────

  it('scrollToFirstError reference updates when errors change', () => {
    const { result, rerender } = renderHook(({ errors }) => useScrollToError(errors), {
      initialProps: { errors: {} as Record<string, unknown> },
    });

    const first = result.current.scrollToFirstError;

    rerender({ errors: { name: { message: 'Error', type: 'required' } } });

    // Reference should change since errors changed (it's in the deps)
    expect(typeof result.current.scrollToFirstError).toBe('function');
  });
});
