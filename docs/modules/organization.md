# Organization — Department Ownership Flow

The chart that used to live on a slide: for every function of the factory, who owns it, who
is level-01 support behind them, and who is level-02. Kept as data so it can be corrected the
day an owner changes.

- `/organization` — the chart (needs `org_chart.can_view_org_chart`)
- Editing it needs `org_chart.can_manage_org_chart`; without it the page has no Edit button

Backend: the `org_chart` Django app. One endpoint, `/api/v1/org-chart/chart/` — `GET` reads
the whole chart, `PUT` replaces it.

---

## Shape

Two tables:

| Table | What it is |
|---|---|
| `OrgDepartment` | A block on the chart: Purchasing, Storage, Production… `sort_order` is its position |
| `OrgFunction` | A row inside a block: a sub-department name plus three lists of people |

A row's `name` is the sub-department ("Oil", "Dispatch – Docking"). It is **blank** for a
department that is not sub-divided — Quality Control and Accounts & HR each carry one
blank-named row, and the page renders that as "Whole department".

The people are `owners` / `level_1` / `level_2`, each an ordered JSON list of plain names.
They are deliberately not links to `accounts.User`: the chart names people the way the factory
does ("Shunty Veerji", "Tiwariji") and lists collectives ("Team") that are not user accounts at
all. An empty list is meaningful — "In & Out" has an owner and no support level, and the chart
shows exactly that.

These departments are **not** `accounts.Department`. That master carries user assignments and
cost rates; this chart splits and merges functions for readability. Renaming a block here must
never move a cost rate.

## Editing is one transaction

The page edits the whole chart locally and saves it once. `PUT` is a diff, not a wipe:

- a row that carries an `id` is updated in place — moving or renaming it keeps its identity
- a row without an `id` is created
- anything the payload no longer mentions is deleted

Two consequences worth knowing:

- **Swapping two names in one save works.** The unique constraints are `DEFERRABLE INITIALLY
  DEFERRED`, so the half-applied state mid-transaction is not rejected. On a backend without
  deferrable unique constraints this would fail — the test covering it is skipped there.
- **Last save wins.** Two people editing the chart at once will overwrite each other. If a row
  in the payload has already been deleted by somebody else, the save is refused with "The chart
  changed since this page was opened" rather than silently recreating it.

## Deploying

```bash
python manage.py migrate org_chart
python manage.py seed_org_chart          # first install only; refuses to overwrite edits
python manage.py setup_org_chart_groups  # "Org Chart Viewer" / "Org Chart Manager"
```

Nobody sees the page until they hold `can_view_org_chart` — grant the viewer group widely, the
manager group to whoever maintains the chart.
