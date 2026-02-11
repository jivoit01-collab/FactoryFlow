import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════
// Mock all heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/config/constants', () => ({
  APP_NAME: 'Jivo Wellness',
  VALIDATION_LIMITS: { email: { max: 255 }, password: { min: 8, max: 128 } },
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    minLength: (f: string, n: number) => `${f} min ${n}`,
    maxLength: (f: string, n: number) => `${f} max ${n}`,
    invalidEmail: 'Invalid email',
  },
}))

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    COMPANY_SELECTION: { path: '/select-company' },
  },
}))

vi.mock('@/core/store', () => ({
  useAppDispatch: () => vi.fn(),
}))

vi.mock('@/core/auth', () => ({
  loginSuccess: vi.fn(),
}))

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: { login: vi.fn() },
}))

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: { clearAuthData: vi.fn() },
}))

vi.mock('@/core/api/types', () => ({}))

vi.mock('@/shared/hooks', () => ({
  useScrollToError: vi.fn(),
}))

// Mock UI components as simple HTML elements
vi.mock('@/shared/components/ui', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}))

import LoginPage from '../../pages/LoginPage'

describe('LoginPage', () => {
  // ═══════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════

  it('renders the app name', () => {
    render(<LoginPage />)
    expect(screen.getByText('Jivo Wellness')).toBeInTheDocument()
  })

  it('renders the description text', () => {
    render(<LoginPage />)
    expect(screen.getByText('Enter your credentials to access the system')).toBeInTheDocument()
  })

  it('renders the brand logo', () => {
    render(<LoginPage />)
    const logo = screen.getByAltText('Jivo Wellness Logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/JivoWellnessLogo.png')
  })

  it('renders the LoginForm component', () => {
    render(<LoginPage />)
    // LoginForm renders email and password inputs
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('does not show error message initially', () => {
    render(<LoginPage />)
    // Error div has specific className, but no error text should be visible
    const errorElements = document.querySelectorAll('.text-destructive.bg-destructive\\/10')
    expect(errorElements).toHaveLength(0)
  })
})
