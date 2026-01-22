# Authentication Module

The authentication module handles user login, session management, company selection, and profile management.

## Module Structure

```
src/modules/auth/
├── pages/
│   ├── LoginPage.tsx           # User login form
│   ├── CompanySelectionPage.tsx # Multi-tenant company selection
│   ├── LoadingUserPage.tsx     # User data loading screen
│   └── ProfilePage.tsx         # User profile management
├── components/
│   └── [Auth components]
├── schemas/
│   └── login.schema.ts         # Login form validation
└── utils/
    └── [Auth utilities]
```

## Pages

### LoginPage

The entry point for user authentication.

**Route:** `/login`

**Features:**
- Email and password login form
- Form validation with Zod
- Error handling and display
- Redirect to company selection or dashboard

**Implementation:**

```typescript
// Simplified example
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await login(data);

      if (response.user.companies.length > 1) {
        navigate('/select-company');
      } else {
        navigate('/');
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('email')} placeholder="Email" />
      <Input {...form.register('password')} type="password" />
      <Button type="submit">Login</Button>
    </form>
  );
}
```

### CompanySelectionPage

Allows users with multiple company access to select their working company.

**Route:** `/select-company`

**Features:**
- Display all companies user has access to
- Show user's role in each company
- Set selected company in state

**Implementation:**

```typescript
function CompanySelectionPage() {
  const { user, setCurrentCompany } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (company: UserCompany) => {
    setCurrentCompany(company);
    navigate('/loading-user');
  };

  return (
    <div className="grid gap-4">
      <h1>Select Company</h1>
      {user?.companies.map((company) => (
        <Card
          key={company.id}
          onClick={() => handleSelect(company)}
          className="cursor-pointer hover:border-primary"
        >
          <CardTitle>{company.name}</CardTitle>
          <CardDescription>Role: {company.role}</CardDescription>
        </Card>
      ))}
    </div>
  );
}
```

### LoadingUserPage

Intermediate page that fetches fresh user data after login or company selection.

**Route:** `/loading-user`

**Features:**
- Fetches current user data from API
- Updates permissions in Redux store
- Shows loading indicator
- Redirects to dashboard on success

**Implementation:**

```typescript
function LoadingUserPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        dispatch(setUser(userData));
        dispatch(setPermissions(userData.permissions));
        navigate('/');
      } catch (error) {
        // Handle error, redirect to login
        navigate('/login');
      }
    };

    loadUser();
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner />
      <span>Loading your profile...</span>
    </div>
  );
}
```

### ProfilePage

User profile viewing and management.

**Route:** `/profile`

**Features:**
- Display user information
- Update profile details
- Change password
- View current company and role

**Implementation:**

```typescript
function ProfilePage() {
  const { user, currentCompany } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Company</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Company:</strong> {currentCompany?.name}</p>
          <p><strong>Role:</strong> {currentCompany?.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

## Schemas

### Login Schema

```typescript
// src/modules/auth/schemas/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

### Change Password Schema

```typescript
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Auth Flow Diagram                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User visits app                                             │
│       │                                                      │
│       ▼                                                      │
│  ┌────────────────┐     No      ┌───────────────┐          │
│  │ Has valid      │ ─────────► │   LoginPage   │          │
│  │ cached auth?   │             │               │          │
│  └────────────────┘             └───────┬───────┘          │
│       │ Yes                             │                   │
│       │                                 │ Submit            │
│       │                                 ▼                   │
│       │                         ┌───────────────┐          │
│       │                         │  POST /login  │          │
│       │                         └───────┬───────┘          │
│       │                                 │                   │
│       │        ┌────────────────────────┤                   │
│       │        │                        │                   │
│       ▼        ▼                        ▼                   │
│  ┌────────────────┐  Multiple   ┌─────────────────────┐    │
│  │ Single company │  companies  │ CompanySelectionPage│    │
│  │    access      │◄───────────│                     │    │
│  └────────────────┘             └─────────────────────┘    │
│       │                                 │                   │
│       └─────────────┬───────────────────┘                   │
│                     │                                       │
│                     ▼                                       │
│             ┌───────────────┐                              │
│             │LoadingUserPage│                              │
│             │  GET /auth/me │                              │
│             └───────┬───────┘                              │
│                     │                                       │
│                     ▼                                       │
│             ┌───────────────┐                              │
│             │   Dashboard   │                              │
│             │      /        │                              │
│             └───────────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Core Auth

The auth module uses services from `src/core/auth/`:

```typescript
// Using auth hook
import { useAuth } from '@/core/auth/hooks/useAuth';

function SomeAuthComponent() {
  const {
    user,
    isAuthenticated,
    login,
    logout,
    permissions
  } = useAuth();
}

// Using permission hook
import { usePermission } from '@/core/auth/hooks/usePermission';

function ProtectedComponent() {
  const { hasPermission } = usePermission();

  if (!hasPermission('gatein.view_dashboard')) {
    return <AccessDenied />;
  }
}
```

## Security Considerations

### Form Security

- Passwords are never logged or stored in plain text
- Form state is cleared on component unmount
- Login attempts may be rate-limited by the backend

### Session Security

- Tokens stored in IndexedDB (not localStorage)
- Automatic token refresh before expiry
- Session cleared on logout

### Error Handling

- Generic error messages for invalid credentials
- Specific messages for network/server errors
- No sensitive information in error responses

## Related Documentation

- [Authentication System](../api/authentication.md)
- [Protected Routes](../architecture/overview.md#routing-architecture)
- [State Management](../architecture/state-management.md)
