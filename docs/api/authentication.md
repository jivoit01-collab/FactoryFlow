# Authentication

This document describes the authentication system, including login flow, token management, and permission-based access control.

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. App Start                                                    │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              AuthInitializer Component                       ││
│  │  • Check IndexedDB for cached auth                          ││
│  │  • If found, restore to Redux                               ││
│  │  • Validate token expiry                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ├─── No cached auth ──────────────────┐                     │
│     │                                      ▼                     │
│     │                              ┌─────────────┐              │
│     │                              │   /login    │              │
│     │                              │    Page     │              │
│     │                              └─────────────┘              │
│     │                                      │                     │
│     │                   Login credentials  │                     │
│     │                                      ▼                     │
│     │                              ┌─────────────┐              │
│     │                              │  POST       │              │
│     │                              │  /auth/login│              │
│     │                              └─────────────┘              │
│     │                                      │                     │
│     ▼                                      ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Store Auth Data                           ││
│  │  • Redux state (access, refresh, user)                      ││
│  │  • IndexedDB (persistent storage)                           ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Company Selection (if multiple)                 ││
│  │  /select-company                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Load User Data                                  ││
│  │  /loading-user → GET /auth/me                               ││
│  └─────────────────────────────────────────────────────────────┘│
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Main Application                                ││
│  │  / (Dashboard)                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Auth Service

Location: `src/core/auth/services/auth.service.ts`

### Login

```typescript
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  expiresIn: number;
  user: User;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return data.data;
  },
};
```

### Logout

```typescript
export const authService = {
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      // Clear local storage and redirect regardless of API response
      await indexedDbService.clearAuth();
      store.dispatch(logout());
    }
  },
};
```

### Refresh Token

```typescript
export const authService = {
  refreshToken: async (): Promise<TokenResponse> => {
    const state = store.getState();
    const { refresh } = state.auth;

    const { data } = await apiClient.post<ApiResponse<TokenResponse>>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh }
    );

    // Update tokens in store and IndexedDB
    store.dispatch(updateTokens(data.data));
    await indexedDbService.saveAuth(data.data);

    return data.data;
  },
};
```

### Get Current User

```typescript
export const authService = {
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.AUTH.ME
    );
    return data.data;
  },
};
```

## Token Management

### Storage Strategy

Tokens are stored in **IndexedDB** for security and persistence:

```typescript
// src/core/auth/services/indexedDb.service.ts

const DB_NAME = 'factoryManagementAuth';
const STORE_NAME = 'auth';

export const indexedDbService = {
  saveAuth: async (authData: AuthData): Promise<void> => {
    const db = await openDB(DB_NAME, 1);
    await db.put(STORE_NAME, authData, 'currentAuth');
  },

  getAuth: async (): Promise<AuthData | null> => {
    const db = await openDB(DB_NAME, 1);
    return db.get(STORE_NAME, 'currentAuth');
  },

  clearAuth: async (): Promise<void> => {
    const db = await openDB(DB_NAME, 1);
    await db.delete(STORE_NAME, 'currentAuth');
  },
};
```

### Token Refresh Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token Refresh Strategy                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Token Timeline:                                                 │
│                                                                  │
│  ├───────────────────────────────────────────────────────┤      │
│  0                        6min                          7min     │
│  │                         │                             │       │
│  Token                   Proactive                     Token     │
│  Issued                   Refresh                     Expires    │
│                          (1min before)                           │
│                                                                  │
│  Refresh Triggers:                                               │
│  1. Proactive: Token < 1 minute from expiry                     │
│  2. Reactive: 401 response from API                             │
│  3. Periodic: Check every 30 seconds                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Refresh Implementation

Location: `src/core/auth/utils/tokenRefresh.util.ts`

```typescript
const REFRESH_THRESHOLD = 60 * 1000; // 1 minute before expiry
const CHECK_INTERVAL = 30 * 1000;    // Check every 30 seconds

export function shouldRefreshToken(expiresIn: number): boolean {
  const now = Date.now();
  const expiryTime = expiresIn * 1000; // Convert to milliseconds
  return expiryTime - now < REFRESH_THRESHOLD;
}

export function startTokenRefreshTimer(): void {
  setInterval(async () => {
    const state = store.getState();
    const { isAuthenticated, expiresIn } = state.auth;

    if (isAuthenticated && shouldRefreshToken(expiresIn)) {
      try {
        await authService.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        store.dispatch(logout());
      }
    }
  }, CHECK_INTERVAL);
}
```

### Concurrent Request Handling

When multiple requests are made while the token is being refreshed, they are queued:

```typescript
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

async function refreshTokenWithQueue(): Promise<string> {
  if (isRefreshing) {
    // Add to queue and wait
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const { access } = await authService.refreshToken();

    // Resolve all queued requests
    refreshQueue.forEach(({ resolve }) => resolve(access));
    refreshQueue = [];

    return access;
  } catch (error) {
    // Reject all queued requests
    refreshQueue.forEach(({ reject }) => reject(error));
    refreshQueue = [];
    throw error;
  } finally {
    isRefreshing = false;
  }
}
```

