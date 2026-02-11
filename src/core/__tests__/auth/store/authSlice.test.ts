import { describe, it, expect } from 'vitest'
import reducer, {
  setLoading,
  initializeAuth,
  loginSuccess,
  updateTokens,
  updateUser,
  updatePermissions,
  switchCompany,
  clearCurrentCompany,
  setPermissionsLoading,
  logout,
  initializeComplete,
} from '@/core/auth/store/authSlice'
import type { AuthState, User, UserCompany, LoginResponse } from '@/core/auth/types/auth.types'

// ═══════════════════════════════════════════════════════════════
// Auth Slice (src/core/auth/store/authSlice.ts) — Direct Import
//
// Only depends on @reduxjs/toolkit + local auth.types (pure TS).
// ═══════════════════════════════════════════════════════════════

// ─── Test Fixtures ───────────────────────────────────────────

function makeCompany(overrides: Partial<UserCompany> = {}): UserCompany {
  return {
    company_id: 1,
    company_name: 'Test Corp',
    company_code: 'TC',
    role: 'admin',
    is_default: true,
    is_active: true,
    ...overrides,
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    employee_code: 'EMP001',
    is_active: true,
    is_staff: false,
    date_joined: '2024-01-01',
    companies: [makeCompany()],
    permissions: ['view_gate', 'add_gate'],
    ...overrides,
  }
}

const initialState: AuthState = {
  user: null,
  permissions: [],
  currentCompany: null,
  access: '',
  refresh: '',
  expiresIn: 0,
  isAuthenticated: false,
  isLoading: true,
  permissionsLoaded: false,
}

