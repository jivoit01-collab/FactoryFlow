import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Header — File Content Verification
//
// Imports lucide-react (6 icons), @/core/auth (useAuth),
// @/core/notifications (NotificationBell).
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/components/Header.tsx'),
    'utf-8',
  )
}

describe('Header', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports Header as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+Header/)
  })

  it('imports Menu, Moon, Sun, LogOut, User, Monitor from lucide-react', () => {
    const content = readSource()
    const iconImport = content.match(
      /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/,
    )
    expect(iconImport).not.toBeNull()
    const icons = iconImport![1]
    expect(icons).toContain('Menu')
    expect(icons).toContain('Moon')
    expect(icons).toContain('Sun')
    expect(icons).toContain('LogOut')
    expect(icons).toContain('User')
    expect(icons).toContain('Monitor')
  })

  it('imports useNavigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*useNavigate[^}]*\}\s*from\s*['"]react-router-dom['"]/,
    )
  })

  it('imports useAuth from @/core/auth', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*useAuth[^}]*\}\s*from\s*['"]@\/core\/auth['"]/,
    )
  })

  it('imports useTheme from @/shared/contexts', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*useTheme[^}]*\}\s*from\s*['"]@\/shared\/contexts['"]/,
    )
  })

  it('imports NotificationBell from @/core/notifications', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*NotificationBell[^}]*\}\s*from\s*['"]@\/core\/notifications['"]/,
    )
  })

  // ─── Props & Interface ───────────────────────────────────

  it('defines HeaderProps with onMenuClick callback', () => {
    const content = readSource()
    expect(content).toMatch(/interface\s+HeaderProps/)
    expect(content).toContain('onMenuClick: () => void')
  })

  it('defines HeaderProps with sidebarWidth number', () => {
    const content = readSource()
    expect(content).toContain('sidebarWidth: number')
  })

  // ─── Theme System ───────────────────────────────────────

  it('destructures theme, resolvedTheme, setTheme from useTheme', () => {
    const content = readSource()
    expect(content).toContain('theme, resolvedTheme, setTheme')
    expect(content).toContain('useTheme()')
  })

  it('imports THEME_OPTIONS from @/config/constants/app.constants', () => {
    const content = readSource()
    expect(content).toContain('THEME_OPTIONS')
    expect(content).toMatch(/from\s*['"]@\/config\/constants\/app\.constants['"]/)
  })

  it('defines getThemeIcon returning Monitor for system theme', () => {
    const content = readSource()
    expect(content).toContain('getThemeIcon')
    expect(content).toContain('THEME_OPTIONS.SYSTEM')
    expect(content).toContain('<Monitor')
  })

  it('returns Moon icon for light theme and Sun for dark theme', () => {
    const content = readSource()
    expect(content).toMatch(/resolvedTheme\s*===\s*['"]light['"]/)
    expect(content).toContain('<Moon')
    expect(content).toContain('<Sun')
  })

  it('renders DropdownMenuRadioGroup for theme selection', () => {
    const content = readSource()
    expect(content).toContain('<DropdownMenuRadioGroup')
    expect(content).toContain('THEME_OPTIONS.LIGHT')
    expect(content).toContain('THEME_OPTIONS.DARK')
    expect(content).toContain('THEME_OPTIONS.SYSTEM')
  })

  // ─── User Menu ──────────────────────────────────────────

  it('destructures user, currentCompany, logout from useAuth', () => {
    const content = readSource()
    expect(content).toContain('user, currentCompany, logout')
    expect(content).toContain('useAuth()')
  })

  it('defines getInitials function handling name, email, and fallback', () => {
    const content = readSource()
    expect(content).toMatch(/getInitials\s*=\s*\(name\?/)
    expect(content).toContain(".toUpperCase()")
    expect(content).toContain(".slice(0, 2)")
    expect(content).toContain("return 'U'")
  })

  it('renders Avatar with AvatarFallback', () => {
    const content = readSource()
    expect(content).toContain('<Avatar')
    expect(content).toContain('<AvatarFallback')
    expect(content).toContain('getInitials(user?.full_name, user?.email)')
  })

  it('navigates to Profile page on click', () => {
    const content = readSource()
    expect(content).toContain('ROUTES.PROFILE.path')
    expect(content).toContain('navigate(ROUTES.PROFILE.path)')
  })

  it('has logout menu item calling logout', () => {
    const content = readSource()
    expect(content).toContain('onClick={logout}')
    expect(content).toContain('Log out')
  })

  // ─── Layout ─────────────────────────────────────────────

  it('renders <header> with fixed positioning and sidebar-aware left offset', () => {
    const content = readSource()
    expect(content).toContain('<header')
    expect(content).toContain('fixed right-0 top-0 z-30')
    expect(content).toContain('style={{ left: sidebarWidth }}')
  })

  it('renders mobile menu button with md:hidden', () => {
    const content = readSource()
    expect(content).toContain('md:hidden')
    expect(content).toContain('onClick={onMenuClick}')
  })
})
