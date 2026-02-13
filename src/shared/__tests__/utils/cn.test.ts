import { describe, it, expect } from 'vitest';
import { cn } from '../../utils/cn';

describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns a single class name', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles conditional classes (falsy values)', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toContain('foo');
    expect(result).toContain('baz');
    expect(result).not.toContain('bar');
  });

  it('handles undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('merges Tailwind conflicting classes (last wins)', () => {
    // twMerge resolves conflicts: p-4 and p-2 -> p-2
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('merges Tailwind conflicting text colors', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles object syntax from clsx', () => {
    const result = cn({ 'text-red-500': true, 'bg-blue-500': false });
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('bg-blue-500');
  });

  it('handles array syntax from clsx', () => {
    const result = cn(['foo', 'bar']);
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles mixed inputs', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class', { 'conditional-class': true });
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
    expect(result).toContain('conditional-class');
  });
});
