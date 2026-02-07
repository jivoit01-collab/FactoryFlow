# Folder Structure

This document provides an in-depth explanation of the project's directory organization and the rationale behind each folder.

## Root Directory Structure

```
factoryManagementSystemWeb/
├── docs/                    # Documentation (you are here)
├── node_modules/            # npm dependencies
├── public/                  # Static assets served as-is
├── src/                     # Application source code
├── .prettierrc              # Prettier code formatting config
├── eslint.config.js         # ESLint code quality config
├── index.html               # HTML entry point (Vite injects scripts)
├── package.json             # Project metadata and dependencies
├── package-lock.json        # Locked dependency versions
├── postcss.config.js        # PostCSS config for Tailwind
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript base configuration
├── tsconfig.app.json        # TypeScript app-specific config
├── tsconfig.node.json       # TypeScript Node.js config
└── vite.config.ts           # Vite build tool configuration
```

## Source Directory (`src/`)

### Overview

```
src/
├── app/                     # Application shell and providers
├── config/                  # Configuration and constants
├── core/                    # Core infrastructure (API, auth, store)
├── modules/                 # Feature modules
├── shared/                  # Shared utilities and components
├── assets/                  # Static assets (images, fonts)
├── main.tsx                 # Application entry point
└── index.css                # Global CSS styles
```

---

## Application Layer (`src/app/`)

The app folder contains the application shell and top-level configuration.

```
src/app/
├── layouts/                 # Page layout templates
│   ├── MainLayout.tsx       # Primary authenticated layout
│   ├── AuthLayout.tsx       # Auth pages layout
│   └── components/          # Layout building blocks
│       ├── Header.tsx       # Top navigation bar
│       ├── Sidebar.tsx      # Desktop navigation sidebar
│       ├── MobileSidebar.tsx # Mobile responsive sidebar
│       └── Breadcrumbs.tsx  # Navigation breadcrumbs
├── providers/               # React context providers
│   └── AppProviders.tsx     # Combines all providers
└── routes/                  # Routing configuration
    └── AppRoutes.tsx        # Route definitions and lazy loading
```

### Purpose of Each Component

| Component | Purpose |
|-----------|---------|
| `MainLayout` | Wraps authenticated pages with sidebar, header, and content area |
| `AuthLayout` | Minimal layout for login and authentication pages |
| `AppProviders` | Combines Redux Provider, QueryClientProvider, RouterProvider, ThemeProvider |
| `AppRoutes` | Defines all application routes with lazy loading |

---

## Configuration Layer (`src/config/`)

Centralized configuration and constants.

```
src/config/
├── constants/               # Application constants
│   ├── api.constants.ts     # API base URL, endpoints, HTTP codes
│   ├── app.constants.ts     # App name, version, defaults
│   ├── auth.constants.ts    # Token timing, refresh intervals
│   ├── ui.constants.ts      # Pagination, table config, dimensions
│   └── validation.constants.ts # Validation rules
├── env.config.ts            # Environment variable access
├── routes.config.ts         # Route paths and permissions
├── query.config.ts          # React Query defaults
└── runtime.config.ts        # Async runtime configuration
```

### Constants Organization

| File | Contents |
|------|----------|
| `api.constants.ts` | `API_BASE_URL`, `API_ENDPOINTS`, `HTTP_STATUS` |
| `app.constants.ts` | `APP_NAME`, `APP_VERSION`, `DEFAULT_LOCALE` |
| `auth.constants.ts` | `TOKEN_REFRESH_INTERVAL`, `SESSION_TIMEOUT` |
| `ui.constants.ts` | `PAGE_SIZE`, `SIDEBAR_WIDTH`, `DEBOUNCE_DELAY` |

---

## Core Layer (`src/core/`)

Infrastructure code shared across all modules.

