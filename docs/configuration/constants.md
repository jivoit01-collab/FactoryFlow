# Constants Reference

This document provides a comprehensive reference of all configuration constants used in the Factory Management System.

## Constants Organization

```
src/config/constants/
├── api.constants.ts        # API configuration
├── app.constants.ts        # Application metadata
├── auth.constants.ts       # Authentication settings
├── ui.constants.ts         # UI configuration
└── validation.constants.ts # Validation rules
```

## API Constants

Location: `src/config/constants/api.constants.ts`

### Base Configuration

```typescript
export const API_BASE_URL = 'http://192.168.1.84:3000/api/v1';
export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second
```

### HTTP Status Codes

```typescript
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;
```

### API Endpoints

```typescript
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Gate Module
  GATE_IN: '/gate-in',
  QUALITY_CHECK: '/quality-check',

  // Vehicle Management
  TRANSPORTERS: '/transporters',
  VEHICLES: '/vehicles',
  VEHICLE_ENTRIES: '/vehicle-entries',
  DRIVERS: '/drivers',

  // Security & Checks
  SECURITY_CHECKS: '/security-checks',

  // Purchase Orders
  PURCHASE_ORDERS: '/purchase-orders',
  PO_RECEIPTS: '/po-receipts',

  // Raw Materials
  RAW_MATERIAL_GATE_IN: '/raw-material-gate-in',

  // Weighment
  WEIGHMENT: '/weighments',

  // Quality Control
  QUALITY_CONTROL: '/quality-controls',

  // Full View
  GATE_CORE_FULL_VIEW: '/gate-core/full-view',
} as const;
```

## Application Constants

Location: `src/config/constants/app.constants.ts`

```typescript
export const APP_NAME = 'Factory Flow';
export const APP_VERSION = '1.0.0';

export const DEFAULT_LOCALE = 'en-IN';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

export const DEFAULT_THEME = 'light';

export const SUPPORTED_LOCALES = ['en-IN', 'hi-IN'] as const;
export const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const;
```

## Authentication Constants

Location: `src/config/constants/auth.constants.ts`

```typescript
// Token Configuration
export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const TOKEN_TYPE = 'Bearer';

// Timing Configuration (in milliseconds)
export const TOKEN_REFRESH_THRESHOLD = 60 * 1000;      // 1 minute before expiry
export const TOKEN_CHECK_INTERVAL = 30 * 1000;         // Check every 30 seconds
export const PERMISSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const SESSION_TIMEOUT = 30 * 60 * 1000;         // 30 minutes inactivity

// Default Token Expiry (fallback)
export const DEFAULT_TOKEN_EXPIRY = 7 * 60 * 1000;     // 7 minutes

// IndexedDB Configuration
export const AUTH_DB_NAME = 'factoryManagementAuth';
export const AUTH_STORE_NAME = 'auth';
export const AUTH_DB_VERSION = 1;
```

## UI Constants

Location: `src/config/constants/ui.constants.ts`

### Pagination

```typescript
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;
```

### Table Configuration

```typescript
export const TABLE = {
  MIN_COLUMN_WIDTH: 100,
  DEFAULT_COLUMN_WIDTH: 150,
  MAX_VISIBLE_COLUMNS: 10,
  ROW_HEIGHT: 52,
  HEADER_HEIGHT: 48,
} as const;
```

### Layout Dimensions

```typescript
export const SIDEBAR = {
  EXPANDED_WIDTH: 256,    // 16rem
  COLLAPSED_WIDTH: 64,    // 4rem
  MOBILE_BREAKPOINT: 768, // md breakpoint
} as const;

export const HEADER = {
  HEIGHT: 64,             // 4rem
} as const;
```

### Interaction Timing

```typescript
export const DEBOUNCE = {
  SEARCH: 300,            // Search input debounce
  RESIZE: 150,            // Window resize debounce
  SCROLL: 100,            // Scroll event debounce
} as const;

export const ANIMATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
} as const;
```

### Toast/Notification

```typescript
export const TOAST = {
  DURATION: 5000,         // 5 seconds
  MAX_VISIBLE: 5,
  POSITION: 'bottom-right',
} as const;
```

## Validation Constants

Location: `src/config/constants/validation.constants.ts`

