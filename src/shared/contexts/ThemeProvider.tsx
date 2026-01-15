import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { THEME_OPTIONS, type Theme } from '@/config/constants/app.constants'
import { storage } from '../utils/storage'

const THEME_STORAGE_KEY = 'FMS_theme'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Get system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Apply theme to document root
 */
function applyTheme(theme: 'light' | 'dark') {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'system'
    const stored = storage.get<string>(THEME_STORAGE_KEY)
    // Validate stored theme is one of the valid options
    if (
      stored &&
      (stored === THEME_OPTIONS.LIGHT ||
        stored === THEME_OPTIONS.DARK ||
        stored === THEME_OPTIONS.SYSTEM)
    ) {
      return stored as Theme
    }
    return THEME_OPTIONS.SYSTEM
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const initialTheme =
      theme === THEME_OPTIONS.SYSTEM ? getSystemTheme() : (theme as 'light' | 'dark')
    // Apply theme immediately on mount to prevent flash
    if (typeof window !== 'undefined') {
      applyTheme(initialTheme)
    }
    return initialTheme
  })

  // Update resolved theme when theme changes
  useEffect(() => {
    if (theme === THEME_OPTIONS.SYSTEM) {
      const systemTheme = getSystemTheme()
      setResolvedTheme(systemTheme)
      applyTheme(systemTheme)
    } else {
      const themeValue = theme as 'light' | 'dark'
      setResolvedTheme(themeValue)
      applyTheme(themeValue)
    }
  }, [theme])

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== THEME_OPTIONS.SYSTEM) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(newTheme)
      applyTheme(newTheme)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Fallback for older browsers
    else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme])

  // Apply theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    storage.set(THEME_STORAGE_KEY, newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
