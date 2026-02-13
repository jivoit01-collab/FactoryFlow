import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/config/constants', () => ({
  DEBOUNCE_DELAY: { search: 300, input: 150, resize: 100 },
}));

import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello'));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay expires', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    // Before delay (default 150ms from DEBOUNCE_DELAY.input)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('initial');
  });

  it('updates value after default delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current).toBe('updated');
  });

  it('uses custom delay when provided', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'abc' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Only 100ms since last change, should still be 'a'
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Now 200ms since last change ('abc')
    expect(result.current).toBe('abc');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 0 },
    });

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: initialObj },
    });

    rerender({ value: updatedObj });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual(updatedObj);
  });
});
