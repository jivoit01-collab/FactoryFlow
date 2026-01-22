# Modules Overview

This document provides an overview of the feature modules in the Factory Management System and their organization patterns.

## Module Architecture

The application follows a feature-based module architecture where each business domain is encapsulated in its own module.

```
src/modules/
├── auth/              # Authentication and user management
├── dashboard/         # Main dashboard
├── gate/              # Gate entry management (primary module)
├── gateIn/            # Gate entry operations
└── qualityCheck/      # Quality control (placeholder)
```

## Module Structure Pattern

Each module follows a consistent structure:

```
src/modules/[module-name]/
├── pages/                   # Route page components
│   └── SomePage.tsx
├── components/              # Module-specific components
│   ├── SomeComponent.tsx
│   └── index.ts            # Barrel exports
├── api/                     # API integration
│   ├── feature.api.ts      # API client functions
│   └── feature.queries.ts  # React Query hooks
├── hooks/                   # Custom hooks
│   └── useSomeHook.ts
├── schemas/                 # Zod validation schemas
│   └── feature.schema.ts
├── constants/               # Module constants
│   └── feature.constants.ts
├── utils/                   # Module utilities
│   └── feature.utils.ts
└── types/                   # TypeScript types
    └── feature.types.ts
```

## Module Responsibilities

### Pages Directory

Contains route-level components that:
- Are rendered by React Router
- Handle page-level state and data fetching
- Compose smaller components
- Connect to Redux/React Query

```typescript
// src/modules/gate/pages/RawMaterialsPage.tsx
export function RawMaterialsPage() {
  const { data, isLoading } = useVehicleEntries();

  return (
    <div>
      <PageHeader title="Raw Materials" />
      <FilterBar />
      <DataTable data={data} loading={isLoading} />
    </div>
  );
}
```

### Components Directory

Contains reusable components specific to the module:
- Not used outside the module
- May be composed of shared UI components
- Handle presentation logic

```typescript
// src/modules/gate/components/DriverSelect.tsx
export function DriverSelect({ value, onChange }) {
  const { data: drivers } = useDriverNames();

  return (
    <Select value={value} onValueChange={onChange}>
      {/* ... */}
    </Select>
  );
}
```

### API Directory

Contains all API-related code:
- `.api.ts` files: Raw API functions using Axios
- `.queries.ts` files: React Query hooks

```typescript
// Pattern: API functions
// feature.api.ts
export const featureApi = {
  getAll: () => apiClient.get('/endpoint'),
  create: (data) => apiClient.post('/endpoint', data),
};

// Pattern: Query hooks
// feature.queries.ts
export const featureKeys = { all: ['feature'] };
export function useFeature() {
  return useQuery({ queryKey: featureKeys.all, queryFn: featureApi.getAll });
}
```

### Schemas Directory

Contains Zod validation schemas:
- Form validation
- API request validation
- Type inference

```typescript
// src/modules/gate/schemas/driver.schema.ts
import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  licenseNumber: z.string().min(5, 'Invalid license number'),
});

export type CreateDriverDto = z.infer<typeof createDriverSchema>;
```

## Available Modules

### 1. Authentication Module (`/modules/auth/`)

Handles user authentication and profile management.

**Key Features:**
- User login with credentials
- Company selection for multi-tenant access
- User profile management
- Session management

**Routes:**
- `/login` - Login page
- `/select-company` - Company selection
- `/loading-user` - User data loading
- `/profile` - User profile

See: [Authentication Module Documentation](./auth.md)

### 2. Gate Module (`/modules/gate/`)

The primary business module for managing gate entries.

**Key Features:**
- Multi-step raw material entry workflow
- Vehicle, driver, and transporter management
- Purchase order integration
- Weighment tracking
- Quality control integration

**Routes:**
- `/gate/raw-materials` - Entry list/dashboard
- `/gate/raw-materials/new` - Multi-step entry creation
- `/gate/raw-materials/edit/:id` - Edit existing entry

See: [Gate Module Documentation](./gate.md)

### 3. Dashboard Module (`/modules/dashboard/`)

Main application dashboard.

