# Notifications — Frontend (React / Vite) module

> Repo root: `C:/Users/gurpa/dev/FactoryFlow` · Module: `src/modules/notifications`
> Core plumbing (not in the module): `src/core/notifications`, `src/config/firebase.config.ts`,
> `public/firebase-messaging-sw.js`, `src/core/store/slices/notification.slice.ts`,
> `src/app/providers/NotificationProvider.tsx`
> Paired backend doc: [`factory_app/notifications/docs/README.md`](../../../factory_app/notifications/docs/README.md)
> (absolute: `C:/Users/gurpa/dev/factory_app/notifications/docs/README.md`)

---

## Overview — what it does & who uses it

The notifications feature has **two halves**:

1. **The visible module** (`src/modules/notifications`) — just two screens: a full
   **Notifications list** (`/notifications`) and a permission-gated **Send Notification**
   composer (`/notifications/send`).
2. **The core infrastructure** (`src/core/notifications` + app providers) — the Firebase
   Cloud Messaging (FCM) web-push pipeline: the header **bell**, the permission **prompt**,
   device-token registration, and the foreground/background push handlers. This is wired
   once at app root and used by *every* module, so it does not live under `modules/`.

Audiences:
- **All authenticated users** see the bell, the list, and (optionally) receive web-push
  banners on their browser/PWA.
- **Users with `notifications.can_send_notification`** additionally see the "Send
  Notification" nav item, button, and route.

Everything is backed by the Django `notifications` app — see the paired backend doc for the
API contract, audience routing, and server-side rules.

---

## Key concepts & entities

| Term | Meaning (frontend) |
|---|---|
| **FCM token** | Per-install push token from Firebase. Obtained after browser permission is granted; registered with the backend as a `UserDevice`. Held in Redux (`fcm.token`) and in-memory in `fcmService`. |
| **Permission state** | Browser `Notification.permission`: `default` / `granted` / `denied`. Distinct from the Django *send* permission. |
| **Notification (record)** | In-app item from the backend: `id, title, body, notification_type/type_code, click_action_url, is_read, created_at`. Rendered in the bell and the list. |
| **Foreground message** | Push received while the tab is focused → handled by `NotificationProvider` (toast + Redux insert). |
| **Background message** | Push received while tab is unfocused/closed/PWA → handled by the **service worker** (`firebase-messaging-sw.js`) which draws the OS banner. |
| **Data-only payload** | Backend sends only a `data` dict (`title`, `body`, `url`, `notification_type`, …). Both the SW and the foreground handler read `payload.data.*`. |
| **Send permission** | `NOTIFICATION_PERMISSIONS.SEND` = `notifications.can_send_notification`; `SEND_BULK` = `notifications.can_send_bulk_notification`. |

---

## End-to-end flows

### 1. First-time push enablement (happy path)
1. User logs in. `NotificationProvider` (`src/app/providers/NotificationProvider.tsx`)
   mounts and syncs Redux with the current browser permission.
2. If permission is still `default`, the bottom-sheet **`NotificationPermissionPrompt`**
   ("Enable phone alerts") appears — but only when `fcmService.isSupported()` and
   `canRequestOnThisInstall()` (on iOS, only inside an installed PWA).
3. User taps **Enable** → `setupPushNotifications` thunk →
   `fcmService.setupPushNotifications()`: `initialize()` (registers the SW, attaches the
   foreground `onMessage` listener) → `requestPermission()` → `getDeviceToken()` (needs the
   VAPID key + the SW registration).
4. Token lands in Redux. A `NotificationProvider` effect calls
   `notificationService.registerDevice(token)` → `POST /notifications/devices/register/`
   with `device_type: 'WEB'`, `device_info: navigator.userAgent`.
5. From here, pushes arrive: **foreground** via `onMessage`, **background** via the SW.

### 2. Returning user with permission already granted
`NotificationProvider` detects `permission === 'granted'` and no token yet, and
**auto-runs** `setupPushNotifications` once (guarded by `setupAttemptedRef`) — no user tap
needed. It then re-registers the (possibly rotated) token with the backend.