```
src/core/
├── api/                     # HTTP client infrastructure
│   ├── client.ts            # Axios instance with interceptors
│   ├── queryClient.ts       # React Query client setup
│   ├── types.ts             # API types (ApiResponse, ApiError)
│   └── utils/               # API helpers
├── auth/                    # Authentication infrastructure
│   ├── components/          # Auth-related React components
│   │   ├── AuthInitializer.tsx  # Loads auth state on app start
│   │   └── ProtectedRoute.tsx   # Route guard component
│   ├── services/            # Auth business logic
│   │   ├── auth.service.ts      # Login, logout, refresh
│   │   └── indexedDb.service.ts # Persistent auth storage
│   ├── store/               # Redux auth state
│   │   ├── authSlice.ts         # Auth reducer and actions
│   │   └── authMiddleware.ts    # Auth-related middleware
│   ├── hooks/               # Auth React hooks
│   │   ├── useAuth.ts           # Main auth hook
│   │   └── usePermission.ts     # Permission checking
│   ├── types/               # Auth TypeScript types
│   ├── utils/               # Auth utilities
│   │   └── tokenRefresh.util.ts # Token validation logic
│   └── constants/           # Auth constants
│       └── roles.ts             # Role definitions
├── store/                   # Redux store setup
│   ├── store.ts             # Store configuration
│   ├── rootReducer.ts       # Combined reducers
│   ├── authSlice.ts         # Auth slice (may duplicate)
│   ├── filtersSlice.ts      # Filter persistence
│   └── hooks.ts             # Typed Redux hooks
└── i18n/                    # Internationalization (placeholder)
```

### Core Layer Principles

1. **No feature-specific code** - Only infrastructure
2. **Reusable across all modules** - Generic interfaces
3. **Single responsibility** - Each file has one purpose
4. **Testable in isolation** - No module dependencies

---

## Modules Layer (`src/modules/`)

Feature-specific code organized by domain.

```
src/modules/
├── auth/                    # Authentication feature
├── dashboard/               # Dashboard feature
├── gate/                    # Gate management (main feature)
└── qc/                      # Quality control management
```

### Module Structure Pattern

Each module follows a consistent structure:

```
src/modules/[module-name]/
├── pages/                   # Page components (routes)
│   └── SomePage.tsx
├── components/              # Module-specific components
│   └── SomeComponent.tsx
├── api/                     # API integration
│   ├── feature.api.ts       # API functions
│   └── feature.queries.ts   # React Query hooks
├── hooks/                   # Module-specific hooks
│   └── useSomeHook.ts
├── schemas/                 # Zod validation schemas
│   └── feature.schema.ts
├── constants/               # Module constants
│   └── feature.constants.ts
├── utils/                   # Module utilities
│   └── feature.utils.ts
└── types/                   # Module TypeScript types
    └── feature.types.ts
```

### Gate Module Deep Dive

The gate module is the primary feature:

```
src/modules/gate/
├── pages/
│   ├── RawMaterialsDashboard.tsx  # Entry statistics dashboard
│   ├── RawMaterialsPage.tsx       # Entry list with filters
│   └── rawmaterialpages/          # Multi-step entry process
│       ├── Step1Page.tsx          # Driver, transporter, vehicle
│       ├── Step2Page.tsx          # Purchase order info
│       ├── Step3Page.tsx          # PO receipt details
│       ├── Step4Page.tsx          # Weighment data
│       ├── Step5Page.tsx          # Quality control
│       └── ReviewPage.tsx         # Final submission review
├── api/
│   ├── driver.api.ts              # Driver CRUD operations
│   ├── driver.queries.ts          # useDriverNames, useCreateDriver
│   ├── transporter.api.ts         # Transporter operations
│   ├── transporter.queries.ts
│   ├── vehicle.api.ts             # Vehicle operations
│   ├── vehicle.queries.ts
│   ├── vehicleEntry.api.ts        # Vehicle entry records
│   ├── vehicleEntry.queries.ts
│   ├── po.queries.ts              # Purchase order queries
│   ├── poReceipt.api.ts           # PO receipt operations
│   ├── poReceipt.queries.ts
│   ├── securityCheck.api.ts       # Security check operations
│   ├── securityCheck.queries.ts
│   ├── weighment.api.ts           # Weighment operations
│   ├── weighment.queries.ts
│   ├── qualityControl.api.ts      # Quality control operations
│   └── qualityControl.queries.ts
├── components/
│   ├── DriverSelect.tsx           # Driver dropdown selector
│   ├── TransporterSelect.tsx      # Transporter dropdown
│   ├── VehicleSelect.tsx          # Vehicle dropdown
│   ├── CreateVehicleDialog.tsx    # New vehicle creation
│   ├── StepHeader.tsx             # Step navigation header
│   ├── StepFooter.tsx             # Step navigation footer
│   ├── StepLoadingSpinner.tsx     # Loading indicator
│   ├── FillDataAlert.tsx          # Validation warnings
│   └── index.ts                   # Component exports
├── hooks/                         # Custom hooks
├── schemas/                       # Zod validation
├── constants/                     # Gate constants
└── utils/                         # Gate utilities
```

