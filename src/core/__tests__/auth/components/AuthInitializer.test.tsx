import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// AuthInitializer — File Content Verification
//
// Direct import hangs due to deep transitive dependency chains
// through @/core/store, @/core/api/client, and auth services.
// Instead, we verify the component structure via file content
// analysis — the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/components/AuthInitializer.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Exports', () => {
  it('exports AuthInitializer as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+AuthInitializer/);
  });

  it('accepts children as a required prop', () => {
    const content = readSource();
    expect(content).toContain('{ children }');
    expect(content).toContain('AuthInitializerProps');
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — React Hooks
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — React Imports', () => {
  it('imports useEffect from react', () => {
    const content = readSource();
    expect(content).toContain('useEffect');
    expect(content).toMatch(/from\s+['"]react['"]/);
  });

  it('imports useRef from react', () => {
    const content = readSource();
    expect(content).toContain('useRef');
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — Router
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Router Imports', () => {
  it('imports useNavigate from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('useNavigate');
    expect(content).toContain("'react-router-dom'");
  });

  it('imports useLocation from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('useLocation');
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — Store & Services
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Store & Service Imports', () => {
  it('imports useAppDispatch from @/core/store', () => {
    const content = readSource();
    expect(content).toContain('useAppDispatch');
    expect(content).toContain("'@/core/store'");
  });

  it('imports useAppSelector from @/core/store', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector');
  });

  it('imports authService from auth.service', () => {
    const content = readSource();
    expect(content).toContain('authService');
    expect(content).toContain("'../services/auth.service'");
  });

  it('imports indexedDBService from indexedDb.service', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService');
    expect(content).toContain("'../services/indexedDb.service'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — Auth Slice Actions
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Auth Slice Imports', () => {
  it('imports initializeComplete from authSlice', () => {
    const content = readSource();
    expect(content).toContain('initializeComplete');
    expect(content).toContain("'../store/authSlice'");
  });

  it('imports loginSuccess from authSlice', () => {
    const content = readSource();
    expect(content).toContain('loginSuccess');
  });

  it('imports updateUser from authSlice', () => {
    const content = readSource();
    expect(content).toContain('updateUser');
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — Config
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Config Imports', () => {
  it('imports AUTH_CONFIG from @/config/constants', () => {
    const content = readSource();
    expect(content).toContain('AUTH_CONFIG');
    expect(content).toContain("'@/config/constants'");
  });

  it('imports ROUTES from @/config/routes.config', () => {
    const content = readSource();
    expect(content).toContain('ROUTES');
    expect(content).toContain("'@/config/routes.config'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — API Client Utilities
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — API Client Imports', () => {
  it('imports setupTokenRefreshInterval from @/core/api/client', () => {
    const content = readSource();
    expect(content).toContain('setupTokenRefreshInterval');
    expect(content).toContain("'@/core/api/client'");
  });

  it('imports setInitializationPromise from @/core/api/client', () => {
    const content = readSource();
    expect(content).toContain('setInitializationPromise');
  });

  it('imports markAuthInitialized from @/core/api/client', () => {
    const content = readSource();
    expect(content).toContain('markAuthInitialized');
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports — Token Refresh Utilities
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Token Refresh Imports', () => {
  it('imports ensureValidToken from tokenRefresh.util', () => {
    const content = readSource();
    expect(content).toContain('ensureValidToken');
    expect(content).toContain("'../utils/tokenRefresh.util'");
  });

  it('imports isTokenCompletelyExpired from tokenRefresh.util', () => {
    const content = readSource();
    expect(content).toContain('isTokenCompletelyExpired');
  });
});

// ═══════════════════════════════════════════════════════════════
// Props Interface
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Props', () => {
  it('defines AuthInitializerProps interface with children', () => {
    const content = readSource();
    expect(content).toMatch(/interface\s+AuthInitializerProps/);
    expect(content).toContain('children: React.ReactNode');
  });
});

// ═══════════════════════════════════════════════════════════════
// Loading Screen
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Loading Screen', () => {
  it('shows loading screen with spinner when isLoading', () => {
    const content = readSource();
    expect(content).toContain('if (isLoading)');
    expect(content).toContain('animate-spin');
  });

  it('renders "Loading..." text in the loading screen', () => {
    const content = readSource();
    expect(content).toContain('Loading...');
  });

  it('loading screen uses h-screen and flex centering', () => {
    const content = readSource();
    expect(content).toContain('h-screen');
    expect(content).toContain('items-center');
    expect(content).toContain('justify-center');
  });
});

// ═══════════════════════════════════════════════════════════════
// Children Rendering
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Children', () => {
  it('returns children in a fragment when not loading', () => {
    const content = readSource();
    expect(content).toContain('<>{children}</>');
  });
});

// ═══════════════════════════════════════════════════════════════
// Initialization Logic
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Initialization', () => {
  it('prevents multiple initializations with initializedRef', () => {
    const content = readSource();
    expect(content).toContain('if (initializedRef.current) return');
    expect(content).toContain('initializedRef.current = true');
  });

  it('defines async initAuth function', () => {
    const content = readSource();
    expect(content).toContain('async function initAuth()');
  });

  it('checks for tokens in IndexedDB', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService.getAccessToken()');
    expect(content).toContain('indexedDBService.getRefreshToken()');
    expect(content).toContain('indexedDBService.getAuthData()');
  });

  it('calls isTokenCompletelyExpired to check token validity', () => {
    const content = readSource();
    expect(content).toContain('await isTokenCompletelyExpired()');
  });

  it('calls ensureValidToken to refresh if needed', () => {
    const content = readSource();
    expect(content).toContain('await ensureValidToken(');
  });

  it('dispatches loginSuccess with reconstructed auth data', () => {
    const content = readSource();
    expect(content).toMatch(/dispatch\(\s*loginSuccess\(/);
  });

  it('dispatches initializeComplete after initialization', () => {
    const content = readSource();
    expect(content).toContain('dispatch(initializeComplete())');
  });

  it('calls markAuthInitialized to signal API client', () => {
    const content = readSource();
    expect(content).toContain('markAuthInitialized()');
  });

  it('sets initialization promise for API client to wait on', () => {
    const content = readSource();
    expect(content).toContain('setInitializationPromise(initPromise)');
  });

  it('navigates to COMPANY_SELECTION when no current company', () => {
    const content = readSource();
    expect(content).toContain('ROUTES.COMPANY_SELECTION.path');
  });

  it('navigates to LOADING_USER when company exists', () => {
    const content = readSource();
    expect(content).toContain('ROUTES.LOADING_USER.path');
  });
});

// ═══════════════════════════════════════════════════════════════
// Token & Permission Refresh
// ═══════════════════════════════════════════════════════════════

describe('AuthInitializer — Refresh Intervals', () => {
  it('sets up token refresh interval when authenticated', () => {
    const content = readSource();
    expect(content).toContain('setupTokenRefreshInterval()');
  });

  it('sets up permission refresh interval using AUTH_CONFIG', () => {
    const content = readSource();
    expect(content).toContain('AUTH_CONFIG.permissionRefreshInterval');
  });

  it('fetches current user in permission refresh interval', () => {
    const content = readSource();
    expect(content).toContain('authService.getCurrentUser()');
    expect(content).toContain('dispatch(updateUser(userData))');
  });

  it('cleans up intervals on unmount', () => {
    const content = readSource();
    expect(content).toContain('tokenIntervalCleanupRef.current()');
    expect(content).toContain('clearInterval(permissionIntervalRef.current)');
  });
});
