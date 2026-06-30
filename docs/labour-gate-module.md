# Labour Gate module (casual labour in/out by contractor)

Tracks casual daily labour brought in by **contractors**, an informational split of that labour
across **departments**, and labour going **out** — all by headcount (no per-person identity).

Backend app: `factory_app/labour_gate` · Frontend: `src/modules/gate/pages/labourGatePages/*` and the
top-level **Labour** sidebar module (`src/modules/labour`).

---

## The three screens

| Screen | Where | Purpose |
|---|---|---|
| **Labour In** | Gate dashboard → Gate In → "Labour In" (`/gate/labour-in`) | The gate counts how many labourers each **contractor** brought in. Source of truth. |
| **Labour** (module) | "Labour" sidebar (`/labour`) | An **informational** split of each contractor's labour across **departments**. Must sum to the gate intake. |
| **Labour Out** | Gate dashboard → Gate Out → "Labour Out" (`/gate/labour-out`) | Mark labour **out per contractor** as they leave; department breakdown shown read-only; full out **audit log**. |

```
Gate Labour In            Labour module                 Labour Out
(contractor totals)       (informational dept split)    (contractor-wise out)
┌───────────────┐         ┌────────────────────┐        ┌────────────────────┐
│ Gaurav   = 10 │────┬───▶│ QC      Gaurav  8  │        │ In 10 · Out 0 · In 10
│ SVK      = 5  │    │    │ Packing Gaurav  2  │   info │ ▸ QC      8        │
└───────────────┘    │    │ (must total ≤ 10)  │ ─────▶ │ ▸ Packing 2        │
                     │    └────────────────────┘        │ Out: [Gaurav][3]●  │
                     └─────────── same day, same contractor ───────────────▶ │ Out log (audit)    │
                                                                              └────────────────────┘
```

---

## Data model (`labour_gate/models.py`)

- **`LabourGateEntry`** — one row per `(company, contractor, work_date, department)`:
  - **`department = NULL`** → a **gate Labour In** row (the contractor's intake total). Holds the out-batches.
  - **`department` set** → a **Labour-module** row (that contractor's allocation to one department).
  - `count_in`, soft-delete via `is_active` + `deleted_at`/`deleted_by`, audit via `created_by`/`updated_by`.
  - `remaining = count_in − total_out` (out only ever applies to the gate row).
- **`LabourGateOutBatch`** — one row per group marked out (`count`, `created_at`, `created_by`). The **out audit trail**.

API base `/api/v1/labour-gate/`: `GET /?date=` (day list), `POST /in/` (upsert gate or dept row),
`PATCH/DELETE /{id}/`, `POST /{id}/restore/`, `POST /{id}/out/`, `POST /{id}/out/undo/`.

---

## Rules

- **Labour In row colours**: 🟢 all inside (`out==0`) · 🟡 partially out (`0 < remaining < count_in`) · 🔴 all out (`remaining==0`).
- **Department split ≤ gate intake** (enforced front + backend in `LabourInAPI`): a contractor's
  total active department allocations can't exceed their gate `count_in`. Over-allocating shows a
  pop-up — `entered · used · left` — and is blocked (`HTTP 400` with `{entered, used, left}`).
- **Labour module contractor dropdown** lists only contractors with labour **still inside** (`remaining > 0`).
- **Out is contractor-wise**: the gate physically counts heads leaving by contractor, not by department.
  The department breakdown on Labour Out is read-only.
- **10-minute grace windows** (constant `UNDO_WINDOW_MINUTES`):
  - **Out undo** — the most recent out-batch can be undone for 10 min (`can_undo_last`).
  - **Delete undo (restore)** — a soft-deleted department row can be restored for 10 min (`can_restore`).
- **Soft delete** — deleting never removes the row; it sets `is_active=False` + `deleted_at`/`deleted_by`,
  releases the labour back to "left", and shows it in a Deleted section. Re-adding the same
  `(dept, contractor, day)` reactivates the row in place.

---

## Example

Gaurav brings **10** (Labour In). In the Labour module you split: QC **8**, Packing **2** (totals 10 ✓).
Trying to add Packing **3** instead → pop-up "Gaurav: entered 10 · used 8 · left 2", blocked.
At day end on Labour Out: In 10 · Out 0 · Inside 10; the department breakdown shows QC 8 / Packing 2
(read-only); you mark Gaurav **3** out via the form → Inside 7, and the out log records `+3 · Gaurav · time · user`
with a 10-minute Undo.
