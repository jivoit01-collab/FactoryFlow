import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mock all heavy dependencies
// ═══════════════════════════════════════════════════════════════

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ state: null }),
}));

vi.mock('@/config/constants', () => ({
  AUTH_ROUTES: { login: '/login' },
  HTTP_STATUS: { UNAUTHORIZED: 401 },
}));

vi.mock('@/config/routes.config', () => ({
  ROUTES: {
    DASHBOARD: { path: '/' },
  },
}));

vi.mock('@/core/store', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('@/core/auth', () => ({
  updateUser: vi.fn(),
}));

vi.mock('@/core/auth/services/auth.service', () => ({
  authService: { getCurrentUser: vi.fn() },
}));

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: { clearAuthData: vi.fn() },
}));

vi.mock('@/core/auth/utils/tokenRefresh.util', () => ({
  ensureValidToken: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/shared/components/PageLoadError', () => ({
  PageLoadError: () => <div data-testid="page-load-error">Error Page</div>,
}));

// Prevent dynamic imports from failing
vi.mock('@/modules/dashboard/pages/DashboardPage', () => ({ default: () => null }));
vi.mock('@/modules/gate/pages/rawmaterialpages/RawMaterialsDashboard', () => ({
  default: () => null,
}));
vi.mock('@/modules/gate/pages/GateDashboardPage', () => ({ default: () => null }));

import { authService } from '@/core/auth/services/auth.service';
import { indexedDBService } from '@/core/auth/services/indexedDb.service';

import LoadingUserPage from '../../pages/LoadingUserPage';

describe('LoadingUserPage', () => {
  // ═══════════════════════════════════════════════════════════════
  // Loading State
  // ═══════════════════════════════════════════════════════════════

  it('shows loading text', () => {
    render(<LoadingUserPage />);
    expect(screen.getByText('Loading your account...')).toBeInTheDocument();
  });

  it('shows loading description', () => {
    render(<LoadingUserPage />);
    expect(screen.getByText(/please wait while we fetch your permissions/i)).toBeInTheDocument();
  });

  it('renders a spinner element', () => {
    const { container } = render(<LoadingUserPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // A rejected session is not a broken connection
  // ═══════════════════════════════════════════════════════════════

  describe('an expired session', () => {
    beforeEach(() => {
      navigate.mockClear();
      vi.mocked(indexedDBService.clearAuthData).mockClear();
    });

    it('sends a 401 to the login page, not to the error page', async () => {
      // The api client throws an ApiError carrying a STATUS. Its message is the
      // server's own wording -- "Authentication credentials were not provided."
      // -- which contains neither "401" nor "Unauthorized", so a check that
      // reads the message text strands the reader on "check your internet
      // connection" with the backend up and answering.
      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce({
        message: 'Authentication credentials were not provided.',
        status: 401,
      });

      render(<LoadingUserPage />);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
      expect(indexedDBService.clearAuthData).toHaveBeenCalled();
      expect(screen.queryByTestId('page-load-error')).not.toBeInTheDocument();
    });

    it('reads the status off a nested response too', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce({
        message: 'Request failed',
        response: { status: 401 },
      });

      render(<LoadingUserPage />);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
    });

    it('still redirects on a plain Error that names the status', async () => {
      // The fallback for code paths that throw a bare Error rather than an
      // ApiError -- losing a redirect strands the reader on a dead page.
      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(
        new Error('Request failed with status code 401'),
      );

      render(<LoadingUserPage />);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
    });

    it('leaves a genuine network failure on the error page', async () => {
      // The other half of the rule: a real outage must NOT bounce somebody to
      // login and make them think their session expired.
      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new Error('Network Error'));

      render(<LoadingUserPage />);

      await waitFor(() => expect(screen.getByTestId('page-load-error')).toBeInTheDocument());
      expect(navigate).not.toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
