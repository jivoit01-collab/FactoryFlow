# Architecture Overview

This document describes the high-level architecture of the Factory Management System, including design patterns, data flow, and key architectural decisions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   React UI   │  │    Redux     │  │    React Query       │   │
│  │  Components  │◄─┤    Store     │  │   (Server State)     │   │
│  │              │  │ (Client State)│ │                      │   │
│  └──────┬───────┘  └──────────────┘  └──────────┬───────────┘   │
│         │                                       │               │
│         └────────────────┬──────────────────────┘               │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │   Axios   │                                │
│                    │  Client   │                                │
│                    └─────┬─────┘                                │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │  REST API   │
                    │   Server    │
                    └─────────────┘
```

## Core Design Principles

### 1. Separation of Concerns

The application is divided into distinct layers:

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI rendering, user interaction | `src/app/`, `src/modules/*/pages/` |
| **Business Logic** | Data transformation, validation | `src/modules/*/hooks/`, `src/modules/*/utils/` |
| **Data Access** | API communication, caching | `src/core/api/`, `src/modules/*/api/` |
| **State Management** | Application state | `src/core/store/`, React Query cache |

### 2. Feature-Based Module Structure

Code is organized by feature/domain rather than technical type:

```
src/modules/gate/
├── pages/           # What users see
├── components/      # Feature-specific UI
├── api/             # Data fetching
├── hooks/           # Feature logic
├── schemas/         # Validation
└── utils/           # Helpers
```

**Benefits:**
- High cohesion within modules
- Clear boundaries between features
- Easier to understand and maintain
- Supports team scaling

### 3. Type Safety

TypeScript is used throughout with strict configuration:

- `strict: true` in TypeScript config
- Zod schemas for runtime validation
- Explicit type definitions for API responses
- No implicit `any` types allowed

## Data Flow Architecture

### Unidirectional Data Flow

```
User Action
    │
    ▼
┌───────────────┐
│ React Event   │
│   Handler     │
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────┐
│         State Update                  │
│  ┌─────────────┐  ┌────────────────┐  │
│  │   Redux     │  │  React Query   │  │
│  │  Dispatch   │  │   Mutation     │  │
│  └─────────────┘  └────────────────┘  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────┐
│  React Re-    │
│   render      │
└───────────────┘
        │
        ▼
   Updated UI
```

### State Management Strategy

The application uses a dual state management approach:

#### Redux (Client State)
- **Purpose**: Authentication, user session, UI filters
- **Persistence**: IndexedDB for auth, localStorage for filters
- **Example**: `authSlice.ts`, `filtersSlice.ts`

```typescript
// Client state examples
- isAuthenticated
- currentUser
- selectedCompany
- dateRangeFilters
```

#### React Query (Server State)
- **Purpose**: API data, caching, synchronization
- **Caching**: 10-minute cache time, 5-minute stale time
- **Example**: Query hooks in `*.queries.ts` files

```typescript
// Server state examples
- Driver list
- Vehicle data
- Purchase orders
- Entry records
```

## Authentication Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Auth Flow                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. App Start                                                │
│     │                                                        │
│     ▼                                                        │
│  ┌─────────────────┐                                         │
│  │ AuthInitializer │──── Load cached auth from IndexedDB     │
│  └────────┬────────┘                                         │
│           │                                                  │
│     ┌─────┴─────┐                                            │
│     ▼           ▼                                            │
│  Has Token   No Token                                        │
│     │           │                                            │
│     ▼           ▼                                            │
│  Validate    Redirect                                        │
│   Token      to Login                                        │
│     │                                                        │
│     ▼                                                        │
│  2. Token Refresh (Proactive)                                │
│     - Check every 30 seconds                                 │
│     - Refresh if < 1 minute to expiry                        │
│                                                              │
│  3. Permission Check                                         │
│     - Django-format permissions                              │
│     - Route-level protection                                 │
│     - Component-level checks                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Token Management

| Aspect | Implementation |
|--------|---------------|
| Storage | IndexedDB (persistent across sessions) |
| Format | JWT Bearer token |
| Refresh | Proactive, 1 minute before expiry |
| Retry | Queue concurrent requests during refresh |

## Component Architecture

### Layout System

```
┌─────────────────────────────────────────────────────────────┐
│                        MainLayout                           │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌────────────────────────────────────────────┐ │
│ │          │ │              Header                        │ │
│ │          │ ├────────────────────────────────────────────┤ │
│ │ Sidebar  │ │              Breadcrumbs                   │ │
│ │          │ ├────────────────────────────────────────────┤ │
│ │          │ │                                            │ │
│ │          │ │              Page Content                  │ │
│ │          │ │              (Outlet)                      │ │
│ │          │ │                                            │ │
│ └──────────┘ └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── AppProviders (Redux, React Query, Router, Theme)
│   └── RouterProvider
│       ├── AuthLayout
│       │   └── Auth Pages (Login, Company Selection)
│       └── MainLayout
│           ├── Header
│           ├── Sidebar / MobileSidebar
│           ├── Breadcrumbs
│           └── ProtectedRoute
│               └── Feature Pages
```

## API Integration Pattern

### Request Flow

```
Component
    │
    │ useQuery / useMutation
    ▼
