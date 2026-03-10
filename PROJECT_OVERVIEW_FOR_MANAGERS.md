# FactoryFlow — Project Overview for Management

**Jivo Wellness Pvt. Ltd.**
**Timeline:** March 10 – April 24, 2026 (7 weeks)

---

## What Is This Software?

FactoryFlow is a **computer system that tracks everything happening in the factory** — from the moment raw materials arrive at the gate until finished goods leave for delivery. Think of it as a **digital register** that replaces paper forms, manual entries, and Excel sheets across all departments.

Every person in the factory (security, QC, warehouse, production, dispatch) will use this on their computer or mobile.

---

## The Full Factory Flow

Here is how material moves through the factory, and how the software tracks each step:

```
📋 PURCHASE — Create purchase orders, track vendors, manage procurement
         ↓
📦 Purchase Order / Plan is created
         ↓
🚪 GATE IN — Vehicle arrives, security logs entry
         ↓
🔍 QUALITY CHECK — QC team inspects raw material
         ↓
📋 GRPO — Approved material enters warehouse (Goods Receipt)
         ↓
🏭 WAREHOUSE — Stock is stored, tracked by category
         ↓
➡️  TRANSFER TO PRODUCTION — Material issued to production floor
         ↓
⚙️  PRODUCTION — Manufacturing happens
    (track: labour, machine time, breakdowns, hourly output, wastage)
         ↓
✅ QUALITY ASSURANCE — Finished product checked + labeled
         ↓
📦 FINISHED GOODS WAREHOUSE — F.G. stored (FIFO/LIFO, barcoded)
         ↓
🧾 DISPATCH — Challan created (count, weight, category)
         ↓
🚪 GATE OUT — Vehicle exits with goods
         ↓
♻️  SCRAP — Waste/scrap tracked and disposed
```

---

## What's Already Working Today

These parts of the software are **built and functional**:

| Step | What It Does | Status |
|------|-------------|--------|
| **Login & Security** | Each person logs in with their own account. Different people see different screens based on their role. | ✅ Ready |
| **Gate In** | Security guard records which vehicle came, who is driving, weighment details, and attaches photos. | ✅ Ready |
| **Quality Check** | QC team creates arrival slips, does inspections, and approves or rejects material. | ✅ Ready |
| **GRPO** | Once QC approves, warehouse team accepts the material into stock. | ✅ Ready |
| **Production Planning** | Plan what to produce — which product, how much, when. Import plans in bulk. | ✅ Ready |
| **Production Execution** | Track production runs — hourly output, machine breakdowns, waste, line clearance, daily reports. | 🔧 Built, being polished |

---

## What's Being Built Next

| Step | What It Will Do | When |
|------|----------------|------|
| **Production Execution (Polish)** | Fix remaining issues, test with real data, make sure everything works smoothly | Week 1 |
| **Purchase Module** | Create purchase orders, manage vendors, track PO status, link PO to gate entry | Week 2 |
| **Warehouse** | See what's in stock, transfer materials to production, track space usage | Weeks 2–3 |
| **Reports** | Plan vs actual production, plan vs purchase, stock reports by category (oil, beverage, etc.) | Week 3 |
| **Quality Assurance (Post-Production)** | Check finished products, pass/fail/hold, add labels | Week 4 |
| **Finished Goods + Barcode** | Track finished products in warehouse, use barcode, FIFO/LIFO system | Weeks 4–5 |
| **Dispatch + Scrap** | Create challans, record count (kandi) and weight, scrap tracking | Week 5–6 |
| **Gate Out + Final Testing** | Gate Out linked to dispatch, end-to-end testing, permissions, launch prep | Week 6–7 |

---

## Week-by-Week Plan (Simple View)

### Week 1 — Mar 10 to 16
**Focus:** Finish polishing Production screens

What you'll see by end of week:
- Production screens working correctly with real factory data
- All production workflows tested (start run → log output → breakdowns → complete)
- Approval flows working (waste approvals, line clearance)

---

### Week 2 — Mar 17 to 23
**Focus:** Purchase Module + Warehouse Start

What you'll see by end of week:
- Purchase order creation screen — create PO with vendor, items, quantities, rates
- PO listing with status tracking (draft, sent, partially received, completed)
- Vendor management — add/edit vendors, view vendor history
- PO linked to Gate In — when vehicle arrives, security can see which PO it's for
- Basic warehouse screen started

---

### Week 3 — Mar 24 to 30
**Focus:** Warehouse + Reports