```typescript
export const VALIDATION = {
  // String lengths
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,

  // Phone
  PHONE_LENGTH: 10,
  PHONE_REGEX: /^[6-9]\d{9}$/,

  // Email
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Vehicle
  VEHICLE_NUMBER_REGEX: /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/,

  // File upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;
```

## Query Configuration

Location: `src/config/query.config.ts`

```typescript
export const QUERY_CONFIG = {
  // Stale time (how long data is considered fresh)
  STALE_TIME: 5 * 60 * 1000,        // 5 minutes
  STATIC_STALE_TIME: 10 * 60 * 1000, // 10 minutes for static data

  // Garbage collection time (how long to keep unused data)
  GC_TIME: 10 * 60 * 1000,          // 10 minutes

  // Retry configuration
  RETRY_COUNT: 1,
  RETRY_DELAY: 1000,

  // Refetch behavior
  REFETCH_ON_WINDOW_FOCUS: false,
  REFETCH_ON_RECONNECT: true,
  REFETCH_ON_MOUNT: true,
} as const;
```

## Route Configuration

Location: `src/config/routes.config.ts`

```typescript
export const ROUTES = {
  // Auth routes
  LOGIN: '/login',
  COMPANY_SELECTION: '/select-company',
  LOADING_USER: '/loading-user',
  PROFILE: '/profile',

  // Main routes
  DASHBOARD: '/',

  // Gate routes
  GATE: {
    ROOT: '/gate',
    RAW_MATERIALS: '/gate/raw-materials',
    RAW_MATERIALS_ALL: '/gate/raw-materials/all',
    RAW_MATERIALS_NEW: '/gate/raw-materials/new',
    RAW_MATERIALS_NEW_STEP2: '/gate/raw-materials/new/step2',
    RAW_MATERIALS_NEW_STEP3: '/gate/raw-materials/new/step3',
    RAW_MATERIALS_NEW_STEP4: '/gate/raw-materials/new/step4',
    RAW_MATERIALS_NEW_STEP5: '/gate/raw-materials/new/step5',
    RAW_MATERIALS_NEW_REVIEW: '/gate/raw-materials/new/review',
    // Edit routes follow same pattern with :id param
  },

  // Quality check
  QUALITY_CHECK: '/quality-check',
} as const;
```

## Using Constants

### Import Pattern

```typescript
// Import specific constants
import { API_ENDPOINTS, HTTP_STATUS } from '@/config/constants/api.constants';
import { PAGINATION, DEBOUNCE } from '@/config/constants/ui.constants';
import { VALIDATION } from '@/config/constants/validation.constants';

// Usage
const endpoint = API_ENDPOINTS.DRIVERS;
const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
const searchDebounce = DEBOUNCE.SEARCH;
```

### In Components

```typescript
import { SIDEBAR, HEADER } from '@/config/constants/ui.constants';

function Layout() {
  return (
    <div style={{ paddingTop: HEADER.HEIGHT }}>
      <aside style={{ width: SIDEBAR.EXPANDED_WIDTH }}>
        {/* Sidebar content */}
      </aside>
    </div>
  );
}
```

### In Validation

```typescript
import { VALIDATION } from '@/config/constants/validation.constants';
import { z } from 'zod';

const schema = z.object({
  name: z.string()
    .min(VALIDATION.MIN_NAME_LENGTH)
    .max(VALIDATION.MAX_NAME_LENGTH),
  phone: z.string()
    .regex(VALIDATION.PHONE_REGEX, 'Invalid phone number'),
});
```

## Best Practices

### 1. Use `as const` for Type Safety

```typescript
// ✅ Good - Type inference works
export const STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
} as const;

// ❌ Bad - Types are widened to string
export const STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
};
```

### 2. Group Related Constants

```typescript
// ✅ Good - Grouped by concern
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  PAGE_SIZE: 10,
};

// ❌ Bad - Scattered constants
export const DEFAULT_PAGE = 1;
export const PAGE_SIZE = 10;
```

### 3. Document Units

```typescript
// ✅ Good - Clear units
export const TIMEOUT = 30000; // milliseconds
export const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// ❌ Bad - Ambiguous
export const TIMEOUT = 30000;
export const MAX_SIZE = 5242880;
```

## Related Documentation

- [Environment Setup](./environment.md)
- [API Overview](../api/overview.md)
