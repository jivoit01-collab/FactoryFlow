import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
}));

vi.mock('@/shared/hooks', () => ({
  useScrollToError: vi.fn(),
}));

// Mock UI components as simple HTML elements
vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}));

import { LoginForm } from '../../components/LoginForm';

describe('LoginForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  // ═══════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════

  it('renders email and password inputs', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders the submit button with "Sign In" text', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders email input with correct placeholder', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('renders password input with correct placeholder', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Loading State
  // ═══════════════════════════════════════════════════════════════

  it('shows "Signing in..." when isLoading is true', () => {
    render(<LoginForm {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
  });

  it('disables email input when loading', () => {
    render(<LoginForm {...defaultProps} isLoading={true} />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('disables password input when loading', () => {
    render(<LoginForm {...defaultProps} isLoading={true} />);
    expect(screen.getByLabelText('Password')).toBeDisabled();
  });

  it('disables submit button when loading', () => {
    render(<LoginForm {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  // ═══════════════════════════════════════════════════════════════
  // Password Visibility Toggle
  // ═══════════════════════════════════════════════════════════════

  it('has a password visibility toggle button', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('toggles password visibility when clicked', () => {
    render(<LoginForm {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Initially password is hidden
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

    // Click to show
    fireEvent.click(toggleButton);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

    // Click to hide again
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});
