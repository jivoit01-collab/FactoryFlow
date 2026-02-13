import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mock all heavy dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    COMPANY_SELECTION: { path: '/select-company' },
  },
}));

const mockUser = {
  id: 1,
  email: 'john@example.com',
  full_name: 'John Doe',
  employee_code: 'EMP001',
  is_active: true,
  is_staff: true,
  date_joined: '2024-01-15T10:00:00Z',
  companies: [
    {
      company_id: 1,
      company_name: 'Acme Corp',
      company_code: 'ACME',
      role: 'Admin',
      is_default: true,
      is_active: true,
    },
  ],
  permissions: ['accounts.add_user', 'accounts.view_user'],
};

const mockCurrentCompany = {
  company_id: 1,
  company_name: 'Acme Corp',
  company_code: 'ACME',
  role: 'Admin',
  is_default: true,
  is_active: true,
};

let mockAuthReturn: any = {
  user: mockUser,
  permissions: mockUser.permissions,
  logout: vi.fn(),
  currentCompany: mockCurrentCompany,
};

vi.mock('@/core/auth', () => ({
  useAuth: () => mockAuthReturn,
  clearCurrentCompany: vi.fn(() => ({ type: 'clearCurrentCompany' })),
}));

vi.mock('@/core/store', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: { updateCurrentCompany: vi.fn() },
}));

// Mock UI components
vi.mock('@/shared/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/shared/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/shared/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/shared/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/shared/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

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

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: { changePassword: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Eye: () => <span />,
  EyeOff: () => <span />,
}));

import ProfilePage from '../../pages/ProfilePage';

describe('ProfilePage', () => {
  beforeEach(() => {
    mockAuthReturn = {
      user: mockUser,
      permissions: mockUser.permissions,
      logout: vi.fn(),
      currentCompany: mockCurrentCompany,
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // No User State
  // ═══════════════════════════════════════════════════════════════

  it('shows loading message when user is null', () => {
    mockAuthReturn = {
      user: null,
      permissions: [],
      logout: vi.fn(),
      currentCompany: null,
    };
    render(<ProfilePage />);
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // User Info
  // ═══════════════════════════════════════════════════════════════

  it('renders user full name', () => {
    render(<ProfilePage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<ProfilePage />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders employee code', () => {
    render(<ProfilePage />);
    expect(screen.getByText('EMP001')).toBeInTheDocument();
  });

  it('renders user initials in avatar', () => {
    render(<ProfilePage />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Status Badges
  // ═══════════════════════════════════════════════════════════════

  it('renders Active badge for active user', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders Staff badge for staff user', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Action Buttons
  // ═══════════════════════════════════════════════════════════════

  it('renders Change Password button', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('renders Logout button', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders Change Company button when currentCompany exists', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /change company/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Roles Section
  // ═══════════════════════════════════════════════════════════════

  it('renders Roles section title', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('renders company role cards', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Permissions Section
  // ═══════════════════════════════════════════════════════════════

  it('renders Permissions section title', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });

  it('renders grouped permissions', () => {
    render(<ProfilePage />);
    expect(screen.getByText('accounts')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    expect(screen.getByText('View User')).toBeInTheDocument();
  });
});
