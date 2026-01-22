# Testing Guide

This document describes the testing strategies, tools, and best practices for the Factory Management System.

## Overview

The project uses a comprehensive testing approach covering:

- **Unit Tests** - Individual functions and components
- **Integration Tests** - Component interactions and API integration
- **End-to-End Tests** - Full user workflows (optional)

## Testing Tools

| Tool | Purpose |
|------|---------|
| Vitest | Test runner (Vite-native) |
| React Testing Library | React component testing |
| MSW (Mock Service Worker) | API mocking |
| Testing Library Jest DOM | DOM matchers |

## Test File Organization

```
src/
├── modules/
│   └── auth/
│       ├── components/
│       │   ├── LoginForm.tsx
│       │   └── LoginForm.test.tsx    # Co-located test
│       └── hooks/
│           ├── useAuth.ts
│           └── useAuth.test.ts
├── shared/
│   └── utils/
│       ├── format.ts
│       └── format.test.ts
└── __tests__/                        # Integration tests
    └── auth-flow.test.tsx
```

### Naming Convention

| Pattern | Use Case |
|---------|----------|
| `*.test.ts` | Unit tests |
| `*.test.tsx` | Component tests |
| `*.spec.ts` | Integration tests |

## Writing Unit Tests

### Testing Utility Functions

```typescript
// src/shared/utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, formatNumber } from './format'

describe('formatDate', () => {
  it('formats date in DD/MM/YYYY format', () => {
    const date = new Date('2026-01-22')
    expect(formatDate(date)).toBe('22/01/2026')
  })

  it('handles invalid dates gracefully', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid Date')
  })

  it('accepts custom format', () => {
    const date = new Date('2026-01-22')
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2026-01-22')
  })
})

describe('formatCurrency', () => {
  it('formats numbers as INR currency', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00')
    expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-1000)).toBe('-₹1,000.00')
  })
})
```

### Testing Hooks

```typescript
// src/modules/auth/hooks/useAuth.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { TestWrapper } from '@/test-utils/TestWrapper'

describe('useAuth', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('handles login successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    })

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toBeDefined()
  })

  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    })

    // First login
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    // Then logout
    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
```

## Writing Component Tests

### Basic Component Test

```typescript
// src/shared/components/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })
})
```

### Testing Forms

```typescript
// src/modules/auth/components/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import { TestWrapper } from '@/test-utils/TestWrapper'

describe('LoginForm', () => {
  it('renders login form fields', () => {
    render(<LoginForm />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<LoginForm />, { wrapper: TestWrapper })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<LoginForm />, { wrapper: TestWrapper })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />, { wrapper: TestWrapper })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
```

### Testing with React Query

```typescript
// src/modules/gate/components/DriverSelect.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DriverSelect } from './DriverSelect'
import { TestWrapper } from '@/test-utils/TestWrapper'
import { server } from '@/test-utils/msw-server'
import { rest } from 'msw'

describe('DriverSelect', () => {
  it('loads and displays drivers', async () => {
    render(
      <DriverSelect value="" onChange={() => {}} />,
      { wrapper: TestWrapper }
    )

    // Shows loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Shows drivers after loading
    await waitFor(() => {
      expect(screen.getByText('Driver One')).toBeInTheDocument()
      expect(screen.getByText('Driver Two')).toBeInTheDocument()
    })
  })

  it('handles selection', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <DriverSelect value="" onChange={handleChange} />,
      { wrapper: TestWrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('Driver One')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Driver One'))

    expect(handleChange).toHaveBeenCalledWith('driver-1')
  })

  it('handles API error', async () => {
    // Override handler to return error
    server.use(
      rest.get('/api/v1/drivers/names', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Server error' }))
      })
    )

    render(
      <DriverSelect value="" onChange={() => {}} />,
      { wrapper: TestWrapper }
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

## API Mocking with MSW

### Setup

```typescript
// src/test-utils/msw-server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### Handlers

```typescript
// src/test-utils/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // Auth
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          access: 'mock-token',
          refresh: 'mock-refresh',
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
        },
      })
    )
  }),

  // Drivers
  rest.get('/api/v1/drivers/names', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          { id: 'driver-1', name: 'Driver One' },
          { id: 'driver-2', name: 'Driver Two' },
        ],
      })
    )
  }),
]
```

### Test Setup

```typescript
// src/test-utils/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './msw-server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Test Wrapper

```typescript
// src/test-utils/TestWrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from '@/core/store/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
})

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/modules/auth/hooks/useAuth.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests matching pattern
npm test -- --grep "LoginForm"
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ✅ Good - Test what the user sees
it('shows error message when login fails', async () => {
  // ...
  expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
})

// ❌ Bad - Testing internal state
it('sets error state to true', async () => {
  // ...
  expect(component.state.hasError).toBe(true)
})
```

### 2. Use Testing Library Queries Correctly

```typescript
// Priority order for queries:
// 1. getByRole - Accessible queries
// 2. getByLabelText - Form fields
// 3. getByPlaceholderText - Inputs
// 4. getByText - Non-interactive elements
// 5. getByTestId - Last resort

// ✅ Good
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')

// ❌ Avoid
screen.getByTestId('submit-button')
```

### 3. Prefer userEvent Over fireEvent

```typescript
// ✅ Good - More realistic
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'text')

// ❌ Avoid
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'text' } })
```

### 4. Use waitFor for Async Operations

```typescript
// ✅ Good
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// ❌ Bad - Fixed delays
await new Promise(r => setTimeout(r, 1000))
expect(screen.getByText('Success')).toBeInTheDocument()
```

### 5. Keep Tests Independent

```typescript
// ✅ Good - Each test is independent
beforeEach(() => {
  // Reset state
})

it('test 1', () => { /* ... */ })
it('test 2', () => { /* ... */ })

// ❌ Bad - Tests depend on each other
it('creates item', () => { /* ... */ })
it('modifies created item', () => { /* uses item from previous test */ })
```

## Related Documentation

- [Code Style Guide](./code-style.md)
- [Contributing Guide](./contributing.md)
