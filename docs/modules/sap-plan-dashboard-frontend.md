# SAP Material Plan Dashboard — Frontend Reference

This document describes the **Dashboards › SAP Material Plan** page from the frontend developer's perspective: what every filter does, how each table column works, and how the two views relate to each other.

**Route:** `/dashboards/sap-plan`
**Permission required:** `sap_plan_dashboard.can_view_plan_dashboard`
**Source:** `src/modules/dashboards/sap-plan/`

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [Filter Bar](#2-filter-bar)
3. [Summary Cards](#3-summary-cards)
4. [Tab: SKU Summary](#4-tab-sku-summary)
   - [SKU Summary Table Columns](#41-sku-summary-table-columns)
   - [Sortable Columns](#42-sortable-columns)
   - [Row Expand — BOM Detail Panel](#43-row-expand--bom-detail-panel)
5. [Tab: Procurement](#5-tab-procurement)
   - [Procurement Table Columns](#51-procurement-table-columns)
   - [Sortable Columns](#52-sortable-columns)
6. [Status & Color Reference](#6-status--color-reference)
7. [Error States](#7-error-states)
8. [Data Freshness & Caching](#8-data-freshness--caching)

---

## 1. Page Overview

The SAP Material Plan Dashboard reads **live data from SAP HANA** through a Django API layer. It answers two questions for planners and procurement teams:

- **SKU Summary tab** — Which production orders are at risk? Which specific components are causing the shortfall?
- **Procurement tab** — Across all open orders, what raw materials need to be purchased and in what quantity?

All data on this page is **read-only**. No SAP write-back happens from the frontend.

---

## 2. Filter Bar

Filters appear at the top of the page and apply to **both tabs simultaneously**. All filters are optional — omitting a filter returns all records.

> **Loading indicator:** While a filter change is being fetched, a spinning loader and "Loading…" text appear next to the Reset button. The table below also switches to a skeleton loading state so you know the displayed data is being replaced.

---

### Status

| Value | Behaviour |
|---|---|
| **All Statuses** *(default)* | Returns both `planned` and `released` orders |
| **Planned** | Returns only orders in SAP status `planned` |
| **Released** | Returns only orders in SAP status `released` |

Fires an API call immediately when changed (no debounce — it is a single discrete selection).

---

### Due Date From / Due Date To

Date range filter applied to the production order's due date (`due_date` field from SAP).

- Both fields are optional. You can set only "From", only "To", or both.
- Dates must be entered in `YYYY-MM-DD` format (the browser date picker handles this automatically).
- Fires an API call immediately when the date is changed.
- **Example:** Set "From" = `2026-03-01` and "To" = `2026-03-31` to see only orders due in March 2026.

---

### Warehouse

Free-text filter matched against the production order's output warehouse code (the `warehouse` field).

- Case-sensitive — use the exact code as it appears in SAP (e.g. `WH-01`, `RM-WH`).
- **Debounced 500 ms** — the API call fires 500 ms after you stop typing, not on every keystroke.
- To see all warehouses, leave this field empty.
- Only accepts a single warehouse code. There is no multi-select.

---

### SKU

Free-text filter matched against the SAP item code of the finished good (`sku_code` / `sku` field).

- Use the exact SAP item code (e.g. `FG-001`).
- **Debounced 500 ms** — same behaviour as Warehouse.
- Useful when you want to check a specific product's order status and component availability.

---

### Shortfall Only

Checkbox. When checked, sends `show_shortfall_only=true` to the API.

- **SKU Summary tab:** Removes orders where every component has sufficient stock. Only orders with at least one component in shortfall are shown.
- **Procurement tab:** Removes component rows where `shortfall_qty === 0`. Only components that need purchasing are shown.
- Fires immediately on toggle (no debounce).

---

### Reset Button

Clears all filters back to their defaults (All Statuses, no dates, empty warehouse/SKU, shortfall-only unchecked) and fires an API call with no parameters.

---

## 3. Summary Cards

Two stat cards appear above the SKU Summary table (visible on the SKU Summary tab only).

| Card | Field | Description |
|---|---|---|
| **Total Orders** | `meta.total_orders` | Total number of production orders returned by the current filters |
| **Orders at Risk** | `meta.orders_with_shortfall` | How many of those orders have at least one component with insufficient stock |

These update with every filter change and reflect the current filtered result, not the full SAP dataset.

---

## 4. Tab: SKU Summary

Default active tab. Shows **one row per production order**. Each row represents a SAP production order in `planned` or `released` status.

Default sort: **Due Date ascending** (earliest due first).

### 4.1 SKU Summary Table Columns

| Column | Source Field | Description |
|---|---|---|
| **Order** | `prod_order_num` | User-visible SAP document number, prefixed with `PO-` (e.g. `PO-56`). This is the number shown in SAP Business One, not the internal DocEntry. |
| **SKU** | `sku_code` + `sku_name` | The finished good item code (bold) with the full item name below in muted text. |
| **Planned Qty** | `planned_qty` | Total quantity planned for this production order (in the order's base UOM). |
| **Completed** | `completed_qty` | Quantity already completed / receipted against this order. |
| **Components** | `total_components` + `components_with_shortfall` | Total number of BOM components. If any are in shortfall, shown in red as `8 (3 short)`. If all components have stock, shown in muted grey as `8`. |
| **Due Date** | `due_date` | The production order's due date formatted as `DD Mon YYYY` (e.g. `20 Mar 2026`). Shown as `—` if no due date is set. |
| **Status** | `status` | Colour-coded badge: **Planned** (blue) or **Released** (green). |
| **Warehouse** | `warehouse` | The output warehouse code for this production order (e.g. `WH-01`). |
| *(Expand button)* | — | Chevron button on the far right. Click to expand/collapse the BOM detail panel for this row. Only one row can be expanded at a time. |

---

### 4.2 Sortable Columns

Click a column header to sort. Click again to reverse direction. The active sort column shows an up/down arrow; unsorted columns show a faint double-arrow.

| Column | Sort Key | Notes |
|---|---|---|
| Order | `prod_order_num` | Numeric sort |
| SKU | `sku_code` | Alphabetical |
| Planned Qty | `planned_qty` | Numeric |
| Due Date | `due_date` | Alphabetical on `YYYY-MM-DD` string — sorts chronologically |
| Status | `status` | Alphabetical (`planned` before `released`) |
| Components | `components_with_shortfall` | Numeric — useful for seeing worst orders first |

**Completed** and **Warehouse** are not sortable.

Sorting is performed client-side on the already-fetched data — it does not trigger a new API call.

---

### 4.3 Row Expand — BOM Detail Panel

Clicking the chevron on any row expands an inline **BOM Detail Panel** directly beneath that row. The panel fetches the full component list for that specific production order on demand (`GET /sap/plan-dashboard/sku/<doc_entry>/`).

Only one row can be expanded at a time. Expanding a different row collapses the previous one.

#### BOM Detail Panel Columns

| Column | Source Field | Description |
|---|---|---|
| **Code** | `component_code` | SAP item code of the raw material / packaging component (e.g. `RM-042`). |
| **Component** | `component_name` | Full item name of the component. |
| **Required** | `component_planned_qty` | Total quantity of this component needed for the full planned quantity of the order. |
| **Issued** | `component_issued_qty` | Quantity already issued from the warehouse to this production order. |
| **Remaining** | `component_remaining_qty` | How much still needs to be issued: `Required − Issued`. |
| **Available** | `net_available` | Net available stock: `stock_on_hand − stock_committed + stock_on_order`. This is what SAP considers actually usable. |
| **Shortfall** | `shortfall_qty` | How much is missing: `max(0, Remaining − Available)`. Shown in **red bold** when > 0; shown as `—` when 0. |
| **UOM** | `uom` | Unit of measure (e.g. `KG`, `L`, `PCS`). |
| **Status** | `stock_status` | Colour-coded badge — see [Status & Color Reference](#6-status--color-reference). |

The panel shows a skeleton loader while fetching and an inline "Order not found" message if the order has been closed/cancelled in SAP since the summary was loaded.

---

## 5. Tab: Procurement

Shows **one row per raw material / packaging component**, aggregated across **all open production orders** matching the current filters. Use this tab to understand the total purchasing requirement.

Default sort: **Shortfall descending** (worst shortfall first, matching the API's server-side pre-sort).

### 5.1 Procurement Table Columns

| Column | Source Field | Description |
|---|---|---|
| **Code** | `component_code` | SAP item code of the component. |
| **Component** | `component_name` | Full item name. The default vendor (`default_vendor`) is shown below in muted text if configured in SAP. Blank if no default vendor is set — shown as `—`. |
| **Total Required** | `total_required_qty` | Total quantity needed across all open production orders for this component (sum of remaining quantities). |
| **Available** | `net_available` | Net available stock in SAP: `stock_on_hand − stock_committed + stock_on_order`. |
| **Shortfall** | `shortfall_qty` | `max(0, Total Required − Available)`. Shown in **red bold** when > 0; shown as `—` when 0. |
| **Suggested Purchase** | `suggested_purchase_qty` | Quantity to purchase to cover the shortfall. Equals `shortfall_qty` — the API does not apply a safety buffer server-side. The UOM is shown below the quantity. |
| **UOM** | `uom` | Unit of measure. |
| **Status** | *(computed)* | Colour-coded badge derived from `shortfall_qty` and `net_available`: `sufficient` if no shortfall, `partial` if `net_available > 0` but still short, `stockout` if `net_available ≤ 0`. |
| **Related Orders** | `related_prod_orders` | The production order **numbers** (not DocEntry IDs) that need this component, displayed as `PO-XX` tags. These are informational — clicking them does not navigate anywhere. |

---

### 5.2 Sortable Columns

| Column | Sort Key | Notes |
|---|---|---|
| Code | `component_code` | Alphabetical |
| Component | `component_name` | Alphabetical |
| Total Required | `total_required_qty` | Numeric |
| Shortfall | `shortfall_qty` | Numeric (default sort, descending) |
| Suggested Purchase | `suggested_purchase_qty` | Numeric |

**Available**, **UOM**, **Status**, and **Related Orders** are not sortable.

Sorting is client-side and does not trigger a new API call.

---

## 6. Status & Color Reference

### Production Order Status (SKU Summary)

| Badge | Value | Meaning |
|---|---|---|
| Blue — **Planned** | `planned` | Order exists in SAP but production has not started |
| Green — **Released** | `released` | Order has been released to the shop floor |

### Stock Status (BOM Detail Panel & Procurement)

| Badge | Value | Condition | Action |
|---|---|---|---|
| Green — **Sufficient** | `sufficient` | `net_available ≥ component_remaining_qty` | No action needed |
| Amber — **Partial** | `partial` | `0 < net_available < required` | Partial stock available; top-up purchase needed |
| Red — **Stockout** | `stockout` | `net_available ≤ 0` | No usable stock at all; urgent purchase required |

### Shortfall Cell

- **`—`** (dash, muted) — `shortfall_qty === 0`. Component is covered.
- **Red bold number** — `shortfall_qty > 0`. The number shows exactly how much is missing.

---

## 7. Error States

| HTTP Status | What the UI shows |
|---|---|
| `401` | Automatic redirect to login (handled globally by the API client) |
| `403` | Toast notification "You don't have permission" (handled globally). Page content is not rendered. |
| `404` (BOM panel only) | Inline "Production order not found or no longer active." message inside the expanded row. |
| `502` | Full-width amber banner: "Failed to load data from SAP. The SAP system returned an unexpected response." No retry button. |
| `503` | Full-width amber banner: "SAP is temporarily unavailable." with a **Retry** button that re-fires the query. |

The 502/503 banner replaces the table content for the active tab. Switching tabs clears the banner if the other tab's query is healthy.

---

## 8. Data Freshness & Caching

SAP data is fetched **live from SAP HANA on every API request** — there is no server-side cache. To avoid hammering the SAP system, React Query caches each response for **5 minutes** (`staleTime: 5 * 60 * 1000`).

| Behaviour | When it happens |
|---|---|
| Fresh fetch | First page load, or after 5 minutes of inactivity |
| Background refetch | After 5 minutes when the user revisits the tab |
| Filter-change fetch | Any time a filter value changes (after debounce for text fields) |
| Tab-switch fetch | Procurement tab data is fetched lazily — only when the Procurement tab is first opened |
| Retry on SAP errors | Up to 2 automatic retries on `502`/`503`; no retry on `401`/`403`/`404` |

To force a fresh load at any time, apply or change any filter. A manual "Refresh" button is not currently implemented but can be added by calling `queryClient.invalidateQueries(['sap-plan-dashboard'])`.

---

*Last updated: 2026-03-16 | Frontend module: `src/modules/dashboards/sap-plan/`*
