import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock storage
vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

// Mock constants
vi.mock('@/config/constants/app.constants', () => ({
  THEME_OPTIONS: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
}));

import { ThemeProvider, useTheme } from '../../contexts/ThemeProvider';
import { storage } from '../../utils/storage';

const mockStorage = vi.mocked(storage);

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.get.mockReturnValue(null);
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    // Reset document classes
    document.documentElement.classList.remove('light', 'dark');
  });

  // ─── Basic Rendering ───────────────────────────────────────────

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test content</div>
      </ThemeProvider>,
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  // ─── useTheme Hook ─────────────────────────────────────────────

  it('provides theme context via useTheme', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBeDefined();
    expect(result.current.resolvedTheme).toBeDefined();
    expect(typeof result.current.setTheme).toBe('function');
  });

  it('defaults to system theme', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
  });

  it('uses stored theme from localStorage', () => {
    mockStorage.get.mockReturnValue('dark');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  // ─── setTheme ──────────────────────────────────────────────────

  it('setTheme updates theme and persists to storage', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(mockStorage.set).toHaveBeenCalledWith('FMS_theme', 'dark');
  });

  // ─── useTheme without Provider ─────────────────────────────────

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error from React
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
  });

  // ─── resolvedTheme ─────────────────────────────────────────────

  it('resolvedTheme is light when theme is light', () => {
    mockStorage.get.mockReturnValue('light');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.resolvedTheme).toBe('light');
  });

  it('resolvedTheme is dark when theme is dark', () => {
    mockStorage.get.mockReturnValue('dark');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.resolvedTheme).toBe('dark');
  });
});
