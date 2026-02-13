import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { type Theme, THEME_OPTIONS } from '@/config/constants/app.constants';

import { storage } from '../utils/storage';

const THEME_STORAGE_KEY = 'FMS_theme';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Get system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document root
 */
function applyTheme(theme: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

// Subscribe to system theme changes
function subscribeToSystemTheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  } else {
    mediaQuery.addListener(callback);
    return () => mediaQuery.removeListener(callback);
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'system'
    const stored = storage.get<string>(THEME_STORAGE_KEY);
    // Validate stored theme is one of the valid options
    if (
      stored &&
      (stored === THEME_OPTIONS.LIGHT ||
        stored === THEME_OPTIONS.DARK ||
        stored === THEME_OPTIONS.SYSTEM)
    ) {
      return stored as Theme;
    }
    return THEME_OPTIONS.SYSTEM;
  });

  // Use useSyncExternalStore to track system theme changes
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    () => 'light' as const,
  );

  // Compute resolved theme synchronously (no setState in effect)
  const resolvedTheme = useMemo(() => {
    return theme === THEME_OPTIONS.SYSTEM ? systemTheme : (theme as 'light' | 'dark');
  }, [theme, systemTheme]);

  // Apply theme to DOM when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storage.set(THEME_STORAGE_KEY, newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
