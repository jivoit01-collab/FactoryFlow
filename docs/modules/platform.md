# Platform / Foundation (Frontend)

> Module folder: `src/modules/auth` (screens) + `src/core/auth` (engine) + `src/modules/ai` (global assistant) + `src/core/api/client.ts` (request plumbing).
> Audience: new developers + technical managers.
> Grounded in the code as of this revision; older docs (`docs/modules/auth.md`, module READMEs) may be stale — trust this.
> Paired backend doc: `C:/Users/gurpa/dev/factory_app/docs/platform_foundation.md`

---

## Overview — what it does & who uses it

This is the shell every operator passes through before they reach any real work screen:

1. **Login** → **Select company** → **Loading user** → the app.
2. A **Profile** screen to switch company, review permissions, change password, and log out.
3. A **global "Factory AI" widget** docked bottom-right on every authenticated page.
4. The **permission-gated sidebar** that decides which modules an operator even sees.

The heavy lifting lives in **`src/core/auth`** (token storage, Redux state, permission hooks, route guards) and **`src/core/api/client.ts`** (the axios instance that injects `Authorization` + `Company-Code` on every call). The `src/modules/auth` folder is thin: it is just the four screens and their forms. Everyone who uses FactoryFlow uses this module on every session.

---

## Key concepts & entities

- **Session lives in IndexedDB** (`factoryManagementDB`, store `auth`, single record keyed `FMS_user`). It holds `access`, `refresh`, `accessExpiresAt`, `refreshExpiresAt`, the `user`, `permissions[]`, and the selected `currentCompany`. Redux mirrors this for synchronous reads. Source: `core/auth/services/indexedDb.service.ts`.
- **Two user shapes.** `UserLogin` (id, email, full_name, companies) comes back from `/login`. The full `User` (adds `employee_code`, `is_staff`, `permissions[]`, …) comes from `/me`. This is why a `LoadingUserPage` step exists — login alone does not carry permissions.
- **`currentCompany`** — the chosen `UserCompany` `{ company_id, company_name, company_code, role, is_default, is_active }`. Its `company_code` becomes the `Company-Code` header.
- **`permissions[]`** — flat Django strings `app_label.codename` (e.g. `gate_core.view_...`). All gating derives from this array.
- **`permissionsLoaded`** — a Redux flag. Guards and the sidebar refuse to make access decisions until it is `true` (prevents a flash of "no access").
- **`modulePrefix` gating** — a sidebar item is shown when the user holds **any** permission whose prefix matches the module (`hasModulePermission`). This is the crux of the CRITICAL rule below.
- **Redux `auth` slice** (`core/auth/store/authSlice.ts`) — `isAuthenticated`, `isLoading`, `permissionsLoaded`, plus `user/permissions/currentCompany/tokens`.

---

## End-to-end flows

### 1. Login (`LoginPage` → `core/auth/services/auth.service.ts`)
1. `LoginForm` (Zod-validated: email required+valid, password 1..max) submits.
2. `indexedDBService.clearAuthData()` wipes any stale session, then `authService.login()` `POST /accounts/login/`.
3. Response is validated, token expiry timestamps computed (`Date.now() + expires_in*1000`), and stored in IndexedDB.
4. `dispatch(loginSuccess(response))` — sets `isAuthenticated`, `permissionsLoaded=false`, `currentCompany=null`.
5. Navigate to **`/select-company`**.

### 2. Company selection (`CompanySelectionPage`)
1. Lists `user.companies` (each card shows role + code). No companies → "No Companies Available" card.
2. On Continue (double-submit guarded by `submittingRef`): `indexedDBService.updateCurrentCompany(selected)` → `queryClient.invalidateQueries()` → `dispatch(switchCompany(selected))` → navigate to **`/loading-user`** (carrying the intended `from` URL).

### 3. Loading user (`LoadingUserPage`)
1. `ensureValidToken()` — refreshes if near expiry; if fully expired, clears session and bounces to `/login`.
2. `authService.getCurrentUser()` `GET /accounts/me/` → full `User` incl. `permissions[]`.
3. `dispatch(updateUser(userData))` — sets `permissions`, resolves `currentCompany` (keeps selection, else default/first), `permissionsLoaded=true`.
4. Navigate to the intended URL (or `/` dashboard). Non-401 failure → `PageLoadError` screen; 401 → clear + `/login`.

