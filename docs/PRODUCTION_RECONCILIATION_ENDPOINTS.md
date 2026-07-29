# Production & Wastage Reconciliation — Backend Endpoints (App vs SAP)

> **Status:** Backend implemented in `factory_app` (read-only). **Needs testing against live SAP HANA** before wiring the frontend. Frontend not yet built (per "backend first").

Built following the existing `ProductionMovementReader` / APIView pattern. Both endpoints are read-only, company-scoped (via `Company-Code` header → SAP schema), and gated by `IsAuthenticated + HasCompanyContext + CanViewReports` (`production_execution.can_view_reports`).

Files added/changed in `factory_app`:
- `production_execution/services/reconciliation_reader.py` — SAP HANA reader (OINM) for a warehouse.
- `production_execution/services/reconciliation_service.py` — app-vs-SAP compare + per-day rows.
- `production_execution/views.py` — `ProductionReconciliationAPI`, `WastageReconciliationAPI`.
- `production_execution/urls.py` — two new routes.

---

## 1. Production reconciliation

`GET /api/v1/production-execution/reports/reconciliation/production/`

Query params: `date_from` (YYYY-MM-DD), `date_to`, `warehouse` (optional, default **`BH-PF`**).

- **App side** = `ProductionRun.total_production` summed by `date` for the company.
- **SAP side** = SAP `OINM` inward movements (`InQty`, `TransType` in 59 Goods Receipt / 202 Production Order) into the warehouse, by `DocDate` and by item.

```jsonc
{
  "by_date": [
    { "date": "2026-07-15", "app_qty": 152, "sap_qty": 150,
      "difference": 2, "difference_pct": 1.32, "status": "MISMATCH" }
  ],
  "sap_by_item": [
    { "item_code": "FG001", "item_name": "Jivo Mustard Oil 1L", "sap_qty": 90 }
  ],
  "summary": {
    "app_qty": 152, "sap_qty": 150, "difference": 2,
    "difference_pct": 1.32, "status": "MISMATCH"
  },
  "meta": {
    "date_from": "2026-07-15", "date_to": "2026-07-15", "warehouse": "BH-PF",
    "app_unit": "cases", "sap_unit": "inventory UOM",
    "note": "App qty is in cases; SAP qty is in the item inventory UOM. App↔SAP is reconciled by date/total (runs carry no SAP item code)."
  }
}
```

`status` ∈ `MATCHED` (within 1%) · `MISMATCH` · `PENDING_SYNC` (app > 0, SAP = 0).

## 2. Wastage reconciliation

`GET /api/v1/production-execution/reports/reconciliation/wastage/`

Query params: `date_from`, `date_to`, `warehouse` (optional, default **`BH-WST`**).

- **App side** = `WasteLog.wastage_qty` summed by run date for the company.
- **SAP side** = SAP `OINM` outward movements (`OutQty`, `TransType` = 60 Goods Issue) into the wastage warehouse.

Same response shape as production (`by_date`, `sap_by_item`, `summary`, `meta`).

---

## Data caveats (must know before trusting the numbers)

1. **UOM mismatch (production):** app output is in **cases**; SAP `InQty` into BH-PF is in the item's **inventory UOM** (eaches/bottles). If they differ, per-day diffs are expected — align UOM (or convert with a pack size) before treating a diff as a real mismatch.
2. **Item-level app↔SAP not joined:** `ProductionRun` has no SAP item code, so app↔SAP is reconciled **by date and in total**. SAP per-item detail is returned (`sap_by_item`) for drill-down; a true per-SKU compare needs an item-code link on runs (via `sap_doc_entry`→OWOR.ItemCode, or a SKU master).
3. **Wastage is not posted to SAP yet:** the app never issues scrap to SAP, so SAP wastage will usually be **0** (`PENDING_SYNC`) until scrap goods-issues are posted to BH-WST. The endpoint still shows the app side and will light up once SAP scrap postings exist.
4. **Warehouse codes** `BH-PF` / `BH-WST` are **not configured in Django** — they're passed as defaults and overridable via `?warehouse=`. If a company uses different codes, pass them explicitly or add per-company config.
5. **Untested against live SAP:** the SQL follows the proven `ProductionMovementReader` pattern but hasn't run against your HANA — verify column/warehouse names and TransType coverage on first run.

---

## Next steps

1. **Test** the two endpoints against a company with SAP configured (Oil / Beverages / Mart) for a date with known production; confirm `sap_by_item` and `by_date` populate and UOM behaviour.
2. Decide the **UOM/pack-size** approach so production diffs are meaningful (ties into the per-bottle work — units per case).
3. Then **wire the frontend**: evolve `/dashboards/production` into the 3 sections (Production / Wastage / Cost), adding reconciliation tables + status chips (green/yellow/red) fed by these endpoints, and the running-lines summary from today's `IN_PROGRESS` runs.
