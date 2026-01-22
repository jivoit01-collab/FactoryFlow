# API Overview

This document describes the API client architecture, request/response handling, and integration patterns used in the Factory Management System.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Architecture                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Component                                                       │
│      │                                                           │
│      │ useQuery / useMutation                                   │
│      ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   React Query Layer                      │    │
│  │  • Caching          • Background refetch                │    │
│  │  • Deduplication    • Error handling                    │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               │ API function call                │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   API Functions Layer                    │    │
│  │  • Type-safe functions   • Request building             │    │
│  │  • Response transformation                              │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               │ HTTP request                     │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Axios Client Layer                     │    │
│  │  • Request interceptors   • Response interceptors       │    │
│  │  • Token management       • Error transformation        │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               │ HTTPS                            │
│                               ▼                                  │
│                        REST API Server                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Axios Client

### Configuration

Location: `src/core/api/client.ts`

```typescript
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/config/constants/api.constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor

The request interceptor handles:

1. **Authorization Header**: Adds Bearer token from Redux store
2. **Company Header**: Adds Company-Code for multi-tenant requests
3. **Token Refresh**: Proactively refreshes tokens near expiry

```typescript
apiClient.interceptors.request.use(
  async (config) => {
    const state = store.getState();
    const { access, expiresIn } = state.auth;

    // Check if token needs refresh
    if (access && shouldRefreshToken(expiresIn)) {
      await refreshTokenIfNeeded();
    }

    // Add authorization header
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }

    // Add company code header
    const companyCode = state.auth.currentCompany?.code;
    if (companyCode) {
      config.headers['Company-Code'] = companyCode;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
```

### Response Interceptor

The response interceptor handles:

1. **401 Unauthorized**: Attempts token refresh, then retries request
2. **403 Forbidden**: Redirects to appropriate page
3. **Error Transformation**: Converts errors to `ApiError` format

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await refreshToken();
        return apiClient(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(transformError(error));
  }
);
```

## Response Types

Location: `src/core/api/types.ts`

### Standard Response

```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### Error Response

```typescript
interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;  // Field-level errors
  status: number;
}
```

## API Functions

### Structure

API functions are organized by domain in module directories:

```
src/modules/gate/api/
├── driver.api.ts          # Driver CRUD functions
├── driver.queries.ts      # React Query hooks for drivers
├── transporter.api.ts     # Transporter functions
├── transporter.queries.ts
├── vehicle.api.ts         # Vehicle functions
├── vehicle.queries.ts
└── ...
```

### Example API Module

```typescript
// src/modules/gate/api/driver.api.ts
import { apiClient } from '@/core/api/client';
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import type { ApiResponse, PaginatedResponse } from '@/core/api/types';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  createdAt: string;
}

export interface CreateDriverDto {
  name: string;
  phone: string;
  licenseNumber: string;
}

export const driverApi = {
  // Get all drivers (paginated)
  getAll: async (params?: { page?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Driver>>(
      API_ENDPOINTS.DRIVERS,
      { params }
    );
    return data;
  },

  // Get driver names for dropdowns
  getNames: async () => {
    const { data } = await apiClient.get<ApiResponse<DriverName[]>>(
      `${API_ENDPOINTS.DRIVERS}/names`
    );
    return data.data;
  },

  // Get single driver by ID
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Driver>>(
      `${API_ENDPOINTS.DRIVERS}/${id}`
    );
    return data.data;
  },

  // Create new driver
  create: async (dto: CreateDriverDto) => {
    const { data } = await apiClient.post<ApiResponse<Driver>>(
      API_ENDPOINTS.DRIVERS,
      dto
    );
    return data.data;
  },

  // Update driver
  update: async (id: string, dto: Partial<CreateDriverDto>) => {
    const { data } = await apiClient.patch<ApiResponse<Driver>>(
      `${API_ENDPOINTS.DRIVERS}/${id}`,
      dto
    );
    return data.data;
  },

  // Delete driver
  delete: async (id: string) => {
    await apiClient.delete(`${API_ENDPOINTS.DRIVERS}/${id}`);
  },
};
```

## React Query Hooks

### Query Key Structure

```typescript
// src/modules/gate/api/driver.queries.ts

