# FactoryFlow — Project Completion Timeline

**Company:** Jivo Wellness Pvt. Ltd.
**Duration:** 7 Weeks — Soft Deadline
**Start Date:** March 10, 2026
**Target Completion:** April 24, 2026 (Gate Out delivered)

---

## Factory Process Flow (from requirements)

```
Purchase (PO creation, vendor management)
     ↓
Plans/Purchase
     ↓
  Gate In
     ↓
Quality Check
     ↓
GRPO (Warehouse Inward)
     ↓
Warehouse Transfer → Production
     ↓
  Production (Labour, Wastage, Daily Production, Reports)
     ↓
Quality Assurance + Labeling
     ↓
F.G. Transfer to Warehouse (FIFO/LIFO, Barcode)
     ↓
Dispatch / Challan (Kandi, Weight)
     ↓
  Gate Out
     ↓
  Scrap Management
```

---

## Current Status (What's Already Built)

| Module | Status | Notes |
|--------|--------|-------|
| Auth | ✅ Done | Login, JWT, multi-tenant |
| Gate In | ✅ Done | Vehicle entry, driver, security, weighment, attachments |
| Quality Check (Incoming) | ✅ Done | QC v2 — arrival slips, inspections, approvals |
| GRPO (Warehouse Inward) | ✅ Done | Goods receipt posting, history |
| Production Planning | ✅ Done | Plans, materials, weekly plans, bulk import |
| Production Execution | 🔧 In Progress | 11 pages built, needs API integration testing, UI polish, and real-data validation |
| Notifications | ✅ Done | Push notifications, device registration |

### Production Execution — What's Left to Polish

The code structure is complete (11 pages, 24 components, 35+ query hooks, 8 schemas), but it needs:

- **API Integration Testing:** Validate all 50+ endpoints against real backend responses
- **UI/UX Polish:** Loading states, error handling edge cases, mobile responsiveness
- **Real Data Validation:** Test with actual production data, fix field mappings
- **Workflow Testing:** End-to-end flows (start run → log production → breakdowns → complete)
- **Approval Flows:** Test multi-role approvals (waste: engineer → AM → store → HOD)
- **Line Clearance:** Test full cycle (draft → submit → QA approve/reject)
- **Reports Accuracy:** Verify calculations (efficiency, OEE, breakdown time)
- **Permission Testing:** Verify role-based access on all pages

Estimated effort: **~1 week** of focused polishing

---

## Remaining Work — Module Breakdown

### 1. Purchase Module (NEW)
- Purchase Order (PO) creation and management
- Vendor master — add, edit, view vendor details and history
- PO status tracking (draft, sent to vendor, partially received, completed, cancelled)
- PO line items with materials, quantities, rates
- PO approval workflow
- Link PO to Gate In (security can verify incoming vehicle against PO)
- Purchase reports — vendor-wise, material-wise, pending deliveries

### 2. Plan vs Production Report
- Plan vs Purchase comparison (demand, benchmark, instock)
- Purchase quantity tracking (demand → benchmark → instock → total)
- Production achievement vs target report
- Visual charts/graphs for plan vs actual

### 3. Warehouse Module
- Warehouse inventory management
- Benchmark-wise stock report (by category: Oil, Beverage, etc.)
- Warehouse transfer to Production (material issue)
- Area/Space clearance tracking (capacity management)
- Stock levels with quantity units

### 4. Quality Assurance (Post-Production)
- QA inspection for finished goods
- Labeling integration
- QA pass/fail/hold workflow
- QA reports

### 5. Finished Goods (F.G.) Management
- F.G. warehouse inward from production
- FIFO / LIFO inventory management (configurable)
- Barcode generation & scanning
- F.G. stock tracking
- Transaction naming & tracking

### 6. Dispatch / Challan
- Dispatch challan generation
- Kandi (count/bundle) tracking
- Weight recording per dispatch
- Dispatch category management
- Gate Out integration (link to existing gate module)

### 7. Barcode System
- Barcode generation (for Sept/General/Inventory)
- Product barcode — In/Out tracking
- F.G. barcode linking
- Distribution barcode — outward tracking
- Barcode scan support (camera/scanner input)

### 8. Gate Out
- Gate Out entry for outgoing vehicles
- Link to dispatch challan — verify what's leaving
- Weighment at gate out
- Security sign-off
- Vehicle exit logging

### 9. Scrap Management
- Scrap entry & categorization
- Scrap disposal tracking
- Scrap reports

### 10. Production Report Enhancements
- Wastage summary reports
- Production entries report
- Machine edition/utilization report
- Labour tracking report

---

## 7-Week Timeline

### Week 1 (Mar 10–16): Production Execution Polish

| Day | Task | Deliverable |
|-----|------|-------------|
| Tue–Wed | API integration testing, fix field mappings against real backend | Working API calls with real data |
| Thu | Workflow testing (runs, approvals, line clearance full cycles) | Verified end-to-end flows |
| Fri | UI polish — error states, loading, mobile responsiveness | Polished UI |
| Sat | Permission testing, reports accuracy verification | Production-ready execution module |

**Milestone:** Production Execution fully polished and tested with real data.

---

### Week 2 (Mar 17–23): Purchase Module + Warehouse Foundation

| Day | Task | Deliverable |
|-----|------|-------------|
| Mon | Purchase module types, schemas, API layer, constants | Foundation files |
| Tue–Wed | PO creation page + PO listing with status tracking | Purchase order CRUD |
| Thu | Vendor management (add/edit/list) + vendor history | Vendor master |
| Fri | PO → Gate In linking (security verifies vehicle against PO) | PO-GateIn integration |
| Sat | Warehouse types, schemas, API layer, constants | Warehouse foundation |

