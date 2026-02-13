import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/constants', () => ({
  DEBOUNCE_DELAY: { search: 300, input: 150, resize: 100 },
}));

describe('Hooks Index Exports', () => {
  it('exports useDebounce', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useDebounce).toBeDefined();
    expect(typeof mod.useDebounce).toBe('function');
  });

  it('exports useLocalStorage', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useLocalStorage).toBeDefined();
    expect(typeof mod.useLocalStorage).toBe('function');
  });

  it('exports useScrollToError', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useScrollToError).toBeDefined();
    expect(typeof mod.useScrollToError).toBe('function');
  });

  it('exports useEditFormState', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useEditFormState).toBeDefined();
    expect(typeof mod.useEditFormState).toBe('function');
  });

  it('exports useFormErrors', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useFormErrors).toBeDefined();
    expect(typeof mod.useFormErrors).toBe('function');
  });

  it('exports useCurrentTime and related utilities', async () => {
    const mod = await import('../../hooks/index');
    expect(mod.useCurrentTime).toBeDefined();
    expect(mod.getCurrentTimeHHMM).toBeDefined();
    expect(mod.getTimeFromDatetime).toBeDefined();
  });
});
