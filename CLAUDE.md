# Working in this repo

## One tab, one worktree

Several Claude tabs work this repo at once, and most tasks touch it together with
the `factory_app` backend. A git repo has only **one** working tree, so two tabs
in the same directory overwrite each other's in-flight edits and cannot be on
different branches. Each tab therefore gets its own worktree.

**Do not work directly in `C:\Users\gurpa\dev\FactoryFlow`.** That checkout is the
hub: it stays on `main` and owns the `node_modules` every worktree borrows.

The helper scripts live in the backend repo and drive **both** repos at once:

```powershell
# start  - branches task/<slug> off origin/main in both repos
powershell -File C:\Users\gurpa\dev\factory_app\tools\worktree\new-task.ps1 -Slug <task-slug>

# land   - run from inside the worktree, once per repo
powershell -File C:\Users\gurpa\dev\factory_app\tools\worktree\land-task.ps1

# finish - refuses while work is unlanded or the tree is dirty
powershell -File C:\Users\gurpa\dev\factory_app\tools\worktree\drop-task.ps1 -Slug <task-slug>
```

Worktrees land at `C:\Users\gurpa\dev\wt\<task-slug>\FactoryFlow`. `node_modules`
(589M) is junctioned to the hub, so a worktree costs ~28M. `.env` is copied.

If `land-task` reports a rejected push, another tab landed first — **just run it
again**. Rebase drops anything already upstream by patch-id, so re-running never
duplicates a commit.

## Never cherry-pick onto origin/main in a temp worktree

When a push was rejected, the old habit was to cherry-pick onto `origin/main` in a
scratch worktree and push that sha. The local branch never moves forward, so the
original stays behind as a twin. This repo reached 25-ahead/24-behind, of which
**17 outgoing commits were already upstream under different shas** — and two more
were the same work committed twice with slightly different markup, which is what
turned an otherwise clean rebase into a conflict.

If a push is rejected, rebase and push again. Nothing else.

## Committing

- Commit with an **explicit pathspec**, never `git add -A`.
- Barrel files (`index.ts`) are shared ground. Before committing one, check that
  every `export ... from './x'` it names is a file you actually added — staging a
  barrel has previously committed another tab's unfinished exports and broken the
  build for everyone.

## Changing dependencies

`node_modules` is **shared with every other worktree**, so `npm install` inside a
worktree changes it for all tabs. If a branch needs different dependencies, unlink
the junction and do a real install for that worktree:

```powershell
[System.IO.Directory]::Delete("$PWD\node_modules", $false)   # removes the link only
npm ci
```

Never `Remove-Item -Recurse` a junction — under Windows PowerShell 5.1 it can
descend into the target and delete the hub's real `node_modules`.

## Typechecking

`vite build` does **not** typecheck. `tsc --noEmit` and `src/app/__tests__` both
fail on a clean tree, so filter results to the paths you actually touched.