What you'll see by end of week:
- Warehouse inventory fully visible on screen
- Can transfer material from warehouse to production floor
- Reports showing: How much we planned vs how much we actually produced
- Reports showing: Plan vs Purchase (demand → benchmark → instock → what to buy)
- Reports showing: Stock levels by category (oil, beverage, etc.)

---

### Week 4 — Mar 31 to Apr 6
**Focus:** Quality Check for Finished Products + F.G. Start

What you'll see by end of week:
- After production, QA team can inspect finished goods on screen
- Pass / Fail / Hold decision recorded
- Labels assigned to approved products
- Finished Goods section started with stock tracking

---

### Week 5 — Apr 7 to 13
**Focus:** Finished Goods + Barcodes + Dispatch Start

What you'll see by end of week:
- Finished goods tracked in warehouse with stock counts
- FIFO system (first-in-first-out) for managing which batch ships first
- Barcodes generated for products
- Scan barcode to look up product details
- Dispatch challan creation started

---

### Week 6 — Apr 14 to 20
**Focus:** Dispatch + Scrap + Gate Out

What you'll see by end of week:
- Challans (delivery documents) generated from the system
- Kandi count and weight recorded per dispatch
- Scrap/waste entries tracked and categorized
- Gate Out screen — security verifies dispatch details before vehicle exits
- Gate Out linked to dispatch challan

---

### Week 7 — Apr 21 to 24 (Final 4 days)
**Focus:** End-to-End Testing + Launch Preparation

What you'll see by end of week:
- Full flow tested: Purchase → Gate In → QC → GRPO → Warehouse → Production → QA → F.G. → Dispatch → **Gate Out**
- All reports finalized
- Each person's access/permissions set correctly
- Bug fixes from team testing
- System ready to go live

---

## Reports That Will Be Available

| Report | What It Shows |
|--------|--------------|
| **Plan vs Production** | Did we produce what we planned? Target vs actual numbers |
| **Plan vs Purchase** | Demand (100) → Benchmark (80) → Instock (0) → How much to buy |
| **Purchase Report** | PO status, vendor-wise purchase history, pending deliveries |
| **Warehouse Stock** | What's in the warehouse right now, by category (oil, beverage, etc.) |
| **Space/Area Report** | How much warehouse space is used vs available |
| **Daily Production** | What was produced today, hour by hour, on each line |
| **Wastage Report** | How much material was wasted, where, and why |
| **Labour Report** | How many workers were on each line, each shift |
| **Machine Report** | Machine uptime, breakdowns, maintenance status |
| **Breakdown Summary** | Total breakdown time, causes, frequency |

---

## What Each Department Will Use

| Department | What They'll Do in the System |
|-----------|------------------------------|
| **Purchase Team** | Create purchase orders, manage vendors, track PO delivery status |
| **Security (Gate)** | Log vehicle in/out, check challans, record weighment, verify PO |
| **QC Team** | Inspect incoming materials, inspect finished goods, approve/reject |
| **Warehouse Team** | Manage stock, transfer material to production, receive finished goods, track space |
| **Production Team** | Start production runs, log hourly output, record breakdowns, manage labour |
| **Production Manager** | View reports, plan vs actual, approve waste logs |
| **Dispatch Team** | Create challans, record kandi/weight, manage gate out |
| **Management** | View all reports, dashboards, and summaries |

---

## What We Need From Management

To keep the project on track, we need:

1. **Backend team availability** — The screens need the server/database to be ready. Each week, we need the backend APIs for that week's features.
2. **Purchase process details** — Before Week 2, confirm PO format, vendor fields, approval flow for purchase orders.
3. **QA process sign-off** — Before Week 4, confirm exactly how the post-production quality check should work (what fields, what approval steps).
4. **Barcode requirements** — By Week 4, confirm what barcode format to use, what information goes on the barcode, and if barcode scanners/printers are available.
5. **Challan format** — By Week 5, share the current challan format so we can match it in the system.
6. **User list & roles** — By Week 6, provide a list of all users and what they should be allowed to access.
7. **Testing participation** — In Week 7, department heads should test their respective sections and give feedback.

---

## Quick Numbers

| Metric | Count |
|--------|-------|
| Total screens/pages already built | ~25+ |
| Screens remaining to build | ~20–25 |
| Reports to build | 9–11 |
| Departments using the system | 8 |
| Total timeline | 7 weeks (ending Apr 24 with Gate Out) |