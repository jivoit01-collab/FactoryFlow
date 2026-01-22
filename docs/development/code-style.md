# Code Style Guide

This document outlines the coding standards and conventions used in the Factory Management System.

## Code Formatting

### Prettier Configuration

The project uses Prettier for consistent code formatting.

**Configuration** (`.prettierrc`):

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Key Rules

| Rule | Setting | Example |
|------|---------|---------|
| Semicolons | None | `const x = 1` |
| Quotes | Single | `'string'` |
| Trailing Commas | All | `{ a, b, }` |
| Line Width | 100 chars | - |
| Indentation | 2 spaces | - |

### Running Formatter

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

## ESLint Configuration

### Rules

The project uses ESLint with TypeScript and React plugins.

```javascript
// eslint.config.js (key rules)
{
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // React
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
}
```

### Running Linter

```bash
npm run lint
```

## TypeScript Guidelines

### Strict Mode

The project uses TypeScript's strict mode:

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Annotations

```typescript
// ✅ Good - Explicit types for function parameters
function greet(name: string): string {
  return `Hello, ${name}`
}

// ✅ Good - Interface for objects
interface User {
  id: string
  name: string
  email: string
}

// ✅ Good - Type inference for simple values
const count = 0 // TypeScript infers number
const items = [] as string[] // Explicit when empty

// ❌ Bad - Using 'any'
function process(data: any) { ... }

// ✅ Good - Using 'unknown' for truly unknown types
function process(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript knows data is string here
  }
}
```

### Enums vs Union Types

```typescript
// ✅ Prefer union types for simple cases
type Status = 'draft' | 'active' | 'completed'

// ✅ Use const objects with 'as const' for complex cases
const STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const

type Status = typeof STATUS[keyof typeof STATUS]
```

## React Component Guidelines

### Component Structure

```typescript
// src/modules/feature/components/MyComponent.tsx

import * as React from 'react'
import { cn } from '@/shared/utils/cn'

// 1. Types/Interfaces
interface MyComponentProps {
  title: string
  variant?: 'default' | 'primary'
  children?: React.ReactNode
  className?: string
  onAction?: () => void
}

// 2. Component definition
export function MyComponent({
  title,
  variant = 'default',
  children,
  className,
  onAction,
}: MyComponentProps) {
  // 3. Hooks
  const [state, setState] = React.useState(false)

  // 4. Derived values
  const isActive = variant === 'primary' && state

  // 5. Event handlers
  const handleClick = () => {
    setState(true)
    onAction?.()
  }

  // 6. Render
  return (
    <div className={cn('base-class', className)}>
      <h2>{title}</h2>
      {children}
      <button onClick={handleClick}>Action</button>
    </div>
  )
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Props interface | ComponentNameProps | `ButtonProps` |

### Component Files

```typescript
// Single export per file
// src/shared/components/ui/button.tsx
export function Button() { ... }

// Named exports for related items
// src/shared/components/ui/card.tsx
export function Card() { ... }
export function CardHeader() { ... }
export function CardContent() { ... }
```

### Hooks

```typescript
// Custom hook naming
function useUserData(userId: string) {
  // Hooks should start with 'use'
}

// Hook return patterns
function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue(v => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return { value, toggle, setTrue, setFalse }
}
```

## Import Organization

### Order

```typescript
// 1. React and core libraries
import * as React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. Internal absolute imports (@/)
import { Button } from '@/shared/components/ui'
import { useAuth } from '@/core/auth/hooks/useAuth'
import { API_ENDPOINTS } from '@/config/constants/api.constants'

// 4. Relative imports
import { FeatureComponent } from './components/FeatureComponent'
import type { FeatureType } from './types'
```

### Path Aliases

```typescript
// ✅ Good - Use path aliases
import { Button } from '@/shared/components/ui/button'

