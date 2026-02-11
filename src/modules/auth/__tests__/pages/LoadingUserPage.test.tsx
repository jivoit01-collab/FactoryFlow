import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════
// Mock all heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
}))

vi.mock('@/config/constants', () => ({
  AUTH_ROUTES: { login: '/login' },
}))

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    DASHBOARD: { path: '/' },
  },
}))

vi.mock('@/core/store', () => ({
  useAppDispatch: () => vi.fn(),
}))

vi.mock('@/core/auth', () => ({
  updateUser: vi.fn(),
}))

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: { getCurrentUser: vi.fn() },
}))

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: { clearAuthData: vi.fn() },
}))

vi.mock('@/core/auth/utils/tokenRefresh.util', () => ({
  ensureValidToken: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/shared/components/PageLoadError', () => ({
  PageLoadError: () => <div data-testid="page-load-error">Error Page</div>,
}))

// Prevent dynamic imports from failing
vi.mock('@/modules/dashboard/pages/DashboardPage', () => ({ default: () => null }))
vi.mock('@/modules/gate/pages/rawmaterialpages/RawMaterialsDashboard', () => ({ default: () => null }))
vi.mock('@/modules/gate/pages/GateDashboardPage', () => ({ default: () => null }))

import LoadingUserPage from '../../pages/LoadingUserPage'

describe('LoadingUserPage', () => {
  // ═══════════════════════════════════════════════════════════════
  // Loading State
  // ═══════════════════════════════════════════════════════════════

  it('shows loading text', () => {
    render(<LoadingUserPage />)
    expect(screen.getByText('Loading your account...')).toBeInTheDocument()
  })

  it('shows loading description', () => {
    render(<LoadingUserPage />)
    expect(
      screen.getByText(/please wait while we fetch your permissions/i)
    ).toBeInTheDocument()
  })

  it('renders a spinner element', () => {
    const { container } = render(<LoadingUserPage />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
