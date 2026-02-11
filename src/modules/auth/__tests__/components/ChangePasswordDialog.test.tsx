import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════
// Mock heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('@/config/constants', () => ({
  VALIDATION_LIMITS: { email: { max: 255 }, password: { min: 8, max: 128 } },
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    minLength: (f: string, n: number) => `${f} min ${n}`,
    maxLength: (f: string, n: number) => `${f} max ${n}`,
    invalidEmail: 'Invalid email',
  },
}))

vi.mock('@/shared/hooks', () => ({
  useScrollToError: vi.fn(),
}))

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: {
    changePassword: vi.fn(),
  },
}))

// Mock Dialog components to render children directly
vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))

vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}))

import { ChangePasswordDialog } from '../../components/ChangePasswordDialog'

describe('ChangePasswordDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  }

  // ═══════════════════════════════════════════════════════════════
  // Open / Close
  // ═══════════════════════════════════════════════════════════════

  it('renders dialog content when open', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
  })

  it('does not render dialog content when closed', () => {
    render(<ChangePasswordDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument()
  })

  it('renders the description text', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    expect(
      screen.getByText(/enter your current password and choose a new password/i)
    ).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════
  // Form Inputs
  // ═══════════════════════════════════════════════════════════════

  it('renders current password input', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
  })

  it('renders new password input', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    expect(screen.getByLabelText('New Password')).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════
  // Buttons
  // ═══════════════════════════════════════════════════════════════

  it('renders Cancel and Change Password buttons', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════
  // Password Visibility Toggles
  // ═══════════════════════════════════════════════════════════════

  it('has password visibility toggle buttons for both fields', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    expect(toggleButtons).toHaveLength(2)
  })

  it('toggles current password visibility', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    const currentPasswordInput = screen.getByLabelText('Current Password')
    expect(currentPasswordInput).toHaveAttribute('type', 'password')

    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    fireEvent.click(toggleButtons[0])
    expect(currentPasswordInput).toHaveAttribute('type', 'text')
  })

  it('toggles new password visibility', () => {
    render(<ChangePasswordDialog {...defaultProps} />)
    const newPasswordInput = screen.getByLabelText('New Password')
    expect(newPasswordInput).toHaveAttribute('type', 'password')

    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    fireEvent.click(toggleButtons[1])
    expect(newPasswordInput).toHaveAttribute('type', 'text')
  })
})
