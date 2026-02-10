# Modules Overview

This document provides an overview of the feature modules in the Factory Management System and their organization patterns.

## Module Architecture

The application follows a feature-based module architecture where each business domain is encapsulated in its own module.

```
src/modules/
├── auth/              # Authentication and user management
├── dashboard/         # Main dashboard and overview
├── gate/              # Gate entry management (largest module)
│   ├── Raw Materials  # Raw material deliveries workflow
│   ├── Daily Needs    # Food and consumables entries
│   ├── Construction   # Construction material entries
│   ├── Maintenance    # Maintenance and spare parts
│   └── Visitor/Labour # Person gate-in (visitors and labours)
├── grpo/              # Goods receipt posting to ERP
├── qc/                # Quality control inspections
└── notifications/     # Push notification management
```

> **Module Independence Rule:** Modules must never import from each other. If a module cannot be deleted without breaking another, the boundaries are wrong. See [Module Boundaries](../architecture/module-boundaries.md) for the full dependency rules.

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

The primary business module for managing all gate entry operations.

**Key Features:**
- Multi-step raw material entry workflow
- Vehicle, driver, and transporter management
- Purchase order integration
- Weighment tracking
- Quality control integration
- **Visitor/Labour Management** - Person gate-in tracking
- Daily needs, construction, and maintenance entries

**Routes:**
- `/gate` - Gate dashboard
- `/gate/raw-materials` - Raw materials dashboard
- `/gate/raw-materials/all` - All raw material entries
- `/gate/raw-materials/new` - Multi-step entry creation
- `/gate/daily-needs` - Daily needs entries
- `/gate/construction` - Construction material entries
- `/gate/maintenance` - Maintenance entries
- `/gate/visitor-labour` - Visitor/Labour dashboard
- `/gate/visitor-labour/new` - New visitor/labour entry
- `/gate/visitor-labour/all` - All visitor/labour entries
- `/gate/visitor-labour/visitors` - Manage visitors
- `/gate/visitor-labour/labours` - Manage labours

See: [Gate Module Documentation](./gate.md)

### 3. Dashboard Module (`/modules/dashboard/`)

Main application dashboard providing an overview of factory operations.

**Key Features:**
- Overview statistics and KPIs
- Quick access to common actions
- Module navigation

**Routes:**
- `/` - Main dashboard

See: [Dashboard Module Documentation](./dashboard.md)

### 4. GRPO Module (`/modules/grpo/`)

Handles posting received materials into the ERP system after gate entry completion.

**Key Features:**
- Pending GRPO entries from completed gate entries
- Preview and post material receipts
- Warehouse selection
- Posting history and detail views

**Routes:**
- `/grpo` - GRPO dashboard
- `/grpo/pending` - Pending entries
- `/grpo/preview/:vehicleEntryId` - Preview and post
- `/grpo/history` - Posting history

See: [GRPO Module Documentation](./grpo.md)

### 5. QC Module (`/modules/qc/`)

Quality control inspections with multi-role approval workflow.

**Key Features:**
- Create inspections against arrival slips
- Parameter-based testing (numeric, text, boolean, range)
- Three-role approval: Inspector → QA Chemist → QA Manager
- Material type and QC parameter master data

**Routes:**
- `/qc` - QC dashboard
- `/qc/pending` - Pending inspections
- `/qc/inspections/:slipId/new` - Create inspection
- `/qc/approvals` - Approval queue
- `/qc/master/material-types` - Material types
- `/qc/master/parameters` - QC parameters

See: [QC Module Documentation](./qc.md)

### 6. Notifications Module (`/modules/notifications/`)

Push notification management via Firebase Cloud Messaging.

**Key Features:**
- View received notifications
- Send targeted notifications (permission-gated)

**Routes:**
- `/notifications` - All notifications
- `/notifications/send` - Send notification

See: [Notifications Module Documentation](./notifications.md)

## Creating a New Module

### Step 1: Create Directory Structure

```bash
mkdir -p src/modules/new-module/{pages,components,api,hooks,schemas,types,docs}
```

### Step 2: Create module.config.tsx

Every module exports a `ModuleConfig` that declares its routes, navigation, and optional reducers:

```typescript
// src/modules/new-module/module.config.tsx
import { lazy } from 'react'
import { SomeIcon } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

const FeaturePage = lazy(() => import('./pages/FeaturePage'))

export const newModuleConfig: ModuleConfig = {
  name: 'new-module',

  routes: [
    {
      path: '/new-module',
      element: <FeaturePage />,
      layout: 'main',
      requiresAuth: true,
      permissions: ['newmodule.view'],
    },
  ],

  navigation: [
    {
      path: '/new-module',
      title: 'New Module',
      icon: SomeIcon,
      showInSidebar: true,
      modulePrefix: 'newmodule.',
    },
  ],
}
```

### Step 3: Create API Layer

```typescript
// src/modules/new-module/api/feature.api.ts
import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

export const featureApi = {
  async getAll() {
    const response = await apiClient.get(API_ENDPOINTS.NEW_MODULE.LIST)
    return response.data
  },
}

// src/modules/new-module/api/feature.queries.ts
import { useQuery } from '@tanstack/react-query'
import { featureApi } from './feature.api'

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: featureApi.getAll,
  })
}
```

### Step 4: Register in Module Registry

```typescript
// src/app/modules/index.ts
import { newModuleConfig } from '@/modules/new-module/module.config'

const modules: ModuleConfig[] = [
  // ... existing modules
  newModuleConfig,
]
```

### Step 5: Create Module Docs

Create `src/modules/new-module/docs/README.md` documenting routes, structure, and key types.

### Important: Dependency Rules

- Only import from `@/shared/`, `@/config/`, and `@/core/`
- **Never** import from another module (`@/modules/other/`)
- If you need a constant that another module also uses, move it to `@/config/constants/`
- See [Module Boundaries](../architecture/module-boundaries.md)

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
- [Dashboard Module](./dashboard.md)
- [Gate Module](./gate.md)
- [GRPO Module](./grpo.md)
- [QC Module](./qc.md)
- [Notifications Module](./notifications.md)
- [Module Boundaries](../architecture/module-boundaries.md)
- [Architecture Overview](../architecture/overview.md)
- [Folder Structure](../architecture/folder-structure.md)
