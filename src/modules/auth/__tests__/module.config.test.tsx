import { describe, it, expect, vi } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mock heavy dependencies to prevent resolution hangs
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const DummyIcon = () => null
vi.mock('lucide-react', () =>
  new Proxy({ __esModule: true }, {
    get: (_t, p) => (p === '__esModule' ? true : DummyIcon),
  }),
)

vi.mock('@/config/constants', () => ({
  VALIDATION_LIMITS: { email: { max: 255 }, password: { min: 8, max: 128 } },
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    minLength: (f: string, n: number) => `${f} min ${n}`,
    maxLength: (f: string, n: number) => `${f} max ${n}`,
    invalidEmail: 'Invalid email',
  },
  APP_NAME: 'Test App',
  AUTH_ROUTES: { login: '/login' },
}))

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    COMPANY_SELECTION: { path: '/select-company' },
    LOADING_USER: { path: '/loading-user' },
    DASHBOARD: { path: '/' },
  },
}))

// Mock UI components
const mkProxy = () =>
  new Proxy({ __esModule: true }, {
    get: (_t: any, p: string) => (p === '__esModule' ? true : (() => null)),
  })
vi.mock('@/shared/components/ui/button', () => mkProxy())
vi.mock('@/shared/components/ui/card', () => mkProxy())
vi.mock('@/shared/components/ui/input', () => mkProxy())
vi.mock('@/shared/components/ui/label', () => mkProxy())
vi.mock('@/shared/components/ui/dialog', () => mkProxy())
vi.mock('@/shared/components/ui/avatar', () => mkProxy())
vi.mock('@/shared/components/ui/badge', () => mkProxy())
vi.mock('@/shared/components/ui/separator', () => mkProxy())

// Mock shared hooks
vi.mock('@/shared/hooks', () => ({
  useScrollToError: vi.fn(),
}))

// Mock core auth
vi.mock('@/core/auth', () => ({
  loginSuccess: vi.fn(),
  switchCompany: vi.fn(),
  updateUser: vi.fn(),
  clearCurrentCompany: vi.fn(),
  useAuth: () => ({
    user: null,
    permissions: [],
    logout: vi.fn(),
    currentCompany: null,
  }),
}))

vi.mock('@/core/store', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => ({ auth: { user: null } }),
}))

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    changePassword: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: {
    clearAuthData: vi.fn(),
    updateCurrentCompany: vi.fn(),
  },
}))

vi.mock('@/core/auth/utils/tokenRefresh.util', () => ({
  ensureValidToken: vi.fn(),
}))

vi.mock('@/shared/components/PageLoadError', () => ({
  PageLoadError: () => null,
}))

import { authModuleConfig } from '../module.config'

describe('Auth Module Config', () => {
  // ═══════════════════════════════════════════════════════════════
  // Config Shape
  // ═══════════════════════════════════════════════════════════════

  it('has the correct module name', () => {
    expect(authModuleConfig.name).toBe('auth')
  })

  it('defines exactly 4 routes', () => {
    expect(authModuleConfig.routes).toHaveLength(4)
  })

  it('has an empty navigation array', () => {
    expect(authModuleConfig.navigation).toEqual([])
  })

  // ═══════════════════════════════════════════════════════════════
  // Route Paths
  // ═══════════════════════════════════════════════════════════════

  it('includes /login route', () => {
    const loginRoute = authModuleConfig.routes.find((r) => r.path === '/login')
    expect(loginRoute).toBeDefined()
    expect(loginRoute?.layout).toBe('auth')
    expect(loginRoute?.requiresAuth).toBe(false)
  })

  it('includes /select-company route', () => {
    const route = authModuleConfig.routes.find((r) => r.path === '/select-company')
    expect(route).toBeDefined()
    expect(route?.layout).toBe('auth')
    expect(route?.requiresAuth).toBe(false)
  })

  it('includes /loading-user route', () => {
    const route = authModuleConfig.routes.find((r) => r.path === '/loading-user')
    expect(route).toBeDefined()
    expect(route?.layout).toBe('auth')
    expect(route?.requiresAuth).toBe(false)
  })

  it('includes /profile route as protected', () => {
    const route = authModuleConfig.routes.find((r) => r.path === '/profile')
    expect(route).toBeDefined()
    expect(route?.layout).toBe('main')
    expect(route?.requiresAuth).toBe(true)
  })

  it('only /profile requires authentication', () => {
    const protectedRoutes = authModuleConfig.routes.filter((r) => r.requiresAuth === true)
    expect(protectedRoutes).toHaveLength(1)
    expect(protectedRoutes[0].path).toBe('/profile')
  })

  // ═══════════════════════════════════════════════════════════════
  // Route Elements
  // ═══════════════════════════════════════════════════════════════

  it('all routes have defined elements', () => {
    authModuleConfig.routes.forEach((route) => {
      expect(route.element).toBeDefined()
    })
  })
})
