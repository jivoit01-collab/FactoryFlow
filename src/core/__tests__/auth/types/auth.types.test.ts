import { describe, it, expect } from 'vitest'
import {
  getPermissions,
  getDefaultCompany,
  getActiveCompanies,
  hasRoleInAnyCompany,
  hasRoleInCompany,
} from '@/core/auth/types/auth.types'
import type {
  UserCompany,
  User,
  UserLogin,
  AuthState,
  LoginCredentials,
  TokensExpiresIn,
  LoginResponse,
  RefreshTokenResponse,
  MeResponse,
} from '@/core/auth/types/auth.types'

// ═══════════════════════════════════════════════════════════════
// Auth Types (src/core/auth/types/auth.types.ts) — Direct Import
//
// Pure TS interfaces + 5 utility functions. Zero runtime deps.
// ═══════════════════════════════════════════════════════════════

// ─── Test Fixtures ───────────────────────────────────────────

function makeCompany(overrides: Partial<UserCompany> = {}): UserCompany {
  return {
    company_id: 1,
    company_name: 'Test Corp',
    company_code: 'TC',
    role: 'admin',
    is_default: false,
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

function makeUserLogin(overrides: Partial<UserLogin> = {}): UserLogin {
  return {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    companies: [makeCompany()],
    ...overrides,
  }
}

describe('Auth Types', () => {
  // ─── Interface Shape Checks ───────────────────────────────

  it('UserCompany has all required fields', () => {
    const company = makeCompany()
    expect(company).toHaveProperty('company_id')
    expect(company).toHaveProperty('company_name')
    expect(company).toHaveProperty('company_code')
    expect(company).toHaveProperty('role')
    expect(company).toHaveProperty('is_default')
    expect(company).toHaveProperty('is_active')
  })

  it('User has all required fields', () => {
    const user = makeUser()
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('full_name')
    expect(user).toHaveProperty('employee_code')
    expect(user).toHaveProperty('is_active')
    expect(user).toHaveProperty('is_staff')
    expect(user).toHaveProperty('date_joined')
    expect(user).toHaveProperty('companies')
    expect(user).toHaveProperty('permissions')
  })

  it('AuthState has all required fields', () => {
    const state: AuthState = {
      user: null,
      permissions: [],
      currentCompany: null,
      access: '',
      refresh: '',
      expiresIn: 0,
      isAuthenticated: false,
      isLoading: false,
      permissionsLoaded: false,
    }
    expect(Object.keys(state)).toHaveLength(9)
  })

  it('LoginCredentials has email and password', () => {
    const creds: LoginCredentials = { email: 'a@b.com', password: 'pass' }
    expect(creds.email).toBe('a@b.com')
    expect(creds.password).toBe('pass')
  })

  it('TokensExpiresIn has access_expires_in and refresh_expires_in', () => {
    const tokens: TokensExpiresIn = { access_expires_in: 300, refresh_expires_in: 86400 }
    expect(tokens.access_expires_in).toBe(300)
    expect(tokens.refresh_expires_in).toBe(86400)
  })

  it('LoginResponse has user, access, refresh, tokensExpiresIn', () => {
    const resp: LoginResponse = {
      user: makeUserLogin(),
      access: 'abc',
      refresh: 'def',
      tokensExpiresIn: { access_expires_in: 300, refresh_expires_in: 86400 },
    }
    expect(resp.access).toBe('abc')
    expect(resp.user.email).toBe('test@example.com')
  })

  it('RefreshTokenResponse has access, refresh, tokensExpiresIn', () => {
    const resp: RefreshTokenResponse = {
      access: 'new-access',
      refresh: 'new-refresh',
      tokensExpiresIn: { access_expires_in: 300, refresh_expires_in: 86400 },
    }
    expect(resp.access).toBe('new-access')
  })

  it('MeResponse is User alias', () => {
    const resp: MeResponse = makeUser()
    expect(resp.id).toBe(1)
    expect(resp.permissions).toEqual(['view_gate', 'add_gate'])
  })

  // ─── getPermissions ───────────────────────────────────────

  it('getPermissions returns user.permissions array', () => {
    const user = makeUser({ permissions: ['perm_a', 'perm_b'] })
    expect(getPermissions(user)).toEqual(['perm_a', 'perm_b'])
  })

  it('getPermissions returns empty array when permissions is undefined-like', () => {
    const user = makeUser({ permissions: [] })
    expect(getPermissions(user)).toEqual([])
  })

  // ─── getDefaultCompany ────────────────────────────────────

  it('getDefaultCompany returns company with is_default=true', () => {
    const user = makeUserLogin({
      companies: [
        makeCompany({ company_id: 1, is_default: false }),
        makeCompany({ company_id: 2, is_default: true }),
      ],
    })
    expect(getDefaultCompany(user)?.company_id).toBe(2)
  })

  it('getDefaultCompany falls back to first company when no default', () => {
    const user = makeUserLogin({
      companies: [
        makeCompany({ company_id: 5, is_default: false }),
        makeCompany({ company_id: 6, is_default: false }),
      ],
    })
    expect(getDefaultCompany(user)?.company_id).toBe(5)
  })

  it('getDefaultCompany returns null for user with no companies', () => {
    const user = makeUserLogin({ companies: [] })
    expect(getDefaultCompany(user)).toBeNull()
  })

  // ─── getActiveCompanies ───────────────────────────────────

  it('getActiveCompanies filters to only active companies', () => {
    const user = makeUser({
      companies: [
        makeCompany({ company_id: 1, is_active: true }),
        makeCompany({ company_id: 2, is_active: false }),
        makeCompany({ company_id: 3, is_active: true }),
      ],
    })
    const active = getActiveCompanies(user)
    expect(active).toHaveLength(2)
    expect(active.map((c) => c.company_id)).toEqual([1, 3])
  })

  it('getActiveCompanies returns empty array when none active', () => {
    const user = makeUser({
      companies: [makeCompany({ is_active: false })],
    })
    expect(getActiveCompanies(user)).toHaveLength(0)
  })

  // ─── hasRoleInAnyCompany ──────────────────────────────────

  it('hasRoleInAnyCompany returns true when user has role in an active company', () => {
    const user = makeUser({
      companies: [makeCompany({ role: 'admin', is_active: true })],
    })
    expect(hasRoleInAnyCompany(user, 'admin')).toBe(true)
  })

  it('hasRoleInAnyCompany returns false when company is inactive', () => {
    const user = makeUser({
      companies: [makeCompany({ role: 'admin', is_active: false })],
    })
    expect(hasRoleInAnyCompany(user, 'admin')).toBe(false)
  })

  it('hasRoleInAnyCompany returns false when role does not match', () => {
    const user = makeUser({
      companies: [makeCompany({ role: 'operator', is_active: true })],
    })
    expect(hasRoleInAnyCompany(user, 'admin')).toBe(false)
  })

  // ─── hasRoleInCompany ─────────────────────────────────────

  it('hasRoleInCompany returns true for matching company + role + active', () => {
    const user = makeUser({
      companies: [makeCompany({ company_id: 10, role: 'supervisor', is_active: true })],
    })
    expect(hasRoleInCompany(user, 10, 'supervisor')).toBe(true)
  })

  it('hasRoleInCompany returns false for inactive company', () => {
    const user = makeUser({
      companies: [makeCompany({ company_id: 10, role: 'supervisor', is_active: false })],
    })
    expect(hasRoleInCompany(user, 10, 'supervisor')).toBe(false)
  })

  it('hasRoleInCompany returns false for non-existent company', () => {
    const user = makeUser({
      companies: [makeCompany({ company_id: 10 })],
    })
    expect(hasRoleInCompany(user, 999, 'admin')).toBe(false)
  })

  it('hasRoleInCompany returns false when role mismatches', () => {
    const user = makeUser({
      companies: [makeCompany({ company_id: 10, role: 'operator', is_active: true })],
    })
    expect(hasRoleInCompany(user, 10, 'admin')).toBe(false)
  })
})