┌─────────────────┐
│  React Query    │
│     Hook        │
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│   API Function  │
│  (*.api.ts)     │
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│  Axios Client   │
│ (interceptors)  │
└────────┬────────┘
         │ HTTP
         ▼
    REST API Server
```

### Response Handling

```typescript
// Standard API Response
interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Paginated Response
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Error Response
interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  status: number;
}
```

## Routing Architecture

### Route Protection

```
┌───────────────────────────────────────────┐
│              Route Access                 │
├───────────────────────────────────────────┤
│                                           │
│  Public Routes                            │
│  ├── /login                               │
│  └── /select-company                      │
│                                           │
│  Protected Routes (require auth)          │
│  ├── / (Dashboard)                        │
│  ├── /gate/*                              │
│  ├── /quality-check                       │
│  └── /profile                             │
│                                           │
│  Permission-Based Routes                  │
│  └── Routes with specific permission      │
│      requirements checked at render       │
│                                           │
└───────────────────────────────────────────┘
```

### Nested Routing

```typescript
// Route structure for multi-step forms
/gate/raw-materials/new          → Step1Page
/gate/raw-materials/new/step2    → Step2Page
/gate/raw-materials/new/step3    → Step3Page
/gate/raw-materials/new/step4    → Step4Page
/gate/raw-materials/new/step5    → Step5Page
/gate/raw-materials/new/review   → ReviewPage
```

## Error Handling Strategy

### Layers of Error Handling

1. **API Layer**: Transforms HTTP errors to `ApiError` format
2. **React Query**: Manages retry logic and error states
3. **Component Level**: Displays error UI
4. **Error Boundary**: Catches unhandled React errors

```
┌──────────────────────────────────────────────────┐
│             Error Handling Flow                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  API Error                                       │
│      │                                           │
│      ▼                                           │
│  Axios Interceptor (transform to ApiError)       │
│      │                                           │
│      ▼                                           │
│  React Query (retry logic, error state)          │
│      │                                           │
│      ▼                                           │
│  Component (error UI, retry button)              │
│      │                                           │
│      ▼                                           │
│  Error Boundary (fallback UI)                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Performance Considerations

### Optimization Strategies

| Strategy | Implementation |
|----------|---------------|
| Code Splitting | Lazy loading for route components |
| Caching | React Query cache (10 min gcTime) |
| Memoization | React.memo for expensive components |
| Bundle Size | Tree-shaking, selective imports |
| Rendering | Virtualization for long lists |

### Build Optimization

- Vite's built-in code splitting
- SWC for fast compilation
- Production minification
- Asset optimization

## Security Considerations

### Authentication Security

- Tokens stored in IndexedDB (not localStorage)
- Automatic token refresh
- Token validation on API requests
- Secure logout (token invalidation)

### API Security

- HTTPS for all API communication
- Bearer token authentication
- Company-Code header for multi-tenant isolation
- Input validation with Zod schemas

## Related Documentation

- [Folder Structure](./folder-structure.md)
- [State Management](./state-management.md)
- [API Overview](../api/overview.md)