### 3. Receiving a push
- **Foreground** (`handleForegroundMessage`): builds a `Notification` from `payload.data`,
  dispatches `addNotification` (prepends to the list, bumps unread), and shows a **sonner
  toast** with a "View" action → `payload.data.url`. If the tab is hidden but permission is
  granted, it instead constructs a native `new Notification(...)`. Then refetches the unread
  count after 200 ms.
- **Background** (`public/firebase-messaging-sw.js` → `onBackgroundMessage`): draws the OS
  banner with icon `/pwa-192x192.png`, `tag = notification_type`, and Open/Dismiss actions.
  Clicking (`notificationclick`) focuses an existing app window and navigates it to
  `data.url`, or opens a new window.

### 4. Reading notifications
- **Bell** (`NotificationBell`, in the header): opening it fetches the **latest 4 unread**
  (local state, not Redux, to avoid clobbering the full list), offers **Mark all read**, and
  a **View all** footer → `/notifications`. It also refetches the unread count whenever the
  tab becomes visible again (catches pushes received while away).
- **List page** (`NotificationsPage`): tabs **All / Unread / Read**, page size 20 via
  `limit`/`offset`, prev/next pagination. Clicking a row marks it read (if unread) and
  navigates to `click_action_url` (fallback `/notifications`).

### 5. Sending a notification (composer)
`SendNotificationPage` (reachable only with `SEND`):
1. Fill **title**, **body**, **type** (dropdown from `NOTIFICATION_TYPES`), optional
   **click action URL**.
2. Choose recipients: **All Users** (optionally narrowed by a free-text **role filter**) or
   **Specific Users** (searchable multi-select from `useCompanyUsers` →
   `GET /accounts/users/`).
3. Submit → `useSendNotification` → `POST /notifications/send/`. Success toast shows
   `result.message` ("Notification sent to N users") and the form resets.

### 6. Logout cleanup
`useAuth` logout dispatches `cleanupPushNotifications`: it calls
`notificationService.unregisterDevice(currentToken)` (`POST /devices/unregister/`) then
`fcmService.cleanupPushNotifications()` (deletes the FCM token). Failures are swallowed so
logout always proceeds. `NotificationProvider` also resets its refs on de-auth.

---

## Critical business rules & invariants

- **The list is the source of truth; push is best-effort.** All read/unread state comes
  from the backend. If push never fires, the bell and list still work by polling on
  visibility/company-select.
- **`NotificationGate` never blocks.** Despite its name and its own docstring, the component
  returns `children` for `granted`, `default`, **and** `denied` — so notifications are fully
  optional and the app is always reachable. (The "you must enable notifications" blocking UI
  is dead code — see edge cases.)
- **First-time permission must be user-initiated.** `NotificationProvider` only auto-sets-up
  when permission is *already* `granted`; the initial grant must come from the prompt/gate
  button (required for mobile-PWA push).
- **Token registration is idempotent + self-healing.** The provider tracks the last
  registered token (`deviceRegisteredTokenRef`) and **retries every 30 s** if the backend
  register call fails, so a transient network/company-context blip doesn't lose push.
- **Send visibility = Django permission.** The `/notifications/send` route and the nav child
  are gated by `NOTIFICATION_PERMISSIONS.SEND`; the parent nav item shows for `SEND` **or**
  `SEND_BULK`. The list route itself needs only authentication.
- **Data-only rendering.** Both handlers read `payload.data` (`title`/`body`/`url`/
  `notification_type`); they do **not** rely on an FCM `notification` block. This matches
  the backend's data-only messages.

---

## Integrations & cross-module boundaries

- **Firebase** — `src/config/firebase.config.ts` initializes the app + messaging and
  registers `/firebase-messaging-sw.js` (scope `/`). Config comes from `VITE_FIREBASE_*`
  env vars with a **hardcoded fallback** (project `sampooran-jivo`). The **VAPID key**
  (`VITE_FIREBASE_VAPID_KEY`) is required for `getToken`; without it push silently no-ops.
- **Service worker** — `public/firebase-messaging-sw.js` imports the Firebase **compat SDK
  from the gstatic CDN** and hardcodes the same Firebase config (SWs can't read
  `import.meta.env`). Must be served from the origin root.
- **Redux store** — `src/core/store/slices/notification.slice.ts` owns `fcm`,
  `notifications`, and `preferences` state and all thunks.
