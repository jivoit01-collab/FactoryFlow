# State Management

This document explains the state management architecture used in the Factory Management System, including Redux for client state and React Query for server state.

## Overview

The application uses a dual state management approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    State Management                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │      Redux          │    │       React Query            │ │
│  │   (Client State)    │    │      (Server State)          │ │
│  ├─────────────────────┤    ├─────────────────────────────┤ │
│  │ • Authentication    │    │ • API data (drivers, etc.)   │ │
│  │ • User session      │    │ • Caching                    │ │
│  │ • UI filters        │    │ • Background sync            │ │
│  │ • Company selection │    │ • Optimistic updates         │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Redux Store

### Store Configuration

Location: `src/core/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific paths
        ignoredActions: ['auth/setAuth'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Root Reducer

Location: `src/core/store/rootReducer.ts`

```typescript
import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';
import { filtersReducer } from './filtersSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  filters: filtersReducer,
});
```

### Typed Hooks

Location: `src/core/store/hooks.ts`

```typescript
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use these hooks instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## Auth Slice

### State Shape

Location: `src/core/store/authSlice.ts`

```typescript
interface AuthState {
  user: User | null;
  permissions: string[];
  currentCompany: UserCompany | null;
  access: string;           // JWT access token
  refresh: string;          // JWT refresh token
  expiresIn: number;        // Token expiry timestamp
  isAuthenticated: boolean;
  isLoading: boolean;
  permissionsLoaded: boolean;
}
```

### Actions

```typescript
// Auth slice actions
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthPayload>) => {
      // Set authentication data
    },
    setUser: (state, action: PayloadAction<User>) => {
      // Update user data
    },
    setCurrentCompany: (state, action: PayloadAction<UserCompany>) => {
      // Set selected company
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      // Update permissions
    },
    updateTokens: (state, action: PayloadAction<TokenUpdate>) => {
      // Update access/refresh tokens
    },
    logout: (state) => {
      // Clear auth state
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      // Set loading state
    },
  },
});

export const {
  setAuth,
  setUser,
  setCurrentCompany,
  setPermissions,
  updateTokens,
  logout,
  setLoading,
} = authSlice.actions;
```

### Usage Example

```typescript
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { setUser, logout } from '@/core/store/authSlice';

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

## Filters Slice

### State Shape

Location: `src/core/store/filtersSlice.ts`

```typescript
interface FiltersState {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  // Additional filter states
}
```

### Persistence

The filters slice persists to localStorage for user convenience:

```typescript
const initialState: FiltersState = {
  dateRange: loadFromStorage('filters.dateRange') || {
    from: null,
    to: null,
  },
};

// Middleware to save on changes
const filtersMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type.startsWith('filters/')) {
    saveToStorage('filters', store.getState().filters);
  }
  return result;
};
```

### Usage Example

```typescript
import { useAppSelector, useAppDispatch } from '@/core/store/hooks';
import { setDateRange } from '@/core/store/filtersSlice';

function DateFilter() {
  const dispatch = useAppDispatch();
  const dateRange = useAppSelector((state) => state.filters.dateRange);

  const handleDateChange = (from: Date, to: Date) => {
    dispatch(setDateRange({
      from: from.toISOString(),
      to: to.toISOString(),
    }));
  };

  return <DateRangePicker value={dateRange} onChange={handleDateChange} />;
}
```

## React Query

### Query Client Configuration

Location: `src/core/api/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import { QUERY_CONFIG } from '@/config/query.config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.STALE_TIME,     // 5 minutes
      gcTime: QUERY_CONFIG.GC_TIME,           // 10 minutes
      retry: QUERY_CONFIG.RETRY_COUNT,        // 1
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Query Pattern

Location: `src/modules/gate/api/driver.queries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi } from './driver.api';

// Query keys
export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (filters: object) => [...driverKeys.lists(), filters] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
  names: () => [...driverKeys.all, 'names'] as const,
};

// Queries
export function useDriverNames() {
  return useQuery({
    queryKey: driverKeys.names(),
    queryFn: () => driverApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes for static data
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => driverApi.getById(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: driverApi.create,
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}
```

### API Functions

Location: `src/modules/gate/api/driver.api.ts`

```typescript
import { apiClient } from '@/core/api/client';
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import type { Driver, CreateDriverDto } from './types';

export const driverApi = {
  getNames: async (): Promise<DriverName[]> => {
    const { data } = await apiClient.get(API_ENDPOINTS.DRIVERS);
    return data.data;
  },

  getById: async (id: string): Promise<Driver> => {
    const { data } = await apiClient.get(`${API_ENDPOINTS.DRIVERS}/${id}`);
    return data.data;
  },

  create: async (dto: CreateDriverDto): Promise<Driver> => {
    const { data } = await apiClient.post(API_ENDPOINTS.DRIVERS, dto);
    return data.data;
  },

  update: async (id: string, dto: UpdateDriverDto): Promise<Driver> => {
    const { data } = await apiClient.patch(`${API_ENDPOINTS.DRIVERS}/${id}`, dto);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.DRIVERS}/${id}`);
  },
};
```

### Usage in Components

```typescript
import { useDriverNames, useCreateDriver } from '@/modules/gate/api/driver.queries';

function DriverSelect() {
  const { data: drivers, isLoading, error } = useDriverNames();
  const createDriver = useCreateDriver();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  const handleCreate = async (data: CreateDriverDto) => {
    try {
      await createDriver.mutateAsync(data);
      // Success - queries are automatically invalidated
    } catch (error) {
      // Handle error
    }
  };

  return (
    <Select>
      {drivers?.map((driver) => (
        <SelectOption key={driver.id} value={driver.id}>
          {driver.name}
        </SelectOption>
      ))}
    </Select>
  );
}
```

## State Management Decision Guide

### When to Use Redux

Use Redux for:
- **Authentication state** - User, tokens, permissions
- **UI state that persists** - Filters, preferences
- **Cross-cutting concerns** - Global loading states
- **State that doesn't come from the server**

### When to Use React Query

Use React Query for:
- **Server data** - API responses
- **Caching** - Avoid redundant requests
- **Background sync** - Keep data fresh
- **Optimistic updates** - Better UX

### When to Use Local State

Use `useState`/`useReducer` for:
- **Component-specific UI state** - Modal open/closed
- **Form state** - Input values (use React Hook Form)
- **Ephemeral state** - Hover states, animations

## Best Practices

### 1. Keep Redux Lean

```typescript
// ❌ Don't store API data in Redux
dispatch(setDrivers(await fetchDrivers()));

// ✅ Use React Query for API data
const { data: drivers } = useDriverNames();
```

### 2. Use Proper Query Keys

```typescript
// ❌ Simple string keys
useQuery({ queryKey: ['drivers'] });

// ✅ Structured query keys
useQuery({ queryKey: driverKeys.list({ status: 'active' }) });
```

### 3. Invalidate Related Queries

```typescript
// After creating a driver, invalidate all driver queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: driverKeys.all });
}
```

### 4. Handle Loading and Error States

```typescript
const { data, isLoading, isError, error } = useQuery(...);

if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

### 5. Optimize Stale Times

```typescript
// Static data (rarely changes)
useQuery({
  staleTime: 10 * 60 * 1000, // 10 minutes
});

// Dynamic data (changes frequently)
useQuery({
  staleTime: 30 * 1000, // 30 seconds
});
```

## Related Documentation

- [Architecture Overview](./overview.md)
- [API Overview](../api/overview.md)
- [Authentication](../api/authentication.md)
