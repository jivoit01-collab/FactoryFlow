# Notifications Module

Push notification management — viewing notifications and sending targeted notifications to users.

## Routes

| Route | Page | Permission |
|---|---|---|
| `/notifications` | NotificationsPage | Protected |
| `/notifications/send` | SendNotificationPage | `SEND` permission |

## Structure

```
notifications/
├── module.config.tsx
├── api/
│   ├── sendNotification.api.ts
│   ├── sendNotification.queries.ts
│   └── users.api.ts
├── pages/
│   ├── NotificationsPage.tsx
│   └── SendNotificationPage.tsx
└── types/
    └── sendNotification.types.ts
```

## Features

- View all received notifications
- Send targeted notifications to specific users (permission-gated)
- Integrates with Firebase Cloud Messaging (FCM) for push delivery
- Notification bell in header is in `@/core/notifications` (not this module)

## Dependencies

- `@/core/api` — API client
- `@/core/auth` — Permission hooks
- `@/shared/components/ui` — UI primitives
- No other module imports