- **Auth** — `src/core/auth` (`useAuth`) triggers cleanup on logout; `Authorized` /
  route `permissions` gate the composer.
- **App shell** — `NotificationProvider` (in `AppProviders`), `NotificationGate` (wraps main
  routes in `AppRoutes`), `NotificationBell` (in `Header`), `NotificationPermissionPrompt`
  (in `AppProviders`).
- **Backend** — every call targets `/api/v1/notifications/*` (+ `/accounts/users/` for the
  recipient picker). The list request carries the `Company-Code` header (standard apiClient
  behavior), so it is scoped to the current company + company-null items.

---

## Real-world edge cases

| # | Trigger | Current behaviour | User-visible symptom | Risk / gap |
|---|---|---|---|---|
| 1 | **User blocks notifications** (`denied`) | `NotificationGate` falls through and renders the app; the prompt only shows for `default`, so it won't reappear | App works; **no push ever**; no in-app hint on how to re-enable | The gate's "Notifications are blocked — unblock via the address bar" screen is **unreachable dead code** (the `default\|\|denied` branch returns children first). Users get no guidance. |
| 2 | **User dismisses the prompt** ("Not now") | `localStorage[notification-permission-dismissed] = true`; prompt never returns on this browser | Silently no push until they clear storage or grant via browser UI | No in-app "enable notifications" affordance elsewhere → hard to recover. |
| 3 | **iOS Safari, not installed as PWA** | `canRequestOnThisInstall()` is false → prompt hidden; `getToken` unsupported | iPhone users see the list but **never** get push | Expected iOS limitation, but there's no messaging telling them to "Add to Home Screen". |
| 4 | **Backend device-register fails** (offline / no company context yet) | Effect catches, clears the ref, and **retries after 30 s** (`BACKEND_DEVICE_REGISTER_RETRY_MS`) | Brief window with no push, then self-heals | Good resilience; only logs a `console.warn`, so a persistent failure is invisible to the user. |
| 5 | **FCM token rotates** (browser refreshes it) | `getToken` returns the new token; provider registers it (ref comparison); backend `update_or_create` dedups | Seamless | Old token stays on the backend until a push errors (`is_active=False`) or the 30-day cleanup runs. |
| 6 | **Tab backgrounded but page still alive** | SW `onBackgroundMessage` **and** the foreground handler's hidden-tab branch can both run depending on focus/visibility timing | Occasionally a **duplicate** banner (native + SW) | Overlap between `visibilityState !== 'visible'` (manual `new Notification`) and the SW handler; low-severity but real. |
| 7 | **Offline / server unreachable** | Bell fetch fails silently (empty popover); list shows loader then empty; `markAsRead` errors handled by apiClient | "No notifications" even when there are some | No offline cache of the list; nothing is queued. |
| 8 | **Foreground push id collision** | Foreground handler synthesizes `id: Date.now()` for the Redux item | Two pushes within the same ms could share an id | Cosmetic (React key / mark-read targets the wrong local item until the next fetch reconciles). |
| 9 | **Composer sends an out-of-list type** | `NOTIFICATION_TYPES` dropdown is a **hardcoded ~24-item subset**; backend accepts any string | Sender can't pick newer types (returnable, work-permit, BOM, dispatch, stock) | Dropdown drifts from the backend enum (~55 types); not a bug, but stale UX. |

---

## Failure modes / what can break

- **Silent push-off**: missing `VITE_FIREBASE_VAPID_KEY`, an unregistered/404 service
  worker, or `denied` permission all end with **no banners and no error surfaced** — the
  only signal is `console.warn`. Operators think "notifications are broken" while the list
  still updates on refresh.
- **Duplicate banners** when a tab is backgrounded-but-open (edge 6).
- **Unread badge drift**: the badge follows Redux `unreadCount`, refreshed on tab-visibility
  and after foreground pushes/mark-read; if a background push arrives and the tab never
  regains focus, the badge lags until the next visibility change or company switch.
- **Composer role filter is opaque**: `role_filter` is a free-text `UserRole.name`; a typo
  silently matches nobody and the success toast still says "sent to 0 users".
- **No preferences screen**: `useNotificationPreferences`/`updatePreference` and the backend
  `preferences/` API exist, but **no page renders them**, so users can't self-manage opt-outs
  from the UI.

