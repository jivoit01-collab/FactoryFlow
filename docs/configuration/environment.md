# Environment Setup

This document describes the environment configuration system used in the Factory Management System.

## Environment Variables

### Overview

The application uses Vite's environment variable system. Variables prefixed with `VITE_` are exposed to the client-side code.

### Required Variables

Create a `.env` file in the project root:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Application Environment
VITE_APP_ENV=development

# Feature Flags
VITE_ENABLE_MOCKING=false
```

### Environment Files

Vite supports multiple environment files:

| File | Description | Git |
|------|-------------|-----|
| `.env` | Default values | ✅ Commit |
| `.env.local` | Local overrides | ❌ Ignore |
| `.env.development` | Development values | ✅ Commit |
| `.env.production` | Production values | ✅ Commit |
| `.env.development.local` | Local dev overrides | ❌ Ignore |
| `.env.production.local` | Local prod overrides | ❌ Ignore |

### Loading Priority

Files are loaded in this order (later overrides earlier):

1. `.env`
2. `.env.local`
3. `.env.[mode]`
4. `.env.[mode].local`

## Environment Configuration Module

Location: `src/config/env.config.ts`

```typescript
/**
 * Environment configuration
 * Provides type-safe access to environment variables
 */

interface EnvConfig {
  apiBaseUrl: string;
  appEnv: 'development' | 'staging' | 'production';
  isDev: boolean;
  isProd: boolean;
  enableMocking: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export const env: EnvConfig = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api/v1'),
  appEnv: getEnvVar('VITE_APP_ENV', 'development') as EnvConfig['appEnv'],
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  enableMocking: getEnvVar('VITE_ENABLE_MOCKING', 'false') === 'true',
};
```

## Usage

### Accessing Environment Variables

```typescript
// Using the env config module (recommended)
import { env } from '@/config/env.config';

const apiUrl = env.apiBaseUrl;
const isDev = env.isDev;

// Using import.meta.env directly
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.DEV;
```

### Conditional Code

```typescript
import { env } from '@/config/env.config';

// Development-only code
if (env.isDev) {
  console.log('Debug info:', data);
}

// Production-only code
if (env.isProd) {
  // Analytics, error tracking, etc.
}

// Feature flags
if (env.enableMocking) {
  // Enable mock service worker
}
```

## Available Variables

### API Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL for API requests | `http://localhost:3000/api/v1` |

### Application Configuration

| Variable | Description | Values |
|----------|-------------|--------|
| `VITE_APP_ENV` | Application environment | `development`, `staging`, `production` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_MOCKING` | Enable API mocking | `false` |

### Built-in Variables

Vite provides these built-in variables:

| Variable | Description |
|----------|-------------|
| `import.meta.env.MODE` | Current mode (`development`, `production`) |
| `import.meta.env.DEV` | `true` in development |
| `import.meta.env.PROD` | `true` in production |
| `import.meta.env.SSR` | `true` during SSR |
| `import.meta.env.BASE_URL` | Base URL for the app |

## TypeScript Support

### Type Definitions

Add type definitions for custom environment variables:

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_MOCKING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Environment-Specific Configuration

### Development

```env
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_ENV=development
VITE_ENABLE_MOCKING=true
```

### Staging

```env
# .env.staging
VITE_API_BASE_URL=https://staging-api.example.com/api/v1
VITE_APP_ENV=staging
VITE_ENABLE_MOCKING=false
```

### Production

```env
# .env.production
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_APP_ENV=production
VITE_ENABLE_MOCKING=false
```

## Build Configuration

### Running with Different Modes

```bash
# Development (default)
npm run dev

# Production build
npm run build

# Build with specific mode
npm run build -- --mode staging
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Make non-VITE_ variables available if needed
      'process.env.SOME_VAR': JSON.stringify(env.SOME_VAR),
    },
  };
});
```

## Security Considerations

### Do NOT Expose Sensitive Data

```env
# ❌ NEVER do this - secrets in client code
VITE_API_SECRET=my-secret-key
VITE_DATABASE_URL=postgres://...

# ✅ Only expose non-sensitive configuration
VITE_API_BASE_URL=https://api.example.com
VITE_APP_ENV=production
```

### Server-Side Secrets

Secrets should be:
- Stored on the server only
- Passed through API responses when needed
- Never embedded in client-side code

## Debugging

### Check Loaded Variables

```typescript
// Debug helper (development only)
if (import.meta.env.DEV) {
  console.log('Environment:', {
    mode: import.meta.env.MODE,
    apiUrl: import.meta.env.VITE_API_BASE_URL,
    appEnv: import.meta.env.VITE_APP_ENV,
  });
}
```

### Common Issues

**Variables Not Loading**
- Ensure variables are prefixed with `VITE_`
- Restart the dev server after changing `.env` files
- Check file naming (`.env.local` vs `.env`)

**Type Errors**
- Update `vite-env.d.ts` with new variables
- Restart TypeScript server in IDE

## Related Documentation

- [Constants Reference](./constants.md)
- [Installation Guide](../getting-started/installation.md)