export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (filters: object) => [...driverKeys.lists(), filters] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
  names: () => [...driverKeys.all, 'names'] as const,
};
```

### Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi } from './driver.api';

// Fetch driver names (for select dropdowns)
export function useDriverNames() {
  return useQuery({
    queryKey: driverKeys.names(),
    queryFn: () => driverApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes (static data)
  });
}

// Fetch single driver
export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => driverApi.getById(id),
    enabled: !!id, // Only fetch if ID is provided
  });
}

// Fetch paginated driver list
export function useDriverList(filters: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: driverKeys.list(filters),
    queryFn: () => driverApi.getAll(filters),
    placeholderData: keepPreviousData, // Keep previous data while fetching
  });
}
```

### Mutation Hooks

```typescript
// Create driver mutation
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: driverApi.create,
    onSuccess: () => {
      // Invalidate all driver queries to refresh data
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (error: ApiError) => {
      // Error handling is done in the component
      console.error('Failed to create driver:', error.message);
    },
  });
}

// Update driver mutation
export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDriverDto> }) =>
      driverApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
    },
  });
}

// Delete driver mutation
export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: driverApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}
```

## Usage in Components

### Basic Query Usage

```typescript
import { useDriverNames } from '@/modules/gate/api/driver.queries';

function DriverSelect({ value, onChange }) {
  const { data: drivers, isLoading, isError, error } = useDriverNames();

  if (isLoading) {
    return <SelectSkeleton />;
  }

  if (isError) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a driver" />
      </SelectTrigger>
      <SelectContent>
        {drivers?.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Mutation Usage

```typescript
import { useCreateDriver } from '@/modules/gate/api/driver.queries';

function CreateDriverDialog({ onClose }) {
  const createDriver = useCreateDriver();

  const onSubmit = async (data: CreateDriverDto) => {
    try {
      await createDriver.mutateAsync(data);
      toast.success('Driver created successfully');
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Form fields */}
        <Button type="submit" disabled={createDriver.isPending}>
          {createDriver.isPending ? 'Creating...' : 'Create Driver'}
        </Button>
      </form>
    </Dialog>
  );
}
```

## Error Handling

### API Error Transformation

```typescript
function transformError(error: AxiosError): ApiError {
  if (error.response) {
    // Server responded with error
    return {
      message: error.response.data?.message || 'An error occurred',
      code: error.response.data?.code,
      errors: error.response.data?.errors,
      status: error.response.status,
    };
  }

  if (error.request) {
    // Request made but no response
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
    };
  }

  // Error setting up request
  return {
    message: error.message || 'An unexpected error occurred',
    status: 0,
  };
}
```

### Component Error Handling

```typescript
function handleApiError(error: ApiError) {
  if (error.status === 400 && error.errors) {
    // Field validation errors
    Object.entries(error.errors).forEach(([field, messages]) => {
      setError(field, { message: messages[0] });
    });
  } else if (error.status === 403) {
    // Permission denied
    toast.error('You do not have permission to perform this action');
  } else if (error.status === 404) {
    // Not found
    toast.error('Resource not found');
  } else {
    // General error
    toast.error(error.message);
  }
}
```

## Best Practices

### 1. Always Use Query Keys Factory

```typescript
// ✅ Good - Structured query keys
useQuery({ queryKey: driverKeys.detail(id) });

// ❌ Bad - String literals
useQuery({ queryKey: ['driver', id] });
```

### 2. Handle All States

```typescript
const { data, isLoading, isError, error } = useQuery(...);

// Always handle loading, error, and success states
if (isLoading) return <Loading />;
if (isError) return <Error error={error} />;
return <Success data={data} />;
```

### 3. Use Proper Stale Times

```typescript
// Static data (rarely changes)
staleTime: 10 * 60 * 1000  // 10 minutes

// Dynamic data (changes frequently)
staleTime: 30 * 1000  // 30 seconds

// Real-time data
staleTime: 0  // Always stale
```

### 4. Invalidate Related Queries

```typescript
onSuccess: () => {
  // Invalidate all related queries
  queryClient.invalidateQueries({ queryKey: driverKeys.all });
}
```

## Related Documentation

- [Authentication](./authentication.md)
- [Endpoints Reference](./endpoints.md)
- [State Management](../architecture/state-management.md)
