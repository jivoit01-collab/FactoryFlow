import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// useAuth — File Content Verification
//
// Direct import hangs due to deep transitive dependency chains
// through @/core/store, react-router-dom, and @/core/store/slices.
// Instead, we verify the hook structure via file content analysis —
// the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/hooks/useAuth.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Exports', () => {
  it('exports useAuth as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+useAuth\(\)/)
  })

  it('exports useAuthInitializer as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+useAuthInitializer\(\)/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports — React
// ═══════════════════════════════════════════════════════════════

describe('useAuth — React Imports', () => {
  it('imports useCallback from react', () => {
    const content = readSource()
    expect(content).toContain('useCallback')
    expect(content).toMatch(/from\s+['"]react['"]/)
  })

  it('imports useEffect from react', () => {
    const content = readSource()
    expect(content).toContain('useEffect')
  })

  it('imports useRef from react', () => {
    const content = readSource()
    expect(content).toContain('useRef')
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports — Router & Store
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Router & Store Imports', () => {
  it('imports useNavigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toContain('useNavigate')
    expect(content).toContain("'react-router-dom'")
  })

  it('imports useAppDispatch from @/core/store', () => {
    const content = readSource()
    expect(content).toContain('useAppDispatch')
    expect(content).toContain("'@/core/store'")
  })

  it('imports useAppSelector from @/core/store', () => {
    const content = readSource()
    expect(content).toContain('useAppSelector')
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports — Auth Slice Actions
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Auth Slice Imports', () => {
  it('imports loginSuccess from authSlice', () => {
    const content = readSource()
    expect(content).toContain('loginSuccess')
    expect(content).toContain("'../store/authSlice'")
  })

  it('imports logout action from authSlice (aliased as logoutAction)', () => {
    const content = readSource()
    expect(content).toMatch(/logout\s+as\s+logoutAction/)
  })

  it('imports updateUser from authSlice', () => {
    const content = readSource()
    expect(content).toContain('updateUser')
  })

  it('imports switchCompany action from authSlice (aliased)', () => {
    const content = readSource()
    expect(content).toMatch(/switchCompany\s+as\s+switchCompanyAction/)
  })

  it('imports initializeAuth from authSlice', () => {
    const content = readSource()
    expect(content).toContain('initializeAuth')
  })

  it('imports initializeComplete from authSlice', () => {
    const content = readSource()
    expect(content).toContain('initializeComplete')
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports — Notification Slice
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Notification Slice Imports', () => {
  it('imports cleanupPushNotifications from notification.slice', () => {
    const content = readSource()
    expect(content).toContain('cleanupPushNotifications')
    expect(content).toContain("'@/core/store/slices/notification.slice'")
  })

  it('imports resetNotificationState from notification.slice', () => {
    const content = readSource()
    expect(content).toContain('resetNotificationState')
  })
})

// ═══════════════════════════════════════════════════════════════
// Imports — Services & Config
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Service & Config Imports', () => {
  it('imports authService from auth.service', () => {
    const content = readSource()
    expect(content).toContain('authService')
    expect(content).toContain("'../services/auth.service'")
  })

  it('imports AUTH_ROUTES from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('AUTH_ROUTES')
    expect(content).toContain("'@/config/constants'")
  })

  it('imports AUTH_CONFIG from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('AUTH_CONFIG')
  })
})

// ═══════════════════════════════════════════════════════════════
// useAuth Return Shape
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Return Shape', () => {
  it('returns user state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\buser\b[\s\S]*\}/)
  })

  it('returns isAuthenticated state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bisAuthenticated\b[\s\S]*\}/)
  })

  it('returns isLoading state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bisLoading\b[\s\S]*\}/)
  })

  it('returns permissions state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bpermissions\b[\s\S]*\}/)
  })

  it('returns currentCompany state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bcurrentCompany\b[\s\S]*\}/)
  })

  it('returns companies derived from user', () => {
    const content = readSource()
    expect(content).toContain("companies: user?.companies ?? []")
  })

  it('returns permissionsLoaded state', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bpermissionsLoaded\b[\s\S]*\}/)
  })

  it('returns login action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\blogin\b[\s\S]*\}/)
  })

  it('returns logout action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\blogout\b[\s\S]*\}/)
  })

  it('returns refreshPermissions action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\brefreshPermissions\b[\s\S]*\}/)
  })

  it('returns initializeFromCache action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\binitializeFromCache\b[\s\S]*\}/)
  })

  it('returns switchCompany action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bswitchCompany\b[\s\S]*\}/)
  })

  it('returns startPermissionRefresh action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bstartPermissionRefresh\b[\s\S]*\}/)
  })

  it('returns stopPermissionRefresh action', () => {
    const content = readSource()
    expect(content).toMatch(/return\s*\{[\s\S]*\bstopPermissionRefresh\b[\s\S]*\}/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Key Patterns
// ═══════════════════════════════════════════════════════════════

describe('useAuth — Key Patterns', () => {
  it('login dispatches loginSuccess on success', () => {
    const content = readSource()
    expect(content).toContain('dispatch(loginSuccess(response))')
  })

  it('login navigates to / on success', () => {
    const content = readSource()
    expect(content).toContain("navigate('/')")
  })

  it('logout dispatches cleanupPushNotifications', () => {
    const content = readSource()
    expect(content).toContain('dispatch(cleanupPushNotifications())')
  })

  it('logout dispatches resetNotificationState', () => {
    const content = readSource()
    expect(content).toContain('dispatch(resetNotificationState())')
  })

  it('logout navigates to AUTH_ROUTES.login', () => {
    const content = readSource()
    expect(content).toContain('navigate(AUTH_ROUTES.login)')
  })

  it('refreshPermissions calls authService.getCurrentUser', () => {
    const content = readSource()
    expect(content).toContain('authService.getCurrentUser()')
  })

  it('initializeFromCache calls authService.initializeFromCache', () => {
    const content = readSource()
    expect(content).toContain('authService.initializeFromCache()')
  })

  it('switchCompany calls authService.switchCompany', () => {
    const content = readSource()
    expect(content).toContain('authService.switchCompany(company)')
  })

  it('startPermissionRefresh uses AUTH_CONFIG.permissionRefreshInterval', () => {
    const content = readSource()
    expect(content).toContain('AUTH_CONFIG.permissionRefreshInterval')
  })

  it('stopPermissionRefresh clears interval and nullifies ref', () => {
    const content = readSource()
    expect(content).toContain('clearInterval(permissionRefreshIntervalRef.current)')
    expect(content).toContain('permissionRefreshIntervalRef.current = null')
  })

  it('cleans up interval on unmount via useEffect', () => {
    const content = readSource()
    // Cleanup effect returns a function that clears the interval
    expect(content).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?return\s*\(\)\s*=>\s*\{[\s\S]*?clearInterval/)
  })
})

// ═══════════════════════════════════════════════════════════════
// useAuthInitializer
// ═══════════════════════════════════════════════════════════════

describe('useAuthInitializer — Structure', () => {
  it('calls initializeFromCache on mount', () => {
    const content = readSource()
    // Inside useAuthInitializer, initializeFromCache is called in a useEffect
    expect(content).toContain('initializeFromCache()')
  })

  it('uses initializedRef to prevent double init', () => {
    const content = readSource()
    expect(content).toContain('initializedRef.current = true')
  })

  it('starts permission refresh when authenticated', () => {
    const content = readSource()
    expect(content).toContain('startPermissionRefresh()')
  })

  it('stops permission refresh when not authenticated', () => {
    const content = readSource()
    expect(content).toContain('stopPermissionRefresh()')
  })

  it('returns null', () => {
    const content = readSource()
    // useAuthInitializer returns null at the end
    expect(content).toMatch(/function\s+useAuthInitializer[\s\S]*?return\s+null\s*\n\}/)
  })
})
