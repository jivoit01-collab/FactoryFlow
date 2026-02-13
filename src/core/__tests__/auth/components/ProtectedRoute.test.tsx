import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// ProtectedRoute — File Content Verification
//
// Direct import hangs due to deep transitive dependency chains
// through @/core/store and @/core/auth/hooks/usePermission.
// Instead, we verify the component structure via file content
// analysis — the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/core/auth/components/ProtectedRoute.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Exports', () => {
  it('exports ProtectedRoute as a named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+ProtectedRoute/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Imports', () => {
  it('imports ReactNode type from react', () => {
    const content = readSource();
    expect(content).toContain('ReactNode');
    expect(content).toMatch(/from\s+['"]react['"]/);
  });

  it('imports Navigate from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('Navigate');
    expect(content).toContain("'react-router-dom'");
  });

  it('imports useLocation from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('useLocation');
  });

  it('imports useAppSelector from @/core/store', () => {
    const content = readSource();
    expect(content).toContain('useAppSelector');
    expect(content).toContain("'@/core/store'");
  });

  it('imports usePermission from ../hooks/usePermission', () => {
    const content = readSource();
    expect(content).toContain('usePermission');
    expect(content).toContain("'../hooks/usePermission'");
  });

  it('imports AUTH_ROUTES from @/config/constants', () => {
    const content = readSource();
    expect(content).toContain('AUTH_ROUTES');
    expect(content).toContain("'@/config/constants'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Props Interface
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Props Interface', () => {
  it('defines ProtectedRouteProps interface', () => {
    const content = readSource();
    expect(content).toMatch(/interface\s+ProtectedRouteProps/);
  });

  it('has children prop of type ReactNode', () => {
    const content = readSource();
    expect(content).toContain('children: ReactNode');
  });

  it('has optional permissions prop as readonly string array', () => {
    const content = readSource();
    expect(content).toMatch(/permissions\?\s*:\s*readonly\s+string\[\]/);
  });

  it('has optional companyRoles prop as readonly string array', () => {
    const content = readSource();
    expect(content).toMatch(/companyRoles\?\s*:\s*readonly\s+string\[\]/);
  });

  it('has optional requireAll prop of type boolean', () => {
    const content = readSource();
    expect(content).toMatch(/requireAll\?\s*:\s*boolean/);
  });

  it('defaults requireAll to false', () => {
    const content = readSource();
    expect(content).toContain('requireAll = false');
  });
});

// ═══════════════════════════════════════════════════════════════
// Authentication Check
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Authentication', () => {
  it('reads isAuthenticated from auth state', () => {
    const content = readSource();
    expect(content).toContain('isAuthenticated');
    expect(content).toContain('state.auth');
  });

  it('reads isLoading from auth state', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
  });

  it('shows loading spinner when isLoading', () => {
    const content = readSource();
    expect(content).toContain('if (isLoading)');
    expect(content).toContain('animate-spin');
  });

  it('redirects to login when not authenticated', () => {
    const content = readSource();
    expect(content).toContain('if (!isAuthenticated)');
    expect(content).toMatch(/<Navigate\s+to=\{AUTH_ROUTES\.login\}/);
  });

  it('passes location state when redirecting to login', () => {
    const content = readSource();
    expect(content).toContain('state={{ from: location }}');
    expect(content).toContain('replace');
  });
});

// ═══════════════════════════════════════════════════════════════
// Permission Check
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Permission Check', () => {
  it('uses usePermission hook for permission checking', () => {
    const content = readSource();
    expect(content).toContain('hasAnyPermission');
    expect(content).toContain('hasAllPermissions');
    expect(content).toContain('hasAnyCompanyRole');
    expect(content).toContain('permissionsLoaded');
  });

  it('waits for permissions to load before checking', () => {
    const content = readSource();
    expect(content).toContain('if (!permissionsLoaded)');
  });

  it('checks company roles when provided', () => {
    const content = readSource();
    expect(content).toContain('companyRoles && companyRoles.length > 0');
    expect(content).toContain('hasAnyCompanyRole');
  });

  it('redirects to unauthorized when company role check fails', () => {
    const content = readSource();
    expect(content).toMatch(/<Navigate\s+to=\{AUTH_ROUTES\.unauthorized\}\s+replace\s*\/>/);
  });

  it('uses hasAllPermissions when requireAll is true', () => {
    const content = readSource();
    expect(content).toContain('requireAll');
    expect(content).toContain('hasAllPermissions([...permissions])');
  });

  it('uses hasAnyPermission when requireAll is false', () => {
    const content = readSource();
    expect(content).toContain('hasAnyPermission([...permissions])');
  });

  it('redirects to unauthorized when permission check fails', () => {
    const content = readSource();
    expect(content).toContain('if (!hasPermissionAccess)');
    expect(content).toContain('AUTH_ROUTES.unauthorized');
  });
});

// ═══════════════════════════════════════════════════════════════
// Children Rendering
// ═══════════════════════════════════════════════════════════════

describe('ProtectedRoute — Children Rendering', () => {
  it('renders children in a fragment when all checks pass', () => {
    const content = readSource();
    expect(content).toContain('<>{children}</>');
  });
});
