# Notifications Module

Push notification management — viewing and sending notifications via Firebase Cloud Messaging.

## Overview

The notifications module provides two pages: a list of all received notifications and a form to send targeted notifications to users. The notification bell icon and FCM integration live in `@/core/notifications/`, not in this module.

## Module Structure

```
src/modules/notifications/
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

## Routes & Permissions

| Route | Permission | Description |
|---|---|---|
| `/notifications` | Protected | All notifications |
| `/notifications/send` | `SEND` | Send notification form |

## Related Infrastructure

The core notification infrastructure lives outside this module:

- `src/core/notifications/components/NotificationBell.tsx` — Bell icon in header
- `src/core/notifications/components/NotificationGate.tsx` — Permission gate
- `src/core/notifications/hooks/` — Notification hooks (unread count, etc.)
- Firebase config and FCM service are in `src/config/` and `src/core/`

## Local Documentation

See also: [`src/modules/notifications/docs/README.md`](../../src/modules/notifications/docs/README.md)

## Related

- [Modules Overview](./overview.md)