describe('Auth Slice', () => {
  // ─── Initial State ────────────────────────────────────────

  it('has correct initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(initialState)
  })

  it('isLoading starts as true (to check IndexedDB)', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state.isLoading).toBe(true)
  })

  // ─── setLoading ───────────────────────────────────────────

  it('setLoading sets isLoading to true', () => {
    const state = reducer({ ...initialState, isLoading: false }, setLoading(true))
    expect(state.isLoading).toBe(true)
  })

  it('setLoading sets isLoading to false', () => {
    const state = reducer(initialState, setLoading(false))
    expect(state.isLoading).toBe(false)
  })

  // ─── initializeAuth ───────────────────────────────────────

  it('initializeAuth sets all fields from cached data', () => {
    const company = makeCompany()
    const user = makeUser()
    const state = reducer(
      initialState,
      initializeAuth({
        user,
        permissions: ['perm_a'],
        currentCompany: company,
        access: 'tok-access',
        refresh: 'tok-refresh',
        expiresIn: 999,
      }),
    )
    expect(state.user).toEqual(user)
    expect(state.permissions).toEqual(['perm_a'])
    expect(state.currentCompany).toEqual(company)
    expect(state.access).toBe('tok-access')
    expect(state.refresh).toBe('tok-refresh')
    expect(state.expiresIn).toBe(999)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.permissionsLoaded).toBe(true)
  })

  // ─── loginSuccess ─────────────────────────────────────────

  it('loginSuccess sets tokens, user, and authentication', () => {
    const loginResponse: LoginResponse = {
      user: { id: 1, email: 'a@b.com', full_name: 'A', companies: [makeCompany()] },
      access: 'access-tok',
      refresh: 'refresh-tok',
      tokensExpiresIn: { access_expires_in: 300, refresh_expires_in: 86400 },
    }
    const state = reducer(initialState, loginSuccess(loginResponse))
    expect(state.access).toBe('access-tok')
    expect(state.refresh).toBe('refresh-tok')
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.permissionsLoaded).toBe(false)
    expect(state.currentCompany).toBeNull()
  })

  it('loginSuccess computes expiresIn from access_expires_in', () => {
    const before = Date.now()
    const loginResponse: LoginResponse = {
      user: { id: 1, email: 'a@b.com', full_name: 'A', companies: [] },
      access: 'a',
      refresh: 'r',
      tokensExpiresIn: { access_expires_in: 300, refresh_expires_in: 86400 },
    }
    const state = reducer(initialState, loginSuccess(loginResponse))
    const after = Date.now()
    // expiresIn should be ~Date.now() + 300*1000
    expect(state.expiresIn).toBeGreaterThanOrEqual(before + 300000)
    expect(state.expiresIn).toBeLessThanOrEqual(after + 300000)
  })

  // ─── updateTokens ────────────────────────────────────────

  it('updateTokens updates access, refresh, expiresIn', () => {
    const base = { ...initialState, access: 'old', refresh: 'old', expiresIn: 1 }
    const state = reducer(
      base,
      updateTokens({ access: 'new-a', refresh: 'new-r', expiresIn: 9999, refreshExpiresAt: 0 }),
    )
    expect(state.access).toBe('new-a')
    expect(state.refresh).toBe('new-r')
    expect(state.expiresIn).toBe(9999)
  })

  // ─── updateUser ───────────────────────────────────────────

  it('updateUser sets user, permissions, and permissionsLoaded', () => {
    const user = makeUser({ permissions: ['perm_x', 'perm_y'] })
    const state = reducer(initialState, updateUser(user))
    expect(state.user).toEqual(user)
    expect(state.permissions).toEqual(['perm_x', 'perm_y'])
    expect(state.permissionsLoaded).toBe(true)
  })

  it('updateUser sets currentCompany to default when no currentCompany', () => {
    const company = makeCompany({ company_id: 5, is_default: true })
    const user = makeUser({ companies: [company] })
    const state = reducer(initialState, updateUser(user))
    expect(state.currentCompany?.company_id).toBe(5)
  })

  it('updateUser switches to default when currentCompany is no longer available', () => {
    const oldCompany = makeCompany({ company_id: 99, is_default: false })
    const newCompany = makeCompany({ company_id: 1, is_default: true })
    const base = { ...initialState, currentCompany: oldCompany }
    const user = makeUser({ companies: [newCompany] })
    const state = reducer(base, updateUser(user))
    expect(state.currentCompany?.company_id).toBe(1)
  })

  it('updateUser keeps currentCompany when still available', () => {
    const company = makeCompany({ company_id: 1 })
    const base = { ...initialState, currentCompany: company }
    const user = makeUser({ companies: [company] })
    const state = reducer(base, updateUser(user))
    expect(state.currentCompany?.company_id).toBe(1)
  })

  // ─── updatePermissions ────────────────────────────────────

  it('updatePermissions sets permissions and marks loaded', () => {
    const state = reducer(initialState, updatePermissions(['a', 'b', 'c']))
    expect(state.permissions).toEqual(['a', 'b', 'c'])
    expect(state.permissionsLoaded).toBe(true)
  })

  // ─── switchCompany ────────────────────────────────────────

  it('switchCompany sets currentCompany', () => {
    const company = makeCompany({ company_id: 42 })
    const state = reducer(initialState, switchCompany(company))
    expect(state.currentCompany?.company_id).toBe(42)
  })

  // ─── clearCurrentCompany ──────────────────────────────────

  it('clearCurrentCompany sets currentCompany to null', () => {
    const base = { ...initialState, currentCompany: makeCompany() }
    const state = reducer(base, clearCurrentCompany())
    expect(state.currentCompany).toBeNull()
  })

  // ─── setPermissionsLoading ────────────────────────────────

  it('setPermissionsLoading sets permissionsLoaded to false', () => {
    const base = { ...initialState, permissionsLoaded: true }
    const state = reducer(base, setPermissionsLoading())
    expect(state.permissionsLoaded).toBe(false)
  })

  // ─── logout ───────────────────────────────────────────────

  it('logout resets all state except isLoading (which is false)', () => {
    const authed: AuthState = {
      user: makeUser(),
      permissions: ['a'],
      currentCompany: makeCompany(),
      access: 'tok',
      refresh: 'ref',
      expiresIn: 9999,
      isAuthenticated: true,
      isLoading: false,
      permissionsLoaded: true,
    }
    const state = reducer(authed, logout())
    expect(state.user).toBeNull()
    expect(state.permissions).toEqual([])
    expect(state.currentCompany).toBeNull()
    expect(state.access).toBe('')
    expect(state.refresh).toBe('')
    expect(state.expiresIn).toBe(0)
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.permissionsLoaded).toBe(false)
  })

  // ─── initializeComplete ───────────────────────────────────

  it('initializeComplete sets isLoading to false', () => {
    const state = reducer(initialState, initializeComplete())
    expect(state.isLoading).toBe(false)
  })

  // ─── Exported Actions ─────────────────────────────────────

  it('exports all 11 action creators', () => {
    const actions = [
      setLoading,
      initializeAuth,
      loginSuccess,
      updateTokens,
      updateUser,
      updatePermissions,
      switchCompany,
      clearCurrentCompany,
      setPermissionsLoading,
      logout,
      initializeComplete,
    ]
    actions.forEach((a) => expect(typeof a).toBe('function'))
  })

  it('exports default reducer as function', () => {
    expect(typeof reducer).toBe('function')
  })
})
