# Figma Make Prompts - Production Execution Module

Use the following prompts in Figma Make to generate the UI designs for each page.

---

## Design System Context

Framework: React + TypeScript, Tailwind CSS, Shadcn/ui (Radix UI primitives).
Style: Clean enterprise SaaS. Neutral gray backgrounds (#F9FAFB), white cards with subtle shadows, rounded-lg corners. Primary color: blue-600. Font: Inter or system sans-serif. Dense data tables with 44px row height. Dark mode support via CSS variables.

**Colors:**
- Primary: blue-600 (#2563EB)
- Success: green-600 (#16A34A)
- Warning: amber-500 (#F59E0B)
- Danger: red-600 (#DC2626)
- Muted text: gray-500 (#6B7280)
- Card bg: white, Page bg: gray-50 (#F9FAFB)
- Card border: gray-200 (#E5E7EB)

**Component patterns:**
- Badges: rounded-full, px-2.5 py-0.5, text-xs font-medium
- Cards: rounded-lg, border, shadow-sm, p-6
- Inputs: h-10, rounded-md, border-gray-300, focus:ring-blue-500
- Buttons: h-10, rounded-md, font-medium
- Progress bars: h-2, rounded-full, bg-gray-200, fill with status color
- Tables: text-sm, header bg-gray-50, rows hover:bg-gray-50

---

## PROMPT 1: Production Execution Dashboard

Design a "Production Execution" dashboard page for a factory management web app. This is the main overview page showing today's production activity across all production lines.

**Layout:**
- Top: Page header with title "Production" on the left, two action buttons on the right: "Line Clearance" (outline button with clipboard-check icon) and "+ Start Production Run" (primary blue button with play icon)
- Below header: A row of 5 summary metric cards:
  - "Today's Production" (e.g., 1,247 Cases) with a package icon, green accent
  - "Active Runs" (e.g., 3) with a activity icon, blue accent
  - "Total Breakdown" (e.g., 45 min) with a alert-triangle icon, red accent
  - "Line Efficiency" (e.g., 82.4%) with a gauge icon, amber accent
  - "Pending Clearances" (e.g., 1) with a clipboard icon, orange accent — only show if > 0

**Alerts Section (below cards, only if alerts exist):**
- Yellow warning banner: "1 line clearance pending for Line-2 — Production Order FG0000028" with "Complete Now" link
- Red alert banner: "2 waste logs awaiting HOD approval" with "Review" link

**Active Runs Section:**
- Section title: "Active Production Runs" with a filter dropdown for Line (All Lines, Line-1, Line-2)
- Cards layout (1 card per active run, 2 columns on desktop):

Each run card:
- Top row: "Run #1" badge (blue) + "Line-1" badge (gray outline) + Status badge "In Progress" (amber)
- Title: "Extra Light — 1L x 12" (bold, large)
- Subtitle: "SAP Order: 5000012345" in muted text
- Progress section: "847 / 1,200 Cases" with progress bar (70.6%, green fill)
- Mini hourly chart: Small bar chart showing last 6 hours of production (tiny bars, light blue)
- Bottom row: "Started 07:00" muted text + "View Details" link button on right

**Show 3 example run cards:**
1. Run #1 | Line-1 | Extra Light 1L x 12 | In Progress | 847/1200 (70.6%)
2. Run #2 | Line-1 | Mustard Kacchi Ghani 5L | In Progress | 320/600 (53.3%)
3. Run #1 | Line-2 | Cold Press Sunflower 1L | In Progress | 145/800 (18.1%)

**Completed Runs Section (collapsible, below active):**
- Section title: "Completed Today" with count badge "2"
- Same card layout but with green "Completed" badge and full progress bar
- Action buttons: "View Report", "View Yield"

**Quick Links Section (bottom):**
- 4 quick action tiles in a row: "Breakdown Entry", "Material Usage", "Machine Checklist", "Reports"
- Each tile: Icon + label, white card, hover:shadow-md

---

## PROMPT 2: Start Production Run Page

Design a form page for starting a new production run in a factory management app.

**Layout:**
- Page header: Back arrow + "Start Production Run" title
- Form inside a white card (max-width 800px, centered)

**Section 1: Production Order**
- Label: "Production Order"
- Searchable dropdown/combobox: placeholder "Search by item code or order number..."
  - Dropdown shows results like: "FG0000011 — Mustard Kacchi Ghani 5 Ltr 4 Pcs" with planned qty "120,000 LTR" as metadata
- Once selected, show an info card:
  - "FG0000011 - Mustard Kacchi Ghani 5 Ltr 4 Pcs" (bold)
  - "Planned: 120,000 LTR | Produced: 85,400 LTR | Remaining: 34,600 LTR" (muted)
  - Progress bar showing 71% complete

**Section 2: Run Details**
- Row 1: Production Line (dropdown: Line-1, Line-2, Line-3) | Run Number (auto-filled "Run 1" — read-only, auto-incremented)
- Row 2: Date (date picker, defaults to today) | SAP Order No. (text input, optional)
- Row 3: Brand (auto-filled from order: "Extra Light") | Pack (auto-filled: "1L x 12")
- Row 4: Rated Speed (number input, units/min, required) | Expected Output (number input, cases, optional)

**Section 3: Manpower**
- Row 1: Worker Count (number input) | Shift (dropdown: Morning, Afternoon, Night)
- Row 2: Supervisor (text input) | Engineer (text input)

**Line Clearance Check (conditional banner):**
- If clearance exists: Green success banner with checkmark: "Line Clearance completed for Line-1 on 07 Mar 2026"
- If clearance missing: Yellow warning banner with alert icon: "No line clearance found for Line-1. Production cannot start without clearance." + "Complete Line Clearance" button

**Footer:**
- "Cancel" outline button on left
- "Start Run" primary blue button on right (disabled if no line clearance)
- Small text: "Production logging will begin after run starts"

---

## PROMPT 3: Hourly Production Entry Page (Daily Production Report)

Design the core production data entry page matching a factory "Daily Production Report" format. This is the most-used page — operators fill this every hour.

**Page Header:**
- Back arrow + breadcrumb: "Production / Run #1"
- Title row: "Extra Light — 1L x 12" (large bold) + "In Progress" badge (amber)
- Subtitle: "Line-1 | 07 March 2026 | SAP Order: 5000012345"

**Run Tabs (if multiple runs):**
- Tab bar: "Run 1" (active, underlined blue), "Run 2", "Run 3"

**Summary Cards Row (4 cards, compact):**
- "Total Production" — 1,111 Cases (bold blue number)
- "Breakdown Time" — 45 min (bold red number)
- "Efficiency" — 82.4% (bold green number)
- "Speed" — 98 cases/hr (bold number)

**Report Info Bar (gray background row):**
- Rated Speed: 120 cases/hr | Total PE Minutes: 600 | Total ME Minutes: 555 | Manpower: 8 workers

**Main Content: Hourly Production Grid**

A table with editable cells, styled like a production report form:

| TIME | PROD (CASES) | MACHINE | RECD MINS | BREAKDOWN DETAIL |
|------|-------------|---------|-----------|-----------------|
| 07:00 - 08:00 | **90** | Running (green dot) | 55 | Sticker changeover |
| 08:00 - 09:00 | **78** | Running (green dot) | 50 | Tappi |
| 09:00 - 10:00 | **125** | Running (green dot) | 60 | — |
| 10:00 - 11:00 | **97** | Running (green dot) | 58 | — |
| 11:00 - 12:00 | **118** | Running (green dot) | 60 | — |
| 12:00 - 13:00 | **149** | Running (green dot) | 60 | Lunch break |
| 13:00 - 14:00 | **138** | Running (green dot) | 60 | — |
| 14:00 - 15:00 | **45** | Breakdown (red dot) | 25 | Power cut |
| 15:00 - 16:00 | **141** | Running (green dot) | 60 | — |
| 16:00 - 17:00 | — | Idle (gray dot) | 0 | Man power |
| 17:00 - 18:00 | **130** | Running (green dot) | 60 | — |
| 18:00 - 19:00 | — | — | — | — |
| **TOTAL** | **1,111** | | **548** | |

**Table behavior:**
- TIME column: Fixed, non-editable, left-aligned, slightly bold, gray-100 background
- PROD (CASES): Number input cells, right-aligned, monospace font, editable. Active cell has blue border
- MACHINE: Small dropdown per row with colored dot indicator:
  - Running = green dot
  - Breakdown = red dot
  - Idle = gray dot
  - Changeover = amber dot
- RECD MINS: Number input, right-aligned
- BREAKDOWN DETAIL: Text input, left-aligned
- TOTAL row: Bold, bg-blue-50, pinned at bottom
- Current hour row: Highlighted with subtle blue-50 left border (thick 3px blue bar)
- Empty future rows: Slightly dimmed, dashed borders

**Machine Status Legend (above or below table):**
- Row of 4 items: Green dot "Running" | Red dot "Breakdown" | Gray dot "Idle" | Amber dot "Changeover"

**Signature Section (below table, within card):**
- 3 signature fields in a row: "Associate" | "Engineer" | "HOD"
- Each: Label + name display or "Pending" in muted text + "Sign" button

**Action Bar (sticky bottom):**
- Left: "Last saved: 14:32" muted text
- Right: "Save Draft" outline button + "Complete Run" green button

---

## PROMPT 4: Yield Report / Material & Machine Report Page

Design a "Yield Report" page for a factory production run, showing material consumption and machine runtime data. This matches the paper yield report format.

**Page Header:**
- Back arrow + breadcrumb: "Production / Run #1 / Yield Report"
- Title: "Yield Report — Extra Light 1L x 12" + date "07 March 2026"
- Subtitle: "Line-1 | Run #1 | SAP Order: 5000012345"

**Section 1: Machine Time**
- Section title: "Machine Time" with clock icon
- Table in a white card:

| MACHINE | TIME (min) |
|---------|-----------|
| Filler | 420 |
| Capper | 415 |
| Conveyor | 430 |
| Labeler | 400 |
| Coding | 425 |
| Shrink Pack | 410 |
| Sticker Labeler (Glass) | 380 |
| Tapping Machine | 420 |
| **TOTAL** | **3,300** |

- Each row: Machine name left-aligned, time right-aligned in monospace
- TIME column is editable (number input cells)
- TOTAL row pinned at bottom, bold, bg-gray-50

**Section 2: Material Consumption (repeats up to 3 times for different batches)**
- Section title: "Material Consumption — Batch 1" with a tab bar: "Batch 1" (active) | "Batch 2" | "Batch 3" or "+ Add Batch"
- Table in a white card:

| MATERIAL | OPENING QTY | ISSUE QTY | CLOSING QTY | WASTAGE QTY |
|----------|------------|-----------|-------------|-------------|
| Bottle (500 gm) | 5,000 | 2,000 | 4,800 | **200** |
| Cap | 5,000 | 2,000 | 4,850 | **150** |
| Front Label | 5,000 | 2,000 | 4,900 | **100** |
| Back Label | 5,000 | 2,000 | 4,880 | **120** |
| Tikki | 5,000 | 2,000 | 4,950 | **50** |
| Shrink | 1,000 | 500 | 900 | **100** |
| Carton | 500 | 200 | 480 | **20** |

- Columns: Material name left-aligned, all quantities right-aligned, monospace
- Opening, Issue, Closing are editable number inputs
- Wastage is auto-calculated: Opening + Issue - Closing (highlighted in bold, red if > threshold)
- Wastage column cells: Red text if wastage > 2% of total, green text if within tolerance

**Section 3: Additional Costs (compact row)**
- 3 inline fields: Manpower (number) | Material Cost (currency) | Utility Cost (currency) | Total (auto-sum, bold)

**Section 4: Signatures**
- 5 signature blocks in a row, each in a small card:
  - "Engineer" — Name + "Signed" green badge or "Sign" blue button
  - "AM" — same pattern
  - "Store" — same pattern
  - "Wastage Approval" — same pattern
  - "HOD" — same pattern
- Signed blocks show: Green checkmark + name + timestamp in muted text
- Unsigned blocks show: Gray dashed border + "Pending" text + "Sign" button

**Action Bar (sticky bottom):**
- Left: "Auto-saved" muted text
- Right: "Save" outline button + "Submit for Approval" primary button + "Print Report" outline button with printer icon

---

## PROMPT 5: Line Clearance Checklist Page

Design a "Pre-Production Line Clearance Checklist" page for a factory management app. This is filled before production begins on a line.

**Page Header:**
- Back arrow + breadcrumb: "Production / Line Clearance"
- Title: "Pre-Production Line Clearance Checklist"
- Subtitle: "JIVO WELLNESS PVT. LTD. — GANAUR"
- Document ID badge: "PRD-OIL-FRM-15-00-00-04" (gray outline badge, monospace)

**Header Fields (2 columns in a card):**
- Row 1: Date (date picker, defaults today) | Line (dropdown: Line-1, Line-2, Line-3)
- Row 2: Production Order (searchable select) | Product (auto-filled from order: "Extra Light 1L x 12")

**Main Content: Checklist Table**

Large white card with the checklist:

| # | CHECKPOINT | YES | NO | N/A | REMARKS |
|---|-----------|:---:|:---:|:---:|---------|
| 1 | Previous product, labels and packaging materials removed | (radio filled green) | (radio) | (radio) | |
| 2 | Machine/equipment cleaned and free from product residues | (radio filled green) | (radio) | (radio) | |
| 3 | Utensils, scoops and accessories cleaned and available | (radio filled green) | (radio) | (radio) | |
| 4 | Packaging area free from previous batch coding material | (radio) | (radio filled red) | (radio) | "Some labels found" |
| 5 | Work area (tables, conveyors, floor) cleaned and sanitized | (radio filled green) | (radio) | (radio) | |
| 6 | Waste bins emptied and cleaned | (radio filled green) | (radio) | (radio) | |
| 7 | Required packaging material verified against BOM | (radio filled green) | (radio) | (radio) | |
| 8 | Coding machine updated with correct product/batch details | (radio filled green) | (radio) | (radio) | |
| 9 | Environmental conditions (temperature/humidity) within limits | (radio) | (radio) | (radio filled gray) | "Humidity sensor OOS" |

**Table styling:**
- # column: narrow (40px), center-aligned, gray text
- CHECKPOINT column: Wide, left-aligned, regular weight text
- YES/NO/N/A: Radio button groups, center-aligned
  - YES selected: Green filled radio with checkmark
  - NO selected: Red filled radio with X
  - N/A: Gray filled radio
- REMARKS: Text input, appears when NO or N/A is selected (expandable)
- Rows with NO: Subtle red-50 background tint
- All items must have a selection before submission

**Summary Bar (below checklist):**
- "8 of 9 items checked YES" progress text
- Visual: 8 green dots + 1 red dot inline

**Authorization Section (below, in a separate card):**
- Title: "Authorization"
- 3 signature blocks in a row:
  - "Production Supervisor" — Text input for name + "Sign" button → shows signed name + timestamp
  - "Production Incharge" — same pattern
  - "QA Officer" — same pattern (this triggers QA approval flow)
- Each block: 120px wide card with label, name field, sign button

**Decision Section (below authorization):**
- Title: "Clearance Decision"
- Two large radio cards side by side:
  - "Cleared for Production" — Green border, green checkmark icon, green text when selected
  - "Not Cleared" — Red border, X icon, red text when selected
- When "Not Cleared": Show a required textarea "Reason for not clearing" with red border

**Footer:**
- "Cancel" outline button
- "Save Draft" outline button
- "Submit" primary blue button (disabled until all checkpoints filled + decision made)

---

## PROMPT 6: Machine Checklist Dashboard (Monthly Calendar View)

Design a machine maintenance checklist page in a calendar/grid format, matching the paper-based monthly checklist format used in factories.

**Page Header:**
- Title: "Machine Maintenance Checklists" with wrench icon
- Filter bar: Machine Type dropdown (Tin Filler, 10-Head Filler, Tapping Machine, etc.) | Line dropdown (Line-1, Line-2) | Month/Year picker (e.g., "March 2026" with arrows)

**Tab Bar:**
- "Daily" (active) | "Weekly" | "Monthly" tabs — each shows different frequency items

**Main Content: Calendar Grid (Daily Tab shown)**

Title: "Tin Filler Machine — Daily Checklist — March 2026"

Horizontal scrollable table:

| TASK | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | ... | 31 |
|------|---|---|---|---|---|---|---|---|-----|-----|
| Clean oil storage tank | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Machine cleaning | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean chain | OK | OK | N | OK | — | — | OK | OK | ... | |
| Clean all sensors | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean all nozzle | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Check oil leakage | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean filler outfeed | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean body frame | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Check abnormal sound | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean solenoid valve | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean all cylinder | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean strip machine | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean all guides | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Calibrate tare weight | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Clean panel | OK | OK | OK | OK | — | — | OK | OK | ... | |
| Check motor voltage | OK | OK | OK | OK | — | — | OK | OK | ... | |
| **Operator** | JS | JS | RK | JS | — | — | JS | RK | ... | |
| **Shift Incharge** | MK | MK | MK | MK | — | — | MK | MK | ... | |

**Cell styling:**
- "OK" cells: Green background (#DCFCE7), green text, small checkmark
- "N" (Not OK) cells: Red background (#FEE2E2), red text, small X
- "—" cells: Gray background (#F3F4F6), represents off day/Sunday
- Empty cells (today/future): White with dashed border, clickable
- Today's column: Highlighted with blue top border (2px)
- Task column: Sticky left, 250px wide, light gray background

**Cell interaction:**
- Click empty cell → opens small popover with: "OK" button (green), "Not OK" button (red), "N/A" button (gray)
- Clicking OK fills cell green immediately
- Operator/Shift Incharge rows: Text input on click (initials)

**Signature Rows (bottom of table):**
- Operator row: Shows operator initials per day
- Shift Incharge row: Shows incharge initials per day

**Weekly Tab (different layout):**
- Same structure but columns are "Week 1", "Week 2", "Week 3", "Week 4" instead of days
- Tasks: Check oil leakage from tank, Check air regulators, Lubrication, etc.

**Monthly Tab:**
- Columns: Just the month name
- Tasks: Check physical damage, Clean filling valve, Check motor voltage, etc.

**Action Bar:**
- "Save All Changes" primary button
- "Print Checklist" outline button with printer icon
- "Manage Templates" link button (for admin to add/edit checklist items)

---

## PROMPT 7: Breakdown Entry & Log Page

Design a "Machine Breakdown Log" page showing all breakdowns for a production run, with the ability to add new breakdowns.

**Page Header:**
- Back arrow + breadcrumb: "Production / Run #1 / Breakdowns"
- Title: "Breakdown Log — Extra Light 1L x 12"
- Subtitle: "Line-1 | 07 March 2026 | Run #1"

**Summary Cards (3 cards, compact):**
- "Total Breakdown" — 45 min (bold red)
- "Line Breakdowns" — 30 min (amber)
- "External Breakdowns" — 15 min (gray)

**Breakdown Timeline (visual, optional):**
- Horizontal timeline bar representing 07:00 - 19:00
- Red blocks showing breakdown periods on the timeline
- Green blocks showing running periods
- Labels on hover: "08:15-08:35 — Sticker changeover (20 min)"

**Breakdown List (main content):**
Table in a white card:

| # | TIME | MACHINE | DURATION | TYPE | REASON | RECOVERED | ACTIONS |
|---|------|---------|----------|------|--------|-----------|---------|
| 1 | 07:15 - 07:35 | Sticker Labeler | 20 min | Line (blue badge) | Sticker changeover | Yes (green) | Edit, Delete |
| 2 | 08:10 - 08:20 | Tapping Machine | 10 min | Line (blue badge) | Tappi issue | Yes (green) | Edit, Delete |
| 3 | 12:00 - 12:30 | All | 30 min | External (gray badge) | Lunch break | No (red) | Edit, Delete |
| 4 | 14:00 - 14:35 | All | 35 min | External (gray badge) | Power cut | No (red) | Edit, Delete |
| 5 | 16:00 - 16:15 | Filler | 15 min | Line (blue badge) | Air pressure issue | Yes (green) | Edit, Delete |

**Type badges:**
- Line: Blue outline badge
- External: Gray outline badge

**Recovered column:**
- Yes: Green text with checkmark
- No: Red text with X

**"+ Add Breakdown" button (top right):**
Opens a modal/dialog:

**Add Breakdown Form:**
- Title: "Record Breakdown"
- Row 1: Machine (dropdown: Filler, Capper, Conveyor, Labeler, Coding, Shrink Pack, Sticker Labeler, Tapping Machine, All) | Type (radio: Line / External)
- Row 2: Start Time (time picker) | End Time (time picker) | Duration auto-calculated: "20 min"
- Row 3: Reason (text input, required) — with autocomplete suggestions from common reasons: "sticker change", "air pressure issue", "power cut", "lunch break", "bottle changeover", "man power"
- Row 4: Recovered? (toggle switch, default Yes) | Remarks (text input, optional)
- Footer: "Cancel" + "Save Breakdown" buttons

**Validation:**
- End time must be after start time
- Time range cannot overlap with existing breakdowns for same machine
- Duration auto-calculates and updates live

---

## PROMPT 8: Waste Management & Approval Page

Design a "Waste Management" page showing waste logs with a multi-level approval workflow for a factory management app.

**Page Header:**
- Title: "Waste Management" with trash-2 icon
- Filter bar: Production Order (searchable select) | Date range picker | Approval Status (All, Pending, Partially Approved, Fully Approved)

**Summary Cards (3 cards):**
- "Total Waste Logs" — 12 (blue)
- "Pending Approval" — 5 (amber with warning icon)
- "Fully Approved" — 7 (green with checkmark)

**Waste Logs Table:**

| PRODUCTION RUN | MATERIAL | WASTAGE QTY | REASON | ENGINEER | AM | STORE | HOD | STATUS |
|---------------|----------|------------|--------|----------|-----|-------|-----|--------|
| Run #1 - Extra Light 1L | Bottle (500gm) | 200 pcs | Dented in transit | Signed (green check) | Signed (green check) | Pending (amber clock) | — | Partially Approved |
| Run #1 - Extra Light 1L | Cap | 150 pcs | Damaged | Signed (green check) | Pending (amber clock) | — | — | Pending |
| Run #1 - Extra Light 1L | Front Label | 100 pcs | Torn during application | Signed (green check) | Signed (green check) | Signed (green check) | Signed (green check) | Fully Approved |
| Run #2 - Mustard 5L | Carton | 20 pcs | Wet/damaged | Pending (amber clock) | — | — | — | Pending |
| Run #2 - Mustard 5L | Shrink | 50 pcs | Machine jam | Signed (green check) | Signed (green check) | Signed (green check) | Pending (amber clock) | Partially Approved |

**Approval column styling:**
- "Signed" = Green checkmark icon + "Signed" text + name on hover tooltip showing "Signed by: Raj K. on 07 Mar 14:30"
- "Pending" = Amber clock icon + "Pending" text + "Approve" button appears for authorized users
- "—" = Gray dash, not yet applicable (previous level not signed)

**Status badges:**
- Pending: Amber/yellow background
- Partially Approved: Blue background
- Fully Approved: Green background

**Row click → Waste Detail Panel (slide-in from right or modal):**
- Material: Bottle (500gm)
- Wastage Qty: 200 pcs
- Production Run: Run #1 — Extra Light 1L x 12
- Date: 07 March 2026
- Reason: "Dented in transit — bottles arrived with dents from supplier"
- **Approval Timeline (vertical):**
  - Step 1: Engineer Sign — "Raj K." — 07 Mar 10:15 — Green checkmark
  - Step 2: AM Sign — "Suresh M." — 07 Mar 11:30 — Green checkmark
  - Step 3: Store Sign — "Pending" — Amber dot — "Approve" blue button + "Reject" red outline button
  - Step 4: HOD Sign — "Not yet" — Gray dot — Locked (grayed out)

**Approve Action (for authorized users):**
- Click "Approve" → Confirmation dialog:
  - "Approve Waste Log?"
  - "Approve wastage of 200 pcs of Bottle (500gm) from Run #1?"
  - Remarks textarea (optional)
  - "Cancel" + "Approve" (green) buttons

**Reject Action:**
- Click "Reject" → Dialog with required "Reason for rejection" textarea
- "Cancel" + "Reject" (red) buttons

**"+ New Waste Log" button (if creating manually outside yield report):**
- Form: Production Run (select) | Material (select) | Qty (number) | Reason (text) | UoM (auto)

---

## PROMPT 9: Reports Dashboard & Daily Production Report

Design a "Reports" section with a reports dashboard and a printable Daily Production Report view.

**Reports Dashboard:**
- Title: "Production Reports" with file-text icon
- 4 report type cards in a 2x2 grid:
  1. "Daily Production Report" — Bar chart icon, "View hourly production, breakdowns, and efficiency for any date" — Blue accent
  2. "Yield Report" — Pie chart icon, "Material consumption, machine runtime, and wastage analysis" — Green accent
  3. "Line Clearance Report" — Clipboard icon, "Pre-production clearance status and compliance" — Amber accent
  4. "Analytics" — Trending-up icon, "OEE, efficiency trends, downtime analysis, production vs plan" — Purple accent

**Analytics Section (below report cards):**
- Date range filter: "Last 7 days" | "Last 30 days" | "Custom" with date range picker
- Line filter: "All Lines" | "Line-1" | "Line-2"

**Analytics Cards (2x2 grid):**

Card 1: "OEE (Overall Equipment Effectiveness)"
- Large number: "78.5%" with trend arrow (up 2.3% from last week)
- Donut chart breakdown: Availability 92%, Performance 88%, Quality 97%
- Colors: Availability=blue, Performance=amber, Quality=green

Card 2: "Line Efficiency"
- Large number: "82.4%"
- Line chart showing daily efficiency for last 7 days
- Goal line at 85% (dashed red)

Card 3: "Material Loss"
- Large number: "1.8%"
- Horizontal bar chart showing loss per material: Bottle 2.1%, Cap 1.5%, Label 0.8%, Shrink 3.2%, Carton 0.5%
- Threshold line at 2% (materials above threshold highlighted red)

Card 4: "Machine Downtime"
- Large number: "4.2 hrs" (total today)
- Stacked bar chart: Breakdown by reason — Power cut (red), Changeover (amber), Maintenance (blue), Other (gray)

Card 5: "Production vs Plan"
- Large number: "92.3% Achievement"
- Grouped bar chart: Planned vs Actual per product (last 5 products)
- Bars: Planned=light blue, Actual=dark blue

---

**Daily Production Report (Print View) — when clicking a specific report:**

Design matches the paper form exactly, formatted for printing (A4 landscape):

**Header:**
- "DAILY PRODUCTION REPORT" (centered, bold, large)
- Company: "JIVO WELLNESS PVT. LTD."

**Info Grid (2 columns):**
| Label | Value |
|-------|-------|
| Date | 07 March 2026 |
| Brand | Extra Light |
| Pack | 1L x 12 |
| Total Production | 1,111 Cases |
| SAP Order No | 5000012345 |
| Total Minutes PE | 600 |
| Total Minutes ME | 555 |
| Rated Speed | 120 cases/hr |
| Total Breakdown Time | 45 min |
| Line Breakdown Time | 30 min |
| External Breakdown Time | 15 min |
| Unrecorded Time | 0 |
| Manpower | 8 |
| Runs | Run 1, Run 2 |

**Hourly Production Table:**
Same table as Prompt 3 but read-only, no edit controls, clean borders

**Signature Row (bottom):**
- Three boxes: "Sign of Associate: ___________" | "Sign of Engineer: ___________" | "HOD Sign: ___________"

**Print button (top right, not shown in print):**
- "Print" button with printer icon
- "Export PDF" button with download icon

---

## PROMPT 10: Manpower Tracking Section

Design a "Manpower" section that appears within the Production Run Detail page, showing worker allocation per shift.

**Section Header:**
- "Manpower" title with users icon
- "+ Add Shift" outline button on right

**Manpower Cards (1 card per shift, horizontal layout):**

Card 1: "Morning Shift" with sun icon (yellow)
- Worker Count: **8** (large number)
- Supervisor: "Rajesh Kumar"
- Engineer: "Suresh Mehta"
- Time: "07:00 - 15:00"

Card 2: "Afternoon Shift" with sun-dim icon (orange)
- Worker Count: **6** (large number)
- Supervisor: "Amit Singh"
- Engineer: "Priya Sharma"
- Time: "15:00 - 23:00"

Card 3: "Night Shift" with moon icon (dark blue) — empty state
- Dashed border card: "+ Add Night Shift" button

**Edit Mode (click card or edit icon):**
- Inline edit: Worker count (number stepper), Supervisor (text), Engineer (text)
- Save/Cancel buttons appear

**Summary (below cards):**
- "Total Workers Today: 14 across 2 shifts"

---

## Component Reference (Consistent across all prompts)

**Status Colors:**
- Draft/Pending: gray-100 bg, gray-700 text
- In Progress: amber-100 bg, amber-700 text
- Completed: green-100 bg, green-700 text
- Approved/Cleared: green-100 bg, green-700 text
- Not Cleared/Rejected: red-100 bg, red-700 text
- Running: green-500 (dot indicator)
- Breakdown: red-500 (dot indicator)
- Idle: gray-400 (dot indicator)
- Changeover: amber-500 (dot indicator)

**Signature Block Pattern:**
- Card with dashed border when unsigned
- Card with solid green border when signed
- Shows: Role label → Name → Timestamp → Status icon

**Editable Table Cell Pattern:**
- Default: Regular text display
- Hover: Subtle gray background
- Active/Editing: Blue border, white background, focused input
- Saved: Brief green flash animation

**Form Layout Pattern:**
- Max-width 800px for single-column forms
- 2-column grid for info displays
- Consistent 24px gap between sections
- Section titles: text-lg font-semibold with optional icon
