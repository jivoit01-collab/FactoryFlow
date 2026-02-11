import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════
// Mock all heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
}))

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    LOADING_USER: { path: '/loading-user' },
  },
}))

const mockDispatch = vi.fn()
let mockAuthState = { user: null as any }

vi.mock('@/core/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ auth: mockAuthState }),
}))

vi.mock('@/core/auth', () => ({
  switchCompany: vi.fn((c) => ({ type: 'switchCompany', payload: c })),
}))

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: { updateCurrentCompany: vi.fn() },
}))

vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon" />,
}))

// Mock UI components
vi.mock('@/shared/components/ui', () => ({
  Card: ({ children, onClick, ...props }: any) => (
    <div onClick={onClick} {...props}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

import CompanySelectionPage from '../../pages/CompanySelectionPage'

describe('CompanySelectionPage', () => {
  beforeEach(() => {
    mockAuthState = { user: null }
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════
  // No User / No Companies
  // ═══════════════════════════════════════════════════════════════

  it('shows "No Companies Available" when user is null', () => {
    mockAuthState = { user: null }
    render(<CompanySelectionPage />)
    expect(screen.getByText('No Companies Available')).toBeInTheDocument()
  })

  it('shows "No Companies Available" when companies array is empty', () => {
    mockAuthState = { user: { companies: [] } }
    render(<CompanySelectionPage />)
    expect(screen.getByText('No Companies Available')).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════
  // Company List Rendering
  // ═══════════════════════════════════════════════════════════════

  it('renders company list when companies exist', () => {
    mockAuthState = {
      user: {
        companies: [
          { company_id: 1, company_name: 'Acme Corp', company_code: 'ACME', role: 'Admin', is_default: true, is_active: true },
          { company_id: 2, company_name: 'Beta Inc', company_code: 'BETA', role: 'User', is_default: false, is_active: true },
        ],
      },
    }
    render(<CompanySelectionPage />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Beta Inc')).toBeInTheDocument()
  })

  it('displays company role and code', () => {
    mockAuthState = {
      user: {
        companies: [
          { company_id: 1, company_name: 'Acme Corp', company_code: 'ACME', role: 'Admin', is_default: true, is_active: true },
        ],
      },
    }
    render(<CompanySelectionPage />)
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
    expect(screen.getByText(/ACME/)).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════
  // Continue Button
  // ═══════════════════════════════════════════════════════════════

  it('renders Continue button disabled when no company is selected', () => {
    mockAuthState = {
      user: {
        companies: [
          { company_id: 1, company_name: 'Acme Corp', company_code: 'ACME', role: 'Admin', is_default: true, is_active: true },
        ],
      },
    }
    render(<CompanySelectionPage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  // ═══════════════════════════════════════════════════════════════
  // Page Header
  // ═══════════════════════════════════════════════════════════════

  it('renders the page title "Select Company"', () => {
    mockAuthState = {
      user: {
        companies: [
          { company_id: 1, company_name: 'Acme Corp', company_code: 'ACME', role: 'Admin', is_default: true, is_active: true },
        ],
      },
    }
    render(<CompanySelectionPage />)
    expect(screen.getByText('Select Company')).toBeInTheDocument()
  })
})
