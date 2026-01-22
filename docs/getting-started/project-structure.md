# Project Structure

This document provides a comprehensive overview of the Factory Management System's codebase organization.

## Root Directory

```
factoryManagementSystemWeb/
├── docs/                    # Project documentation
├── node_modules/            # Dependencies (git-ignored)
├── public/                  # Static assets
├── src/                     # Source code
├── .prettierrc              # Prettier configuration
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json             # Project dependencies and scripts
├── postcss.config.js        # PostCSS configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.app.json        # TypeScript app configuration
├── tsconfig.json            # TypeScript base configuration
├── tsconfig.node.json       # TypeScript Node configuration
└── vite.config.ts           # Vite build configuration
```

## Source Directory (`src/`)

### Application Core (`src/app/`)

```
src/app/
├── layouts/                 # Application layouts
│   ├── MainLayout.tsx       # Primary layout with sidebar and header
│   ├── AuthLayout.tsx       # Authentication pages layout
│   └── components/          # Layout sub-components
│       ├── Header.tsx       # Top navigation bar
│       ├── Sidebar.tsx      # Desktop sidebar
│       ├── MobileSidebar.tsx # Mobile responsive sidebar
│       └── Breadcrumbs.tsx  # Navigation breadcrumbs
├── providers/               # React providers
│   └── AppProviders.tsx     # Redux, React Query, Router providers
└── routes/                  # Route definitions
    └── AppRoutes.tsx        # Main routing component
```

### Configuration (`src/config/`)

```
src/config/
├── constants/               # Application constants
│   ├── api.constants.ts     # API endpoints and HTTP status codes
│   ├── app.constants.ts     # App metadata and defaults
│   ├── auth.constants.ts    # Authentication timing and config
│   ├── ui.constants.ts      # UI measurements and config
│   └── validation.constants.ts # Validation rules
├── env.config.ts            # Environment variables
├── routes.config.ts         # Route definitions with permissions
├── query.config.ts          # React Query configuration
└── runtime.config.ts        # Runtime configuration loader
```

### Core Functionality (`src/core/`)

```
src/core/
├── api/                     # API client infrastructure
│   ├── client.ts            # Axios instance with interceptors
│   ├── queryClient.ts       # React Query client
│   ├── types.ts             # API response/error types
│   └── utils/               # API utilities
├── auth/                    # Authentication system
│   ├── components/          # Auth components
│   │   ├── AuthInitializer.tsx # Initial auth state loader
│   │   └── ProtectedRoute.tsx  # Route protection
│   ├── services/            # Auth services
│   │   ├── auth.service.ts  # Login, logout, refresh
│   │   └── indexedDb.service.ts # Persistent storage
│   ├── store/               # Redux auth state
│   │   ├── authSlice.ts     # Auth reducer
│   │   └── authMiddleware.ts # Auth middleware
│   ├── hooks/               # Auth hooks
│   │   ├── useAuth.ts       # Main auth hook
│   │   └── usePermission.ts # Permission checking
│   ├── types/               # Auth TypeScript types
│   ├── utils/               # Auth utilities
│   └── constants/           # Auth constants
├── store/                   # Redux store
│   ├── store.ts             # Store configuration
│   ├── rootReducer.ts       # Combined reducers
│   ├── authSlice.ts         # Auth slice
│   ├── filtersSlice.ts      # Filter state
│   └── hooks.ts             # Redux hooks
└── i18n/                    # Internationalization (future)
```

### Feature Modules (`src/modules/`)

Each feature module follows a consistent structure:

```
src/modules/[module-name]/
├── pages/                   # Route page components
├── components/              # Module-specific components
├── api/                     # API functions and React Query hooks
│   ├── [feature].api.ts     # API client functions
│   └── [feature].queries.ts # React Query hooks
├── hooks/                   # Custom hooks
├── schemas/                 # Zod validation schemas
├── constants/               # Module constants
├── utils/                   # Module utilities
└── types/                   # Module TypeScript types
```

#### Authentication Module (`src/modules/auth/`)