// ❌ Bad - Deep relative imports
import { Button } from '../../../shared/components/ui/button'
```

## File Organization

### Feature Module Structure

```
src/modules/feature/
├── pages/
│   └── FeaturePage.tsx      # Route components
├── components/
│   ├── FeatureList.tsx      # Feature-specific components
│   ├── FeatureItem.tsx
│   └── index.ts             # Barrel exports
├── api/
│   ├── feature.api.ts       # API functions
│   └── feature.queries.ts   # React Query hooks
├── hooks/
│   └── useFeature.ts        # Custom hooks
├── schemas/
│   └── feature.schema.ts    # Zod schemas
├── types/
│   └── feature.types.ts     # TypeScript types
└── utils/
    └── feature.utils.ts     # Utility functions
```

### Barrel Exports

```typescript
// src/modules/feature/components/index.ts
export { FeatureList } from './FeatureList'
export { FeatureItem } from './FeatureItem'

// Usage
import { FeatureList, FeatureItem } from './components'
```

## API and Data Fetching

### API Function Pattern

```typescript
// feature.api.ts
export const featureApi = {
  getAll: async () => {
    const { data } = await apiClient.get<ApiResponse<Feature[]>>('/features')
    return data.data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Feature>>(`/features/${id}`)
    return data.data
  },

  create: async (dto: CreateFeatureDto) => {
    const { data } = await apiClient.post<ApiResponse<Feature>>('/features', dto)
    return data.data
  },
}
```

### React Query Pattern

```typescript
// feature.queries.ts
export const featureKeys = {
  all: ['features'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters: object) => [...featureKeys.lists(), filters] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
}

export function useFeatures(filters?: FeatureFilters) {
  return useQuery({
    queryKey: featureKeys.list(filters ?? {}),
    queryFn: () => featureApi.getAll(filters),
  })
}

export function useCreateFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: featureApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
    },
  })
}
```

## Form Handling

### React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const onSubmit = (data: FormData) => {
    // Handle submit
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      {/* ... */}
    </form>
  )
}
```

## Error Handling

### Try-Catch Pattern

```typescript
async function fetchData() {
  try {
    const data = await api.getData()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle API-specific errors
      console.error('API Error:', error.message)
    } else {
      // Handle unexpected errors
      console.error('Unexpected error:', error)
    }
    throw error
  }
}
```

### Error Boundaries

```typescript
// Wrap components that might throw
<ErrorBoundary fallback={<ErrorFallback />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

## Comments and Documentation

### When to Comment

```typescript
// ✅ Good - Explain "why", not "what"
// We use a 5-second delay to allow the animation to complete
// before removing the element from the DOM
setTimeout(() => removeElement(), 5000)

// ❌ Bad - Obvious comments
// Increment counter by 1
counter++

// ✅ Good - Complex logic explanation
/**
 * Calculate the effective date range for the query.
 * If no range is provided, defaults to the last 30 days.
 * The end date is inclusive, so we add 1 day for the API query.
 */
function getDateRange(from?: Date, to?: Date): DateRange {
  // ...
}
```

### JSDoc for Public APIs

```typescript
/**
 * Formats a date according to the application's locale settings.
 *
 * @param date - The date to format
 * @param format - Optional format string (default: 'dd/MM/yyyy')
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // '22/01/2026'
 * formatDate(new Date(), 'yyyy-MM-dd') // '2026-01-22'
 */
export function formatDate(date: Date, format = 'dd/MM/yyyy'): string {
  // ...
}
```

## Best Practices Summary

1. **Keep components small** - Break down large components
2. **Use TypeScript strictly** - Avoid `any`, use proper types
3. **Follow the single responsibility principle** - One purpose per file
4. **Use meaningful names** - Self-documenting code
5. **Handle errors gracefully** - Always consider error states
6. **Test edge cases** - Consider null, undefined, empty states
7. **Keep dependencies minimal** - Don't import what you don't need
8. **Format consistently** - Run Prettier before committing

## Related Documentation

- [Contributing Guide](./contributing.md)
- [Architecture Overview](../architecture/overview.md)
- [Project Structure](../getting-started/project-structure.md)
