# Maintenance Module

## What it is (in simple words)

This module helps keep the factory's machines running. You keep a list of all machines, raise a job
when something breaks, plan regular servicing so things don't break, and manage the spare parts used
for repairs.

Frontend: `src/modules/maintenance` · Backend: `factory_app/maintenance` (API base `/api/v1/maintenance/`).

---

## The screens (sidebar → Maintenance)

| Screen | What you do there |
|---|---|
| **Dashboard** | Quick overview — open jobs, machines down, alerts. |
| **Assets** | The list of machines/equipment. Open one to see its history, photos and papers. |
| **Work Orders** | Repair/service jobs. Raise, assign, and track them till done. |
| **Store / Spares** | Spare parts and their stock. Request, issue, and return parts. |
| **PM / Checklist** | Planned servicing on a schedule, with a checklist to tick off. |
| **Reports** | Numbers and summaries. |
| **Automation** | Alerts (like low stock, overdue servicing). |
| **Masters** | Setup lists — categories, locations, departments, settings. |
| **Gate Material In / Repair Movement** | Links to the Gate module for parts coming in / going out. |

---

## The main things (plain meaning)

**Asset** = one machine or piece of equipment. It has a code, a category, a location, and a
department. Its status can be: Running, Idle, Breakdown, Under PM, Under Repair, or Retired. An asset
can also hold photos and papers (Manual, Warranty, AMC, Service Report, Calibration).

**Work Order** = a job to fix or service something.
- Kinds: Complaint, Breakdown, General, Preventive, Inspection, Calibration, AMC/Vendor, Project.
- Priority: Normal, High, Critical. Impact: No impact, Reduced performance, Production stoppage, Safety risk.
- Its life goes: **Draft → Open → Assigned → In Progress → Completed → Approved → Closed.**
  (It can also sit at Waiting Spare, Waiting Vendor, or On Hold in between.)

**PM (Preventive Maintenance)** = planned servicing so machines don't break.
- You make a plan with how often it repeats: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly.
- Each plan has a **checklist** (items are Checkbox, Pass/Fail, Number, or Text).
- On each due date the system creates a **PM job** to do. That job is Pending → In Progress →
  Completed (or Skipped / Overdue).

**Spares (Store)** = spare parts with a stock count.
- Flow: **Receipt from gate → Request (for a work order) → Issue → Consume or Return.** Stock goes up
  and down with each step, and you get a warning when stock is low.

**Masters** = the setup lists everything else uses: Asset Category, Asset Location, Asset Department,
Spare Category, plus general settings.

---

## How a real repair goes (example)

1. A pump breaks. You raise a **Work Order** (Breakdown, Critical) on that pump.
2. You **assign** it to a technician.
3. The technician needs a part → raise a **Spare Request** → the store **issues** the part.
4. The technician fixes the pump and **consumes** the part (or returns what's left).
5. Mark the job **Completed** → a supervisor **Approves** it → **Closed**.

Separately, that pump also has a **Monthly PM** plan. On its due date a PM job appears with a checklist
to tick off, so it gets serviced before it breaks again.

---

## For developers (quick note)

- Backend models (`maintenance/models.py`): `Asset`, `MaintenanceWorkOrder`, `PreventiveMaintenancePlan`
  + `PreventiveMaintenanceExecution` + checklist, `MaintenanceSpare` + `SpareRequest` + `SpareMovement`,
  the master lists, asset photos/documents, gate links, and vendor visits.
- API (`/api/v1/maintenance/`): `dashboard/`, `reports/`, `spares/stock/`, `alerts/`, `options/`,
  `scan/lookup/`, plus REST endpoints for each entity.
- Status/type names live in `maintenance/constants.py`; access is controlled by
  `MAINTENANCE_PERMISSIONS`.