**Key Features:**
- Overview statistics
- Quick access to common actions
- Recent activity feed

**Routes:**
- `/` - Main dashboard

### 4. Quality Check Module (`/modules/qualityCheck/`)

Quality control management (in development).

**Key Features:**
- Quality parameter entry
- Pass/fail determination
- Quality reports

**Routes:**
- `/quality-check` - Quality check management

## Creating a New Module

### Step 1: Create Directory Structure

```bash
mkdir -p src/modules/new-module/{pages,components,api,hooks,schemas,types}
```

### Step 2: Create API Layer

```typescript
// src/modules/new-module/api/feature.api.ts
import { apiClient } from '@/core/api/client';

export const featureApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/endpoint');
    return data.data;
  },
};

// src/modules/new-module/api/feature.queries.ts
import { useQuery } from '@tanstack/react-query';
import { featureApi } from './feature.api';

export const featureKeys = {
  all: ['feature'] as const,
};

export function useFeatures() {
  return useQuery({
    queryKey: featureKeys.all,
    queryFn: featureApi.getAll,
  });
}
```

### Step 3: Create Page Component

```typescript
// src/modules/new-module/pages/FeaturePage.tsx
import { useFeatures } from '../api/feature.queries';

export function FeaturePage() {
  const { data, isLoading } = useFeatures();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>Feature</h1>
      {/* Page content */}
    </div>
  );
}
```

### Step 4: Add Route Configuration

```typescript
// src/config/routes.config.ts
export const ROUTES = {
  // ... existing routes
  NEW_MODULE: {
    path: '/new-module',
    label: 'New Module',
    permissions: ['newmodule.view'],
  },
};
```

### Step 5: Register Route

```typescript
// src/app/routes/AppRoutes.tsx
const NewModulePage = lazy(() => import('@/modules/new-module/pages/FeaturePage'));

// In route configuration
{
  path: ROUTES.NEW_MODULE.path,
  element: (
    <ProtectedRoute permissions={ROUTES.NEW_MODULE.permissions}>
      <NewModulePage />
    </ProtectedRoute>
  ),
}
```

## Module Communication

### Using Shared State (Redux)

```typescript
// Access auth state from any module
import { useAppSelector } from '@/core/store/hooks';

function ModuleComponent() {
  const user = useAppSelector((state) => state.auth.user);
  // ...
}
```

### Using Shared Components

```typescript
// Use shared UI components
import { Button, Card, Input } from '@/shared/components/ui';

function ModuleComponent() {
  return (
    <Card>
      <Input placeholder="Enter value" />
      <Button>Submit</Button>
    </Card>
  );
}
```

### Cross-Module Navigation

```typescript
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes.config';

function ModuleComponent() {
  const navigate = useNavigate();

  const goToGate = () => {
    navigate(ROUTES.GATE.RAW_MATERIALS.path);
  };
}
```

## Best Practices

### 1. Keep Modules Self-Contained

```typescript
// ✅ Good - Import from shared
import { Button } from '@/shared/components/ui';

// ❌ Bad - Import from another module
import { DriverSelect } from '@/modules/gate/components/DriverSelect';
```

### 2. Export Public API

```typescript
// src/modules/gate/components/index.ts
export { DriverSelect } from './DriverSelect';
export { VehicleSelect } from './VehicleSelect';
```

### 3. Co-locate Related Code

```
// ✅ Good - Related code together
src/modules/gate/
├── api/driver.api.ts
├── api/driver.queries.ts
├── components/DriverSelect.tsx
└── schemas/driver.schema.ts

// ❌ Bad - Scattered across folders
src/api/driver.api.ts
src/queries/driver.queries.ts
src/components/gate/DriverSelect.tsx
src/schemas/driver.schema.ts
```

### 4. Use Consistent Naming

```typescript
// API files
feature.api.ts
feature.queries.ts

// Components
FeatureComponent.tsx

// Schemas
feature.schema.ts

// Types
feature.types.ts
```

## Related Documentation

- [Authentication Module](./auth.md)
- [Gate Module](./gate.md)
- [Architecture Overview](../architecture/overview.md)
- [Folder Structure](../architecture/folder-structure.md)