---

## Improvement opportunities & known gaps

- **Fix / remove `NotificationGate`**: either make it actually gate (and reach the denied
  instructions), or delete the dead blocking branch and update the docstring (edge 1).
- **Add a persistent "enable notifications" entry point** (settings/profile) for users who
  dismissed the prompt or are on non-PWA iOS (edges 2, 3).
- **Build the Preferences UI** on top of the existing hook + API.
- **De-dupe foreground vs SW banners** and use a stable id from `payload.data.notification_id`
  instead of `Date.now()` (edges 6, 8).
- **Generate `NOTIFICATION_TYPES` / `NotificationTypeCode`** from the backend enum so the
  composer dropdown stays in sync (edge 9).
- **Surface registration/health failures** beyond `console.warn`.

---

## Permissions & roles (nav gating)

Defined in `src/config/permissions/notification.permissions.ts`:
- `NOTIFICATION_PERMISSIONS.SEND` = `notifications.can_send_notification`
- `NOTIFICATION_PERMISSIONS.SEND_BULK` = `notifications.can_send_bulk_notification`

| Element | Gate | Where |
|---|---|---|
| `/notifications` route | authenticated only | `module.config.tsx` |
| `/notifications/send` route | `SEND` | `module.config.tsx` (`route.permissions`) |
| Sidebar "Notifications" parent | `SEND` **or** `SEND_BULK` | `module.config.tsx` (`navigation`) |
| Sidebar child "Send Notification" | `SEND` | `module.config.tsx` |
| "Send Notification" button on the list | `SEND` | `NotificationsPage.tsx` (`<Authorized>`) |

The bell, list, and push pipeline require **no** special permission — only login.

---

## Developer file map

**Module (`src/modules/notifications`)**
- `module.config.tsx` — routes (`/notifications`, `/notifications/send`) + nav gating.
- `pages/NotificationsPage.tsx` — list, filter tabs, pagination, click-to-navigate.
- `pages/SendNotificationPage.tsx` — composer (recipients: all/role/specific).
- `api/sendNotification.api.ts` / `.queries.ts` — `POST /notifications/send/` + React Query hook.
- `api/users.api.ts` — `GET /accounts/users/` for the recipient picker.
- `types/sendNotification.types.ts` — request/response + `NOTIFICATION_TYPES` dropdown list.

**Core infrastructure (`src/core/notifications`)**
- `fcm.service.ts` — FCM singleton: support check, permission, get/delete token, setup/cleanup, foreground `onMessage`.
- `notification.service.ts` — REST client: list/detail/mark-read/unread-count/preferences/register/unregister/test.
- `hooks/useNotifications.ts` — `usePushNotifications`, `useNotificationList`, `useUnreadCount`, `useNotificationPreferences`.
- `components/NotificationBell.tsx` — header bell + popover.
- `components/NotificationGate.tsx` — route wrapper (**currently non-blocking**; see edge 1).
- `components/NotificationPermissionPrompt.tsx` — bottom-sheet enable prompt.
- `types.ts` — TS types + `NotificationTypeCode`.

**App wiring & config**
- `src/app/providers/NotificationProvider.tsx` — login→setup→register, foreground handling, retry.
- `src/app/providers/AppProviders.tsx` — mounts provider + prompt.
- `src/app/routes/AppRoutes.tsx` — wraps main routes in `NotificationGate`.
- `src/app/layouts/components/Header.tsx` — renders `NotificationBell`.
- `src/core/store/slices/notification.slice.ts` — Redux state + thunks.
- `src/config/firebase.config.ts` — Firebase init + SW registration.
- `src/config/permissions/notification.permissions.ts` — permission constants.
- `src/config/constants/api.constants.ts` — `NOTIFICATIONS` + `ACCOUNTS.USERS` endpoints.
- `public/firebase-messaging-sw.js` — background push + notification click handling.

---

## Related docs
- **Paired backend doc**: [`factory_app/notifications/docs/README.md`](../../../factory_app/notifications/docs/README.md)
  (`C:/Users/gurpa/dev/factory_app/notifications/docs/README.md`)
- Module-local README: [`src/modules/notifications/docs/README.md`](../../src/modules/notifications/docs/README.md)
- [Modules Overview](./overview.md)