### 4. Session restore on reload (`core/auth/components/AuthInitializer.tsx`)
1. On app mount, `validateStoredTokens()` reads tokens from IndexedDB, drops them if fully expired, refreshes if near expiry.
2. Valid → rebuild a `loginSuccess` payload from cache, then **route by company state**: no `currentCompany` → `/select-company`; has one → `/loading-user` (which re-fetches `/me`). The intended URL is captured at mount, and auth-internal paths are sanitized so you never bounce back into `/select-company`.
3. `markAuthInitialized()` releases the API client (requests queue on `initializationPromise` until then).

### 5. Token refresh (`core/api/client.ts` + `core/auth/utils/tokenRefresh.util.ts`)
- **Proactive:** the request interceptor checks `shouldRefreshToken()` (within 1 min of expiry) and refreshes *before* sending. A background interval also checks every 30 s.
- **Reactive:** a `401` triggers a one-time retry after refresh.
- **Single-flight lock:** `acquireRefreshedToken()` reuses one in-flight refresh so concurrent calls/401s don't stampede. If refresh fails → `clearAuthData()` + hard `window.location.href = '/login'`.

### 6. Every authenticated request gets a company header
The request interceptor attaches `Authorization: Bearer <access>` and `Company-Code`. If `currentCompany` is missing from cache but a user exists, it **auto-restores** the default (or first active) company and persists it — so company-scoped endpoints don't fail with "Company-Code header is missing." An explicit per-request `Company-Code` (cross-company lookups) is respected and not overwritten.