```
src/modules/auth/
├── pages/
│   ├── LoginPage.tsx        # User login
│   ├── CompanySelectionPage.tsx # Company selection
│   ├── LoadingUserPage.tsx  # User data loading
│   └── ProfilePage.tsx      # User profile
├── components/              # Auth components
├── schemas/                 # Login validation schemas
└── utils/                   # Auth utilities
```

#### Gate Module (`src/modules/gate/`)

```
src/modules/gate/
├── pages/
│   ├── RawMaterialsDashboard.tsx # Entry dashboard
│   ├── RawMaterialsPage.tsx # Entry list/management
│   └── rawmaterialpages/    # Multi-step entry process
│       ├── Step1Page.tsx    # Driver/Vehicle selection
│       ├── Step2Page.tsx    # PO information
│       ├── Step3Page.tsx    # PO receipt
│       ├── Step4Page.tsx    # Weighment
│       ├── Step5Page.tsx    # Quality control
│       └── ReviewPage.tsx   # Final review
├── api/
│   ├── driver.api.ts        # Driver API
│   ├── driver.queries.ts    # Driver hooks
│   ├── transporter.api.ts   # Transporter API
│   ├── transporter.queries.ts
│   ├── vehicle.api.ts       # Vehicle API
│   ├── vehicle.queries.ts
│   ├── vehicleEntry.api.ts  # Vehicle entry API
│   ├── vehicleEntry.queries.ts
│   ├── po.queries.ts        # Purchase order hooks
│   ├── poReceipt.api.ts     # PO receipt API
│   ├── poReceipt.queries.ts
│   ├── securityCheck.api.ts # Security check API
│   ├── securityCheck.queries.ts
│   ├── weighment.api.ts     # Weighment API
│   ├── weighment.queries.ts
│   ├── qualityControl.api.ts # Quality control API
│   └── qualityControl.queries.ts
├── components/
│   ├── DriverSelect.tsx     # Driver dropdown
│   ├── TransporterSelect.tsx # Transporter dropdown
│   ├── VehicleSelect.tsx    # Vehicle dropdown
│   ├── CreateVehicleDialog.tsx # New vehicle dialog
│   ├── StepHeader.tsx       # Step navigation header
│   ├── StepFooter.tsx       # Step navigation footer
│   ├── StepLoadingSpinner.tsx # Loading state
│   └── FillDataAlert.tsx    # Data validation alert
├── hooks/                   # Gate-specific hooks
├── schemas/                 # Validation schemas
├── constants/               # Gate constants
└── utils/                   # Gate utilities
```

### Shared Resources (`src/shared/`)

```
src/shared/
├── components/              # Reusable components
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
│   │   └── index.ts         # Component exports
│   ├── ErrorBoundary.tsx    # Error boundary
│   └── index.ts             # Root exports
├── contexts/                # React contexts
│   └── ThemeProvider.tsx    # Dark/light theme
├── hooks/                   # Shared hooks
│   ├── useLocalStorage.ts   # localStorage hook
│   └── useDebounce.ts       # Debounce hook
├── utils/                   # Utility functions
│   ├── cn.ts                # Class name utility
│   ├── format.ts            # Formatting functions
│   ├── storage.ts           # Storage utilities
│   └── index.ts             # Utility exports
└── types/                   # Shared TypeScript types
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `MainLayout.tsx`, `Button.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts`, `useDebounce.ts` |
| Utilities | camelCase | `format.ts`, `storage.ts` |
| Constants | camelCase | `api.constants.ts` |
| Types | camelCase | `types.ts` |
| API files | kebab-case or camelCase | `driver.api.ts` |
| Directories | lowercase | `components/`, `hooks/` |

## Import Path Aliases

The project uses `@/` as an alias for the `src/` directory:

```typescript
// Configured in tsconfig.json and vite.config.ts
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { ROUTES } from '@/config/routes.config';
```

## Module Organization Pattern

Each feature module is self-contained and follows these principles:

1. **Colocation**: Related code lives together
2. **Encapsulation**: Modules expose public API through index files
3. **Separation of Concerns**: Clear boundaries between pages, components, and logic
4. **Consistent Structure**: All modules follow the same pattern

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Folder Structure Deep Dive](../architecture/folder-structure.md)
- [Code Style Guide](../development/code-style.md)
