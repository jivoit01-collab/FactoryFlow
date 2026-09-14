import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AUTH_ROUTES, HTTP_STATUS } from '@/config/constants';
import { ROUTES } from '@/config/routes.config';
import { updateUser } from '@/core/auth';
import { authService } from '@/core/auth/services/auth.service';
import { indexedDBService } from '@/core/auth/services/indexedDb.service';
import { ensureValidToken } from '@/core/auth/utils/tokenRefresh.util';
import { useAppDispatch } from '@/core/store';
import { PageLoadError } from '@/shared/components/PageLoadError';

/**
 * Was this a rejected session rather than a broken connection?
 *
 * Read off the STATUS, not the message text. The api client throws an
 * `ApiError` whose `message` is the server's own `detail` — for a rejected
 * token that is "Authentication credentials were not provided.", which contains
 * neither "401" nor "Unauthorized". Matching on those strings therefore missed
 * every real expiry and sent the reader to "check your internet connection"
 * with the backend up and answering.
 *
 * The string check stays as a fallback for the paths that still throw a plain
 * `Error` — losing a redirect is worse than an extra one, because the failure
 * mode is a dead-end page on a working system.
 */
function isUnauthorized(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number; response?: { status?: number } }).status;
    const responseStatus = (error as { response?: { status?: number } }).response?.status;
    if (status === HTTP_STATUS.UNAUTHORIZED || responseStatus === HTTP_STATUS.UNAUTHORIZED) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    (error.message.includes('401') || error.message.includes('Unauthorized'))
  );
}

/**
 * LoadingUserPage component
 *
 * Fetches full user data from /auth/me endpoint after login.
 * Handles token validation, refresh, and error states.
 *
 * This page is shown after login to ensure fresh user data and permissions
 * are loaded before navigating to the dashboard.
 */
export default function LoadingUserPage() {
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const loadingRef = useRef(false);

  // Get the intended URL from navigation state (passed from AuthInitializer)
  const from = (location.state as { from?: string })?.from || ROUTES.DASHBOARD.path;

  // Prefetch likely next pages while loading user data
  useEffect(() => {
    // Prefetch common pages in the background
    // These will be ready by the time the user navigates
    import('@/modules/gate/pages/rawMaterialPages/RawMaterialsDashboard');
    import('@/modules/gate/pages/GateDashboardPage');
  }, []);

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    /**
     * Validates token, refreshes if needed, and fetches user data
     */
    async function checkAndLoadUser() {
      try {
        // Ensure token is valid (checks expiry and refreshes if needed)
        const validToken = await ensureValidToken(async () => {
          await indexedDBService.clearAuthData();
          navigate(AUTH_ROUTES.login, { replace: true });
        });

        if (!validToken) {
          // Token expired or refresh failed, already redirected
          return;
        }

        // Fetch full user data from /auth/me
        const userData = await authService.getCurrentUser();

        // Update Redux with full user data (this sets permissionsLoaded to true)
        dispatch(updateUser(userData));

        // Navigate to the intended URL (or dashboard if none)
        navigate(from, { replace: true });
      } catch (err) {
        // An expired session sends you to the login page; anything else is a
        // real failure worth showing.
        if (isUnauthorized(err)) {
          await indexedDBService.clearAuthData();
          navigate(AUTH_ROUTES.login, { replace: true });
        } else {
          // Other errors (timeout, network issues) - show error page
          setError(err instanceof Error ? err.message : 'Failed to load user data');
        }
      } finally {
        loadingRef.current = false;
      }
    }

    checkAndLoadUser();
  }, [dispatch, navigate]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <PageLoadError />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center">
          <p className="text-lg font-medium">Loading your account...</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we fetch your permissions and company information
          </p>
        </div>
      </div>
    </div>
  );
}