### 7. Switch company from Profile (`ProfilePage` → `useAuth().switchCompany`)
`authService.switchCompany()` (IndexedDB) → `dispatch(switchCompany)` → **`queryClient.clear()`** (drop all cached data so the new company's data reloads) → navigate to dashboard.

### 8. Change password (`ChangePasswordDialog`)
Zod schema requires new ≠ old. `authService.changePassword()` `POST /accounts/change-password/` as `application/x-www-form-urlencoded`. Success shows a confirmation and auto-closes after 2 s.

### 9. AI assistant chat (`src/modules/ai`)
`AiAssistantWidget` (mounted once in `MainLayout`) → `useAskAssistant()` (`react-query` mutation) → `POST /ai/assistant/chat/` with `{ question, page: location.pathname }`. The reply's `answer` is rendered through a small markdown parser (paragraphs/lists/bold/inline-code) and `sources[]` render as badges. Errors show an in-bubble message + a toast.

### 10. Logout (`useAuth().logout`)
Clears the permission-refresh interval → best-effort FCM device cleanup → `authService.logout()` (**clears IndexedDB only — no server call**) → reset notification state → `dispatch(logout())` → navigate to `/login`.

---

## Critical business rules & invariants

1. **The sidebar gates by permission, not role or group (CRITICAL).** `Sidebar.tsx` shows a module when `hasModulePermission(item.modulePrefix)` is true — i.e. the user holds **any** `permission` starting with that module's app prefix. Because backend `/me` merges group + direct permissions, **editing a Django group's permission set can make whole modules appear or disappear** for its members, with no change to the user record. Managers changing group perms should expect menu changes across users.
2. **Nothing renders access decisions until `permissionsLoaded` is true.** `ProtectedRoute`, `Authorized`, and the sidebar all wait; before that, routes show a spinner and the sidebar is empty. This avoids briefly showing/hiding modules on every load.
3. **`currentCompany.company_code` == the `Company-Code` header** for every request. Switching company must clear the query cache (`queryClient.clear()`), or another company's cached data leaks into the new context.
4. **Session is IndexedDB-first, Redux-mirrored.** The axios interceptor reads the *token* from IndexedDB (not Redux) so it always uses the freshest value even mid-refresh.
5. **Timings** (`config/constants/auth.constants.ts`): refresh starts 1 min before access expiry; token check every 30 s; **permissions re-fetched every 5 min** and in the background on load. A revoked permission therefore persists in the UI for up to ~5 min (or until reload).
6. **Route guards, two flavors:** `ProtectedRoute` (route-level; redirects to `/login` if unauthenticated or `/unauthorized` if missing perms/roles) vs `Authorized` (inline; renders `fallback` instead of children). Both accept `permissions`, `companyRoles`, `requireAll`.

---

## Integrations & cross-module boundaries

- **Backend `accounts`/`company`** — login, `/me`, refresh, change-password; `Company-Code` binds each request to one company (mirror of the backend `HasCompanyContext` gate).
- **Backend `ai_assistant`** — the widget's only dependency; `POST /ai/assistant/chat/`. The widget sends the current route as `page` for context.
- **Cross-company** — everything company-scoped flows from `currentCompany`. A stale/incorrect `currentCompany` is the frontend root cause of "wrong/blank company data" (pairs with the backend cross-company boundary rule).
- **Notifications (FCM)** — logout unregisters push devices before clearing auth; a company switch does not.
- **React Query** — `queryClient` is invalidated on company select and cleared on company switch/logout to prevent cross-company/cross-user cache bleed.
- **`MainLayout`** — hosts the permission-gated `Sidebar` + the global `AiAssistantWidget`. Only reachable behind `ProtectedRoute` (main layout routes require auth).

---

## Real-world edge cases

Each: trigger → current behaviour → operator-visible symptom → risk/gap.

1. **Cached `currentCompany` lost (cleared storage / new device restore)** — trigger: IndexedDB record missing the company. → Interceptor auto-restores the default active company and persists it. → Symptom: user silently lands in their *default* company. → Risk: if they meant a different company, they see the wrong company's data until they switch — no warning.
2. **iOS Safari closes the IndexedDB connection** — trigger: memory pressure / navigation on iOS. → `indexedDBService` detects the dead handle and reopens on next call. → Symptom: none (transparent). → Risk: a failed reopen would drop the session → forced re-login.
3. **Group permission revoked mid-session** — trigger: admin edits a group. → Up to ~5 min later (or on reload) `/me` refresh updates `permissions`; the sidebar re-filters. → Symptom: a module vanishes; if the user is *on* that route when perms load, `ProtectedRoute` redirects to `/unauthorized`. → Risk: stale access for the refresh window.
4. **Access token expired but refresh still valid** — trigger: idle past 25 h. → Proactive or reactive refresh swaps tokens transparently. → Symptom: none. **Refresh also expired (7 days idle):** session cleared, redirect to `/login`.
5. **Concurrent requests all 401** — trigger: token died server-side. → Single-flight lock refreshes once; all retries reuse it. On refresh failure → clear + hard redirect `/login`. → Symptom: brief interruption then login screen. → Risk: any in-flight unsaved form is lost on the hard redirect.
6. **User has no company memberships** — trigger: account created without a `UserCompany`. → `CompanySelectionPage` shows "No Companies Available. Contact your administrator." → Operator is stuck (by design). 
7. **`/me` fails on the loading screen (network/timeout, not 401)** — trigger: backend slow/down after login. → `LoadingUserPage` renders `PageLoadError`. → Symptom: an error screen instead of the dashboard; login already succeeded. → Risk: user must retry/reload.
8. **AI provider/config error** — trigger: backend returns 502/503 for the assistant. → The widget appends the server's human message as an assistant bubble and fires a toast. → Symptom: "AI assistant is unavailable right now." (or a specific quota/DNS/key message). → Risk: none to the rest of the app.
9. **Double-clicking "Continue" on company select** — trigger: impatient click. → `submittingRef` blocks the second submit. → Symptom: none. 
10. **Backend rejects a truly missing `Company-Code`** — trigger: no company anywhere in cache/user. → Request 403s; the global error toast shows the backend message. → Symptom: red toast "Company-Code header is missing." → Risk: rare; only if the user genuinely has no company.

---

## Failure modes / what can break

- **Permissions stuck empty** (repeated `/me` failure) → sidebar shows few/no modules; operator reports "my menu disappeared." No explicit error — it looks like a permission problem.
- **Wrong company selected / stale** → every screen quietly shows another company's data. The single most confusing failure; there is no company banner warning.
- **Refresh failure** → hard redirect to `/login`, losing unsaved work in any open form.
- **Backend unreachable** → axios 30 s timeout, then an error toast per failed call; the shell still renders but data screens are empty.
- **AI backend down** → assistant bubble error + toast; isolated to the widget.
- **IndexedDB unavailable** (private mode / blocked storage) → auth can't persist; user is effectively logged out on every reload.

---

## Improvement opportunities & known gaps

- **Logout is client-only.** `authService.logout()` just clears IndexedDB; the defined `AUTH.LOGOUT: '/accounts/logout/'` constant is never called and the backend has no such route. The refresh token is not revoked server-side.
- **No visible "current company" affordance outside Profile / selection.** Given wrong-company data is the top confusion, a persistent company indicator would help.
- **Permission staleness window (~5 min).** Consider forcing a permission refresh on route change into sensitive modules, or a shorter interval for high-risk perms.
- **Auto-restore of default company can mask a bug.** Silently choosing the default company hides "why is my company missing?" situations; a one-time prompt could be safer.
- **`core/auth/constants/roles.ts`** (ADMIN/SUPERVISOR/OPERATOR/…) is largely vestigial — real gating is Django permissions; the role enum can mislead new devs into role-based checks.

---

## Permissions & roles (who sees / does what; nav gating)

- **`usePermission()`** (`core/auth/hooks/usePermission.ts`) is the toolbox: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, **`hasModulePermission`** (prefix match — powers the sidebar), `canView/canAdd/canChange/canDelete` (Django `app.action_model`), plus company-role helpers `hasCompanyRole` / `hasAnyCompanyRole` / `hasRoleInAnyCompany`.
- **Route protection:** `ProtectedRoute` (redirects) for pages; `Authorized` / `withAuthorization` (fallback render) for buttons/sections. Both support `requireAll`.
- **Company roles** (`currentCompany.role`, e.g. `Admin`/`QC`/`Store`) are available for `companyRoles` gating and are shown on Profile / the company picker, but the primary gate everywhere is the **permission**, not the role.
- **Superusers** hold every permission server-side, so they see every module and the AI SQL power.
- **Nav gating recap (CRITICAL):** module visibility = "does the user hold any permission under this module's prefix?" → managing access is done by managing Django groups/permissions, and those changes ripple into the menu automatically.

---

## Developer file map

### Frontend — screens (`src/modules/auth`)
- `pages/LoginPage.tsx`, `components/LoginForm.tsx`, `schemas/login.schema.ts`
- `pages/CompanySelectionPage.tsx`
- `pages/LoadingUserPage.tsx`
- `pages/ProfilePage.tsx`, `components/ChangePasswordDialog.tsx`, `schemas/changePassword.schema.ts`, `utils/profile.utils.ts`
- `module.config.tsx` — routes (`/login`, `/select-company`, `/loading-user` public; `/profile` protected). No sidebar nav items.

### Frontend — engine (`src/core/auth`)
- `services/auth.service.ts` — login / refresh / me / change-password / switch-company.
- `services/indexedDb.service.ts` — the session store (`FMS_user`), Safari-safe reconnect.
- `utils/tokenRefresh.util.ts` — `ensureValidToken`, `refreshAccessToken`, expiry checks.
- `store/authSlice.ts` — Redux state + reducers. `store/authSyncMiddleware.ts` — Redux↔IndexedDB sync.
- `hooks/useAuth.ts` — login/logout/init/switch/permission-refresh interval. `hooks/usePermission.ts` — gating helpers.
- `components/AuthInitializer.tsx` — boot-time session restore + intervals. `components/ProtectedRoute.tsx`, `components/Authorized.tsx`. `constants/roles.ts`, `types/auth.types.ts`.

### Frontend — request plumbing & shell
- `core/api/client.ts` — axios interceptors (`Authorization` + `Company-Code`, single-flight refresh, 401→login, global error toasts).
- `config/constants/api.constants.ts` — `API_ENDPOINTS` (`AUTH.*`, `AI.ASSISTANT_CHAT`, …). `config/constants/auth.constants.ts` — timings, `FMS_user` key, `AUTH_ROUTES`.
- `app/layouts/MainLayout.tsx` — hosts `Sidebar` + `AiAssistantWidget`. `app/layouts/components/Sidebar.tsx` — permission-filtered nav.

### Frontend — AI assistant (`src/modules/ai`)
- `components/AiAssistantWidget.tsx` — the docked chat widget + markdown renderer.
- `api/ai.api.ts` + `api/ai.queries.ts` — `askAssistant` / `useAskAssistant`.
- `types/ai.types.ts` — request/response/source types.

### Backend (paired repo — see backend doc)
- `accounts/*`, `company/*`, `sap_client/*`, `ai_assistant/*`, `config/settings.py`, `config/urls.py`.

---

## Related docs
- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/docs/platform_foundation.md`
- `docs/modules/auth.md` — older auth write-up (partially stale; this doc supersedes it).
- `docs/modules/overview.md` — app-wide module map.
- Backend `docs/permissions_and_groups.md` — the permission inventory the nav gates on.
