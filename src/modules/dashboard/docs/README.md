# Dashboard Module

Main application dashboard showing factory operations overview.

## Routes

| Route | Page | Permission |
|---|---|---|
| `/` | DashboardPage | `gatein.view_dashboard` |

## Structure

```
dashboard/
├── module.config.tsx
├── components/
│   └── DashboardStats.tsx
└── pages/
    └── DashboardPage.tsx
```

## Features

- Overview statistics and KPIs
- Quick access to common actions
- Module navigation shortcuts

## Dependencies

- `@/core/auth` — Permission checks
- `@/shared/components` — UI primitives, dashboard components
- No other module imports