## Permission System

### Permission Format

Permissions follow Django's format: `app_label.permission_codename`

```typescript
// Example permissions
const permissions = [
  'gatein.view_dashboard',
  'gatein.add_vehicleentry',
  'gatein.change_vehicleentry',
  'gatein.delete_vehicleentry',
  'qualitycheck.view_qualitycheck',
  'qualitycheck.add_qualitycheck',
];
```

### Permission Checking

Location: `src/core/auth/hooks/usePermission.ts`

```typescript
export function usePermission() {
  const permissions = useAppSelector((state) => state.auth.permissions);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      return requiredPermissions.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      return requiredPermissions.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
```

### Usage Example

```typescript
import { usePermission } from '@/core/auth/hooks/usePermission';

function VehicleEntryActions({ entry }) {
  const { hasPermission } = usePermission();

  return (
    <div>
      {hasPermission('gatein.change_vehicleentry') && (
        <Button onClick={() => handleEdit(entry)}>Edit</Button>
      )}
      {hasPermission('gatein.delete_vehicleentry') && (
        <Button variant="destructive" onClick={() => handleDelete(entry)}>
          Delete
        </Button>
      )}
    </div>
  );
}
```

## Protected Routes

Location: `src/core/auth/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  requireAllPermissions?: boolean;
}

export function ProtectedRoute({
  children,
  permissions = [],
  requireAllPermissions = false,
}: ProtectedRouteProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { hasAnyPermission, hasAllPermissions } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  if (!isAuthenticated) {
    return null;
  }

  // Check permissions if specified
  if (permissions.length > 0) {
    const hasAccess = requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
```

### Route Configuration

Location: `src/config/routes.config.ts`

```typescript
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes with permissions
  DASHBOARD: {
    path: '/',
    permissions: ['gatein.view_dashboard'],
  },

  GATE: {
    RAW_MATERIALS: {
      path: '/gate/raw-materials',
      permissions: ['gatein.view_rawmaterialentry'],
    },
    RAW_MATERIALS_NEW: {
      path: '/gate/raw-materials/new',
      permissions: ['gatein.add_rawmaterialentry'],
    },
  },
};
```

## Auth Hooks

### useAuth Hook

Location: `src/core/auth/hooks/useAuth.ts`

```typescript
export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    dispatch(setAuth(response));
    await indexedDbService.saveAuth(response);
    return response;
  };

  const logout = async () => {
    await authService.logout();
    dispatch(clearAuth());
    await indexedDbService.clearAuth();
  };

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    permissions: auth.permissions,
    currentCompany: auth.currentCompany,
    login,
    logout,
  };
}
```

### Usage

```typescript
import { useAuth } from '@/core/auth/hooks/useAuth';

function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header>
      <span>Welcome, {user?.name}</span>
      <Button onClick={logout}>Logout</Button>
    </header>
  );
}
```

## Multi-Tenant Support

The system supports multiple companies per user:

### Company Selection

```typescript
interface UserCompany {
  id: string;
  code: string;
  name: string;
  role: string;
}

// User may have multiple companies
interface User {
  id: string;
  email: string;
  name: string;
  companies: UserCompany[];
}
```

### Company Header

All API requests include the company code:

```typescript
// Request interceptor adds Company-Code header
config.headers['Company-Code'] = currentCompany?.code;
```

### Company Selection Page

```typescript
function CompanySelectionPage() {
  const { user, setCurrentCompany } = useAuth();
  const navigate = useNavigate();

  const handleSelectCompany = (company: UserCompany) => {
    setCurrentCompany(company);
    navigate('/');
  };

  return (
    <div>
      <h1>Select Company</h1>
      {user?.companies.map((company) => (
        <Card key={company.id} onClick={() => handleSelectCompany(company)}>
          <h2>{company.name}</h2>
          <p>Role: {company.role}</p>
        </Card>
      ))}
    </div>
  );
}
```

## Security Best Practices

### 1. Token Storage

- ✅ Use IndexedDB (not localStorage)
- ✅ Clear tokens on logout
- ✅ Validate token expiry on app start

### 2. Token Transmission

- ✅ Use HTTPS only
- ✅ Send tokens in Authorization header
- ✅ Never include tokens in URLs

### 3. Token Refresh

- ✅ Proactive refresh before expiry
- ✅ Handle refresh failures gracefully
- ✅ Queue concurrent requests during refresh

### 4. Session Management

- ✅ Clear session data on logout
- ✅ Handle token expiry gracefully
- ✅ Support multiple tabs/windows

## Related Documentation

- [API Overview](./overview.md)
- [Endpoints Reference](./endpoints.md)
- [State Management](../architecture/state-management.md)
