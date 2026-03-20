# Troubleshooting Guide

Common issues and solutions for FactoryFlow local development.

---

## Environment Setup

### App won't start / blank page

**Symptom:** `npm run dev` starts but the page is blank or shows errors in the console.

**Fix:**
1. Ensure `.env` exists and has all required variables (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Verify `VITE_API_BASE_URL` points to a running backend instance
3. Clear Vite cache and restart:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### `VITE_API_BASE_URL` not working

Environment variables must be prefixed with `VITE_` to be exposed to the browser. Double-check spelling in `.env`. Changes to `.env` require a dev server restart (Vite does not hot-reload env vars).

### Node version mismatch

If you see unexpected syntax errors during install, ensure you're using the Node version specified in `package.json` (`engines` field). Use `nvm use` if available.

---

## Authentication & API

### 401 Unauthorized on every request

**Causes:**
1. **Expired access token** — The token auto-refreshes, but if the refresh token is also expired, the user is logged out. Clear localStorage and re-login.
2. **Missing `VITE_API_BASE_URL`** — Requests go to `localhost:3000` by default and fail.
3. **Backend not running** — Ensure the Django backend is accessible at the configured URL.

### 403 Forbidden

The user's account lacks the required Django permission. Permissions use the format `app_label.permission_codename` (e.g., `gatein.view_dashboard`). Check with the backend admin to assign permissions.

### Requests fail with CORS errors

The backend must include the frontend's origin in its `CORS_ALLOWED_ORIGINS`. For local dev, this is typically `http://localhost:5173`. Ask the backend team to add it if missing.

### `Company-Code` header issues

All API requests include a `Company-Code` header from the user's selected company. If you see "company not found" errors:
1. Ensure the user has at least one active company assigned
2. Try switching companies via the profile menu
3. Check that `company_code` matches what the backend expects (case-sensitive)

---

## Build & TypeScript

### TypeScript errors on `npm run build`

The project uses `tsc --noEmit` before Vite build. Common issues:

1. **Missing type imports** — Use `import type { Foo } from './types'` for type-only imports
2. **Strict null checks** — Handle nullable fields: `user?.name` not `user.name`
3. **Unused variables** — Prefix with `_` or remove. TypeScript config enforces `noUnusedLocals`

### Vite build runs out of memory

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Module not found errors

After pulling new changes:
```bash
rm -rf node_modules
npm install
```

Also check for path alias issues — aliases like `@/` are configured in both `tsconfig.json` and `vite.config.ts`. They must match.

---

## React Query & Data Fetching

### Stale data after mutation

Mutations should invalidate related queries in their `onSuccess` callback:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: MODULE_QUERY_KEYS.list() });
}
```

If data still appears stale, check the `staleTime` setting — queries with high `staleTime` won't refetch automatically.

### Too many network requests

React Query deduplicates identical queries within the same render cycle, but if you see excessive requests:
1. Ensure query keys are stable (avoid creating new object references in keys)
2. Check `refetchOnWindowFocus` — set to `false` for data that doesn't change often
3. Ensure `enabled` flag is used to prevent queries from firing before params are ready:
   ```typescript
   useQuery({ queryKey: [...], queryFn: ..., enabled: !!id })
   ```

### Data doesn't update after form submit

1. Verify the mutation's `onSuccess` invalidates the right query keys
2. Check if the form is using `reset()` after submission — old form state may display cached values
3. Look at the Network tab to confirm the mutation response is successful (201/200)

---

## Forms & Validation

### Zod validation errors not showing

1. Ensure the form uses `@hookform/resolvers/zod`:
   ```typescript
   const form = useForm({ resolver: zodResolver(schema) });
   ```
2. Check that field names in the schema match the `name` prop on form inputs exactly
3. Cross-field validation with `.refine()` errors appear at the form level — use `form.formState.errors.root`

### Form not submitting

1. Check the browser console for validation errors
2. Ensure `type="submit"` is set on the submit button (or the button is inside the `<form>`)
3. Look for uncontrolled-to-controlled warnings — these indicate a field isn't registered properly

---

## UI & Styling

### Tailwind classes not applying

1. Ensure the file is included in Tailwind's `content` config (`tailwind.config.js`)
2. Dynamic class names won't work — use full class strings, not template literals:
   ```typescript
   // Bad: `bg-${color}-500`
   // Good: color === 'red' ? 'bg-red-500' : 'bg-blue-500'
   ```
3. Restart the dev server after changes to `tailwind.config.js`

### Dark mode not working

The app uses Tailwind's `class` strategy for dark mode. Ensure the `dark` class is on the `<html>` element. Check `ThemeProvider` is wrapping the app in `src/App.tsx`.

---

## Push Notifications

### FCM notifications not received

1. Browser must support the Push API (Chrome, Edge, Firefox — not Safari on iOS)
2. Notification permission must be granted (check browser settings)
3. `VITE_FIREBASE_*` env vars must all be set
4. Service worker (`sw.js`) must be registered — check Application > Service Workers in DevTools
5. Device token must be registered via `NOTIFICATIONS.DEVICES.REGISTER`

---

## Getting Help

- Check the [API Overview](../api/overview.md) for request/response patterns
- Check the [Architecture Overview](../architecture/overview.md) for system design
- Review git history for recent changes: `git log --oneline -20`
- Ask the backend team for API-specific issues