**Milestone:** Purchase module live — can create POs, manage vendors, link to gate entry.

---

### Week 3 (Mar 24–30): Warehouse Module + Reports

| Day | Task | Deliverable |
|-----|------|-------------|
| Mon–Tue | Warehouse Dashboard + inventory management | Inventory overview with stock levels |
| Wed | Warehouse Transfer to Production page | Material issue workflow |
| Thu | Benchmark-wise stock report + Area/Space clearance | Warehouse reports |
| Fri | Plan vs Purchase report | Demand/benchmark/instock comparison |
| Sat | Plan vs Production report | Target vs achievement with charts |

**Milestone:** Warehouse module live. Plan vs Production/Purchase reports available.

---

### Week 4 (Mar 31–Apr 6): Quality Assurance (Post-Production) + F.G. Foundation

| Day | Task | Deliverable |
|-----|------|-------------|
| Mon–Tue | Post-production QA types, schemas, API | QA foundation |
| Wed | QA Inspection page (pass/fail/hold workflow) | QA inspection form |
| Thu | QA + Labeling integration page | Label assignment after QA pass |
| Fri–Sat | F.G. module types, schemas, API + F.G. Dashboard | F.G. foundation + stock page |

**Milestone:** Post-production QA workflow complete, F.G. stock visible.

---

### Week 5 (Apr 7–13): Finished Goods + Barcode System

| Day | Task | Deliverable |
|-----|------|-------------|
| Mon | F.G. FIFO/LIFO inventory management | Batch-wise stock tracking |
| Tue | F.G. Transfer from Production page | Inward to F.G. warehouse |
| Wed–Thu | Barcode generation system (product, FG, distribution) | Barcode generation page |
| Fri | Barcode scan integration (camera/scanner input) | Scan-to-lookup functionality |
| Sat | Dispatch module types, schemas, API, constants | Dispatch foundation |

**Milestone:** F.G. managed with barcode support, FIFO/LIFO inventory. Dispatch scaffolded.

---

### Week 6 (Apr 14–20): Dispatch + Scrap + Gate Out

| Day | Task | Deliverable |
|-----|------|-------------|
| Mon–Tue | Dispatch Challan form + Kandi/weight recording | Challan generation page |
| Wed | Dispatch category management + listing | Dispatch dashboard |
| Thu | Scrap management (entry, categorization, disposal, reports) | Scrap module |
| Fri | Gate Out — entry form, challan linking, weighment, security sign-off | Gate Out page |
| Sat | Gate Out ↔ Dispatch integration, vehicle exit logging | Complete outward flow |

**Milestone:** Dispatch → Gate Out flow complete. Scrap tracked.

---

### Week 7 (Apr 21–24): Integration Testing + Launch Prep (4 days)

| Day | Task | Deliverable |
|-----|------|-------------|
| Tue | End-to-end flow testing (Purchase → Gate In → QC → GRPO → Warehouse → Production → QA → F.G. → Dispatch → Gate Out) | Full flow verified |
| Wed | Bug fixes, UI polish, report enhancements (wastage, labour, machine) | Quality pass |
| Thu | Permission setup for all new modules (Purchase, Warehouse, QA, F.G., Dispatch, Gate Out, Scrap) | RBAC complete |
| Fri | Final build verification, deployment prep | Production-ready build |

**Milestone:** All modules integrated, tested, and deployment-ready. Gate Out delivered by April 24.

---

## Summary Table

| Week | Dates | Focus | Key Deliverables |
|------|-------|-------|-----------------|
| 1 | Mar 10–16 | Production Execution Polish | Fully tested execution module |
| 2 | Mar 17–23 | Purchase + Warehouse Start | PO management, vendors, PO-GateIn link |
| 3 | Mar 24–30 | Warehouse + Reports | Inventory, material transfer, plan vs production |
| 4 | Mar 31–Apr 6 | QA + F.G. Foundation | Post-production QA, F.G. stock tracking |
| 5 | Apr 7–13 | F.G. + Barcode | FIFO/LIFO, barcode gen/scan |
| 6 | Apr 14–20 | Dispatch + Scrap + Gate Out | Challan, scrap, gate out |
| 7 | Apr 21–24 | Integration + Launch | End-to-end testing, permissions, deploy |

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Backend APIs not ready for new modules | Coordinate with backend team weekly; use mock data if needed |
| Purchase module scope grows (approvals, amendments) | Keep Week 2 to core PO CRUD; defer advanced workflows |
| Production Execution polish takes longer than 1 week | Parallelize — start Purchase foundation while fixing last execution bugs |
| Barcode hardware integration delays | Build scan UI with camera fallback first; hardware-specific later |
| FIFO/LIFO logic complexity | Start with FIFO only; add LIFO as configuration toggle |
| Scope creep on reports | Lock report requirements by end of Week 3 |
| QA workflow changes mid-development | Get QA flow sign-off before Week 4 starts |
| Week 7 is only 4 days | Weeks 5–6 should aim to be feature-complete; Week 7 is polish only |

---

## Notes

- Production Execution has all pages/components coded but needs **real-world testing and polishing**
- Purchase module is **new** — needs backend API contracts agreed upon at start of Week 2
- Existing done modules (Gate In, QC, GRPO, Production Planning) won't need major rework
- All new modules follow established patterns: Redux + React Query, Zod schemas, Shadcn UI
- Backend API coordination is critical — API contracts should be agreed upon at start of each week
- **Gate Out on April 24** is the hard target — the flow must work end-to-end by this date