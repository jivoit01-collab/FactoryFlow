# Module Boundaries

This document defines the dependency rules that keep modules independent and deletable.

## The Rule

**If a module cannot be deleted without breaking another module, the boundaries are wrong.**

Every feature module under `src/modules/` must be self-contained. Deleting any single module should only require removing its entry from the module registry (`src/app/registry/index.ts`) — no other module should fail to compile.

## Layer Hierarchy

Dependencies flow **downward only**. A layer may import from layers below it, never from layers above or at the same level.

```
src/app/              ← Composition root (imports modules to register them)
  │
src/modules/*         ← Feature modules (NEVER import from each other)
  │
src/shared/           ← Shared components, hooks, utils
  │
src/config/           ← Constants, environment, query config
  │
src/core/             ← API client, auth, store, types
```

### What each layer may import

| Layer | May import from | Must NOT import from |
|---|---|---|
| `src/app/` | modules, shared, config, core | — |
| `src/modules/*` | shared, config, core | Other modules |
| `src/shared/` | config, core | modules, app |
| `src/config/` | core (rarely) | modules, shared, app |
| `src/core/` | config (rarely) | modules, shared, app |

## Cross-Cutting Constants

When multiple modules need the same constant (e.g., status enums used across gate, grpo, and qc), the constant belongs in `src/config/constants/`, not inside any module.

**Examples:**
- `FINAL_STATUS` (ACCEPTED, REJECTED, HOLD, PENDING) — used by gate, grpo, and qc → lives in `src/config/constants/status.constants.ts`
- `ARRIVAL_SLIP_STATUS` (DRAFT, SUBMITTED, REJECTED) — used by gate and qc → lives in `src/config/constants/status.constants.ts`
- `ENTRY_STATUS` (DRAFT, IN_PROGRESS, COMPLETED, ...) — used by gate and dashboard → lives in `src/config/constants/status.constants.ts`

**Rule of thumb:** If a constant is referenced by 2+ modules, move it to `src/config/constants/`.

## Cross-Module Cache Invalidation

When one module's action should refresh another module's cached data (e.g., completing a gate entry should refresh the GRPO pending list), use **inline query keys** rather than importing the other module's query key factory.

```typescript
// WRONG — creates a module dependency
import { GRPO_QUERY_KEYS } from '@/modules/grpo/api'
queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.pending() })

// RIGHT — inline the key, no cross-module import
queryClient.invalidateQueries({ queryKey: ['grpo', 'pending'] })
```

This keeps modules decoupled while still allowing cache coordination.

## Module Registration

Modules are registered in the composition root at `src/app/registry/index.ts`. This is the **only** place where modules are imported together:

```typescript
import { gateModuleConfig } from '@/modules/gate/module.config'
import { qcModuleConfig } from '@/modules/qc/module.config'
// ...

const modules: ModuleConfig[] = [gateModuleConfig, qcModuleConfig, ...]
```

Each module exports a `ModuleConfig` from its `module.config.tsx` defining routes, navigation items, and optional Redux reducers. The composition root wires them into the app — modules themselves are unaware of each other.

## Adding a New Module

1. Create `src/modules/{name}/` with the standard structure (see [Module Structure](../modules/overview.md))
2. Create `module.config.tsx` exporting a `ModuleConfig`
3. Register it in `src/app/registry/index.ts`
4. If it needs constants shared with other modules, put them in `src/config/constants/`

## Verifying Boundaries

Run this grep to check for violations:

```bash
grep -r "from '@/modules/" src/modules/ --include="*.ts" --include="*.tsx" | grep -v "module.config"
```

This should return **zero results**. Any match means one module is importing from another.
