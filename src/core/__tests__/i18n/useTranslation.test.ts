import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@/core/i18n/useTranslation';

// ═══════════════════════════════════════════════════════════════
// useTranslation (src/core/i18n/useTranslation.ts) — Direct Import
//
// Placeholder hook returning key as-is. Zero deps.
// ═══════════════════════════════════════════════════════════════

describe('useTranslation', () => {
  it('returns an object with t function', () => {
    const { result } = renderHook(() => useTranslation());
    expect(typeof result.current.t).toBe('function');
  });

  it('t(key) returns the key as-is', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('hello.world')).toBe('hello.world');
  });

  it('t(key, options) still returns the key as-is', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('greeting', { name: 'John' })).toBe('greeting');
  });

  it('t returns string type', () => {
    const { result } = renderHook(() => useTranslation());
    const value = result.current.t('test');
    expect(typeof value).toBe('string');
  });
});