---

## Shared Layer (`src/shared/`)

Reusable resources shared across modules.

```
src/shared/
├── components/              # Shared components
│   ├── ui/                  # UI component library
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   ├── avatar.tsx
│   │   ├── popover.tsx
│   │   ├── collapsible.tsx
│   │   ├── sheet.tsx
│   │   ├── switch.tsx
│   │   ├── calendar.tsx
│   │   └── index.ts         # Barrel export
│   ├── ErrorBoundary.tsx    # Error boundary
│   └── index.ts             # Root exports
├── contexts/                # React contexts
│   └── ThemeProvider.tsx    # Theme context
├── hooks/                   # Shared hooks
│   ├── useLocalStorage.ts   # localStorage persistence
│   └── useDebounce.ts       # Debounce values
├── utils/                   # Utility functions
│   ├── cn.ts                # Classname utility (clsx + tailwind-merge)
│   ├── format.ts            # Date, number, currency formatting
│   ├── storage.ts           # Storage helpers
│   └── index.ts             # Utility exports
└── types/                   # Shared types
    └── common.types.ts      # Common type definitions
```

### UI Components

The UI components are built on Radix UI primitives with Tailwind CSS styling:

| Component | Base | Purpose |
|-----------|------|---------|
| `button.tsx` | Custom | Action buttons with variants |
| `input.tsx` | Custom | Text input fields |
| `dialog.tsx` | @radix-ui/react-dialog | Modal dialogs |
| `dropdown-menu.tsx` | @radix-ui/react-dropdown-menu | Dropdown menus |
| `tooltip.tsx` | @radix-ui/react-tooltip | Tooltips |
| `popover.tsx` | @radix-ui/react-popover | Popovers |
| `collapsible.tsx` | @radix-ui/react-collapsible | Collapsible sections |

---

## File Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase.tsx | `MainLayout.tsx` |
| React Hook | camelCase.ts | `useAuth.ts` |
| Utility Function | camelCase.ts | `format.ts` |
| Constants | camelCase.constants.ts | `api.constants.ts` |
| Types | camelCase.types.ts | `auth.types.ts` |
| API Functions | camelCase.api.ts | `driver.api.ts` |
| Query Hooks | camelCase.queries.ts | `driver.queries.ts` |
| Schema | camelCase.schema.ts | `login.schema.ts` |

### Directories

All directories use lowercase:
- `components/`
- `hooks/`
- `utils/`
- `pages/`

---

## Import Organization

### Path Aliases

```typescript
// tsconfig.json and vite.config.ts define:
// "@/*" → "./src/*"

// Usage
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { ROUTES } from '@/config/routes.config';
```

### Import Order Convention

```typescript
// 1. React and core libraries
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal absolute imports (@/)
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/core/auth/hooks/useAuth';

// 4. Relative imports
import { StepHeader } from './components/StepHeader';
import { driverSchema } from './schemas/driver.schema';
```

---

## Adding New Features

### Creating a New Module

1. Create the module directory:
   ```
   src/modules/new-feature/
   ```

2. Add standard subdirectories:
   ```
   src/modules/new-feature/
   ├── pages/
   ├── components/
   ├── api/
   ├── hooks/
   ├── schemas/
   └── types/
   ```

3. Update route configuration in `src/config/routes.config.ts`

4. Add routes in `src/app/routes/AppRoutes.tsx`

### Creating a New Shared Component

1. Create component in `src/shared/components/ui/`
2. Export from `src/shared/components/ui/index.ts`
3. Document usage and props

---

## Related Documentation

- [Architecture Overview](./overview.md)
- [State Management](./state-management.md)
- [Code Style Guide](../development/code-style.md)
