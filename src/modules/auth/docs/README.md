# Auth Module

Handles user authentication, company selection, and profile management.

## Routes

| Route | Page | Auth |
|---|---|---|
| `/login` | LoginPage | Public |
| `/select-company` | CompanySelectionPage | Public |
| `/loading-user` | LoadingUserPage | Public |
| `/profile` | ProfilePage | Protected |

## Structure

```
auth/
├── module.config.tsx
├── components/
│   ├── LoginForm.tsx
│   └── ChangePasswordDialog.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── CompanySelectionPage.tsx
│   ├── LoadingUserPage.tsx
│   └── ProfilePage.tsx
├── schemas/
│   ├── login.schema.ts
│   └── changePassword.schema.ts
└── utils/
```

## Auth Flow

```
Login → Select Company → Loading User → Dashboard
                                ↓
                         (Token stored in IndexedDB)
```

- JWT-based authentication with proactive token refresh
- Multi-tenant: user selects a company after login, all subsequent requests include a `Company-Code` header
- Token refresh runs every 30 seconds if token expires within 1 minute

## Dependencies

- `@/core/auth` — Auth hooks, store, services
- `@/shared/components/ui` — UI primitives
- No other module imports
