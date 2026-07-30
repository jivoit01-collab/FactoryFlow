# Activity Center

Shows every user the work that is actually waiting on them right now, and lets a
supervisor see who is on top of their jobs and who is behind.

- **Frontend module:** `src/modules/activities`
- **Backend app:** `activity_center` (separate repo, `c:/Users/dev02/factory_app`)
- **API prefix:** `/api/v1/activity-center/`
- **Sidebar:** *Activities* → My Activities · Team Activity · Job Catalogue

---

## What makes this different from a checklist

Nothing in this module is entered, ticked or maintained by hand. Every item is
**derived live** from the module that owns the record:

- A job is **pending** because a real record is sitting in a status that needs an
  action — a permit in `SUBMITTED`, an indent in `PENDING_APPROVAL`, a BST in
  `AWAITING_GATE_OUT`.
- A job is **complete** because that record carries the user in its actor field with
  a timestamp — `approved_by`/`approved_at`, `received_by`/`received_at`, and so on.

Consequences worth knowing:

1. Counts can never drift from reality, because there is no second copy of the data.
2. Nobody can mark their own work done without actually doing it in the owning module.
3. The module is **read-only**. It has no models, no writes, and no migrations beyond
   a permission carrier.

---

## Owned vs shared queue

Pending work is attributed two ways, and the difference matters for how the numbers
should be read.

| Mode | Meaning | Example |
|---|---|---|
| `OWNED` | The record names this user. Nobody else will do it. | A work order whose `assigned_to` is you; a draft indent you created |
| `QUEUE` | The record names nobody yet — it waits for whoever holds the permission. | An indent in `PENDING_APPROVAL`, visible to every approver |

The UI keeps these apart on purpose. A shared queue of 30 seen by five approvers is
**not** thirty jobs each — showing one combined total would make every approver look
permanently behind. On Team Activity, only the **Assigned** column measures a person;
**Shared queue** is greyed and must never be summed down the column.

One deliberate asymmetry: an `OWNED` item is always returned to its owner even if
their permissions changed since — a draft you created is still yours to submit.
`QUEUE` items disappear the moment you lose the permission, because a shared queue is
nobody's property.

---

## Screens

| Route | Permission | Purpose |
|---|---|---|
| `/activities` | `can_view_my_activities` | My Activities — pending grouped by module, completed for the chosen window, and a per-module breakdown |
| `/activities/team` | `can_view_all_activities` | Team Activity — one row per active user, sortable by most overdue / most assigned / most completed |
| `/activities/users/:userId` | `can_view_my_activities` (self) or `can_view_all_activities` | One person's full pending and completed lists |
| `/activities/catalogue` | `can_view_all_activities` | Job Catalogue — every tracked job and the permission that assigns it |

Each pending row deep-links into the record in its owning module wherever that module
has a detail route; rows for modules without one render as non-clickable.

---

## Permissions

Defined on the backend `activity_center` app (`ActivityCenter` — an unmanaged model
that exists only to carry them).

| Permission | Scope |
|---|---|
| `activity_center.can_view_my_activities` | **Self-scoped.** The API always reads the authenticated user; the user id is never taken from the request, so this can only ever show you your own work. Safe to grant broadly. |
| `activity_center.can_view_all_activities` | Exposes every user's pending and completed work. Supervisors only. |
| `activity_center.can_view_activity_reports` | Reserved for activity reporting. |

Two helper groups are created by the seeding command below: **Activity Center**
(self-view, safe for everyone) and **Activity Supervisor** (populate by hand).

### Granting work-wise access

Responsibility for a job comes from the permission the job already uses — the Activity
Center adds no per-job permissions of its own. To make something a person's job, open
**Job Catalogue**, find the job, read off the permission, and grant it in Admin. Because
the catalogue is generated from the same registry that produces everyone's pending
list, it cannot disagree with what users see.

---

## Adding or changing a tracked job

Everything lives in one file: `activity_center/registry.py`. Add an `ActivitySource`
row and it appears in the API, both screens, the badge and the catalogue — no view or
serializer changes.

```python
ActivitySource(
    key="mi_approve",                                    # stable, URL-safe
    label="Approve the material indent",                 # user's words
    module="Maintenance - Indents",                      # UI grouping
    permission="maintenance.can_approve_material_indent",# who is responsible
    model="maintenance.MaterialIndent",
    pending_filter={"status": "PENDING_APPROVAL"},       # what "still to do" means
    actor_field="approved_by",                           # who did it
    actor_date_field="approved_at",                      # when
    reference_field="indent_no",                         # shown in the list
    age_field="reviewed_at",                             # age / overdue measured from
    url_template="/maintenance/material-indents",
)
```

`RegistryIntegrityTests` in `activity_center/tests.py` validates every row against the
real models — unknown model, missing field, bad lookup, or a status value that is not
in the model's choices all fail the suite. That test is the guard against a rename
elsewhere silently dropping a job from everyone's list.

---

## Performance

Query cost is bounded by the size of the registry, not the number of users:

- Per-user endpoints: one query per source the user is responsible for.
- Team overview: a fixed two queries per source, plus one to map permission holders.

Measured on live data: ~1.5–2.3 s for a single user's summary, ~2.7 s for the 88-user
overview. Results are capped at `PER_SOURCE_LIMIT` (50) records per source so an
administrator holding every permission cannot pull the whole database into one
response. If the overview gets slower as data grows, cache it per company — it is a
pure function of the records and the clock.

---

## Setup

```bash
# 1. Register the permissions (adds a content type + 3 permission rows; creates no table)
python manage.py migrate activity_center

# 2. See what access seeding would do — writes nothing
python manage.py seed_activity_permissions

# 3. Apply it, and enrol every active user in the self-scoped group
python manage.py seed_activity_permissions --apply --enrol-all-users
```

Then add the supervisors to the **Activity Supervisor** group by hand, since that
group exposes everyone's work.
