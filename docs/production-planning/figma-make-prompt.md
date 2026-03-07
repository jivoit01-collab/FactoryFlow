# Figma Make Prompt - Production Planning Module

Use the following prompts in Figma Make to generate the UI designs.

---

## Design System Context

Framework: React + TypeScript, Tailwind CSS, Shadcn/ui (Radix UI primitives).
Style: Clean enterprise SaaS. Neutral gray backgrounds (#F9FAFB), white cards with subtle shadows, rounded-lg corners. Primary color: blue-600. Font: Inter or system sans-serif. Dense data tables with 44px row height. Dark mode support via CSS variables.

---

## PROMPT 1: Planning Dashboard Page

Design a "Production Planning" dashboard page for a factory management web app.

**Layout:**
- Top: Page header with title "Production Planning" on the left, a "+ Create Plan" primary blue button on the right
- Below header: A row of 4 summary metric cards:
  - "Total Plans" (e.g., 12) with a clipboard icon
  - "Planned Qty" (e.g., 2,604,700 LTR) with a target icon
  - "Produced Qty" (e.g., 1,850,200 LTR) with a check-circle icon
  - "Overall Progress" (e.g., 71%) with a circular progress indicator
- Below cards: A small row of status breakdown badges showing count per status: "Draft: 2", "Open: 1", "In Progress: 5", "Completed: 4" - each with a colored dot (gray, blue, amber, green)
- If any SAP Failed plans exist, show a red warning badge: "1 SAP Failed" with alert icon

**Filter bar:**
- Month/Year picker on the left (e.g., "March 2026" with left/right arrows)
- Status filter dropdown on the right (All, Draft, Open, In Progress, Completed, Closed, Cancelled)

**Main table — list of production plans (each row = one finished good item):**

| Column | Example Data |
|--------|-------------|
| Item Code | FG0000011 (monospace) |
| Item Name | Mustard Kacchi Ghani 5 Ltr 4 Pcs |
| UoM | LTR |
| Warehouse | WH-MAIN |
| Planned Qty | 120,000 |
| Produced Qty | 85,400 |
| Progress | 71% (inline progress bar, green fill) |
| Status | "In Progress" badge (amber) |
| SAP | "Posted" badge (green) with Doc# 10042 |
| Dates | 01 Mar - 31 Mar 2026 |
| Actions | Eye icon (view), Pencil icon (edit, only on Draft rows) |

Show 6-8 rows with mixed statuses:
- Row 1: FG0000011, Mustard Kacchi Ghani 5L, In Progress, Posted, 71%
- Row 2: FG0000053, Cold Press Sunflower 5L, In Progress, Posted, 45%
- Row 3: FG0000028, Pomace Olive 1L 16 Pcs, Open, Posted, 0%
- Row 4: FG0000004, Cold Press Canola 5L, Draft, Not Posted, 0%
- Row 5: FG0000150, Sano Pomace Olive 1L, Completed, Posted, 100%
- Row 6: FG0000194, Soyabean Oil 1L Pouch, In Progress, Failed (red badge), 32%

**Status badge colors:**
- Draft: gray bg, gray text
- Open: blue bg, blue text
- In Progress: amber/yellow bg, amber text
- Completed: green bg, green text
- Closed: slate bg, slate text
- Cancelled: red bg, red text

**SAP badge colors:**
- Not Posted: gray outline badge
- Posted: green solid badge with "Doc# {number}"
- Failed: red solid badge with warning icon

**Empty state:** Illustration + "No production plans for March 2026. Create your first plan." + CTA button

---

## PROMPT 2: Create Plan Page

Design a form page for creating a new production plan. Single-page form (not a wizard).

**Layout:**
- Page header: "Create Production Plan" with back arrow to dashboard
- Form inside a white card (max-width 720px, centered)

**Form sections:**

**Section 1: Product Selection**
- Label: "Finished Good"
- Searchable dropdown/combobox: placeholder "Search by item code or name..."
  - Dropdown shows results like: "FG0000011 — Mustard Kacchi Ghani 5 Ltr 4 Pcs" with "LTR" and "Finished Goods" as small metadata
- Once selected, show the item in a small info card below the dropdown:
  - "FG0000011 - Mustard Kacchi Ghani 5 Ltr 4 Pcs" (bold)
  - "UoM: LTR | Group: Finished Goods" (muted text)
  - X button to clear selection

**Section 2: Planning Details**
- Row 1: Planned Qty (number input, required) | UoM (auto-filled from item, selectable dropdown)
- Row 2: Start Date (date picker) | Due Date (date picker, must be >= start date)
- Row 3: Warehouse (dropdown) | Branch (optional, dropdown or hidden)
- Row 4: Remarks (textarea, optional, 2 rows)

**Section 3: Bill of Materials (collapsible, starts open)**
- Title: "Raw Materials" with item count badge (e.g., "2 items")
- "+ Add Material" outline button
- Table of materials:
  - Columns: Component (searchable select), Required Qty, UoM, Warehouse, Remove (X button)
  - Show 2 example rows:
    - RM-SEEDS-01, Sunflower Seeds Grade A, 55000, KG, WH-MAIN
    - RM-FILTER-01, Filter Paper, 5000, PCS, WH-MAIN
  - Empty row at bottom for quick add

**Footer:**
- "Cancel" outline button on left
- "Create Plan" primary blue button on right
- Small text: "Plan will be created as Draft. Post to SAP when ready."

**Validation states:**
- Show a red border + error text below fields on validation error
- "Due date must be on or after start date" shown below due date picker
- "This field is required" below empty required fields

---

## PROMPT 3: Plan Detail Page — Header & Overview

Design the top section of a plan detail page showing plan info and action buttons.

**Page header:**
- Back arrow + breadcrumb: "Production Planning / FG0000011"
- Title: "Mustard Kacchi Ghani 5 Ltr 4 Pcs" (large, bold)
- Two badges next to title: "In Progress" (amber) + "Posted to SAP · Doc# 10042" (green)

**Info grid (2 columns, inside a card):**
| Label | Value |
|-------|-------|
| Item Code | FG0000011 |
| UoM | LTR |
| Warehouse | WH-MAIN |
| Start Date | 01 March 2026 |
| Due Date | 31 March 2026 |
| Remarks | March production batch |

**Progress section (inside same card, below info grid):**
- Large numbers: "85,400 / 120,000 LTR produced"
- Full-width progress bar (71% filled, green gradient)
- "71% complete" text below bar

**Action buttons row (right-aligned):**
- "Post to SAP" button (blue outline) — shown only for Draft/Open plans with NOT_POSTED/FAILED status
- "Close Plan" button (red outline) — shown for non-closed plans
- Three-dot menu with: Edit Plan (Draft only), Delete Plan (Draft only)

**SAP Error Banner (show only when sap_posting_status is FAILED):**
- Red background banner below header
- Warning icon + "SAP Posting Failed: Item FG0000011 not found in SAP."
- "Retry" button on the right

**Phase 2 placeholder:**
- Small chip/tag below the title area: "Version history coming soon" with sparkle icon, muted text

---

## PROMPT 4: Plan Detail Page — Weekly Plans Section

Design the weekly plans section that appears below the plan header on the detail page.

**Section header:**
- "Weekly Plans" title on left
- "+ Add Week" outline button on right (only when plan is OPEN or IN_PROGRESS)
- Remaining capacity text: "Remaining: 7,100 / 120,000 LTR unallocated"

**Weekly plan cards (show 4 weeks as cards in a 2x2 grid or vertical list):**

Each card contains:
- Top: "Week 1" (bold) + date range "01 - 07 Mar 2026" + status badge
- Middle: Progress bar with "12,500 / 12,500 LTR" (100% = green)
- Bottom: "8 daily entries" link text

**Example cards:**
1. Week 1 | 01-07 Mar | Completed (green badge) | 12,500/12,500 (100%) | green bar
2. Week 2 | 08-14 Mar | In Progress (amber badge) | 8,200/12,500 (65.6%) | amber bar
3. Week 3 | 15-21 Mar | Pending (gray badge) | 0/12,500 (0%) | empty bar
4. Week 4 | 22-31 Mar | Pending (gray badge) | 0/12,500 (0%) | empty bar

**Card actions (three-dot menu per card):**
- Edit Target Qty
- Delete Week (disabled if has entries, with tooltip "Cannot delete — has daily entries")

**"Add Week" form (shown as a modal/dialog):**
- Title: "Add Weekly Plan"
- Fields:
  - Week Number: auto-filled "3" (next available)
  - Week Label: "Week 3" (editable text)
  - Start Date: date picker (within plan range)
  - End Date: date picker (>= start, within plan range)
  - Target Qty: number input with helper text "Available: 7,100 LTR remaining"
- "Cancel" and "Add Week" buttons

---

## PROMPT 5: Plan Detail Page — Daily Production Entries

Design the daily entries section that shows when a weekly plan card is expanded/clicked.

**Layout:** Expandable section within or below a weekly plan card.

**Section header:**
- "Week 2 — Daily Entries" with date range "08-14 Mar 2026"
- Weekly progress: "8,200 / 12,500 LTR (65.6%)"
- "+ Add Entry" button on right

**Daily entries table:**
| Date | Shift | Produced Qty | Remarks | Recorded By | Actions |
|------|-------|-------------|---------|-------------|---------|
| 08 Mar 2026 | Morning | 2,100 | Normal run | John D. | Edit icon |
| 08 Mar 2026 | Afternoon | 1,900 | - | John D. | Edit icon |
| 09 Mar 2026 | Morning | 2,200 | - | Raj K. | Edit icon |
| 09 Mar 2026 | Afternoon | 2,000 | Line 2 delay 30min | Raj K. | Edit icon |

**Shift badges:**
- Morning: light yellow badge with sun icon
- Afternoon: light orange badge with sun-dim icon
- Night: dark blue badge with moon icon
- No shift: no badge shown

**Running total row at bottom:**
- "Total: 8,200 LTR" in bold

**"Add Entry" form (inline or modal):**
- Title: "Record Daily Production"
- Fields:
  - Production Date: date picker (within week range, not future, today highlighted)
  - Produced Qty: number input (required, > 0)
  - Shift: select dropdown (Morning / Afternoon / Night / None) — optional
  - Remarks: text input (optional)
- "Cancel" and "Save Entry" buttons
- After save: show updated progress immediately using response data

**Validation error states:**
- "Entry already exists for 09 Mar (Morning shift)" — red text below date/shift fields
- "Production date cannot be in the future" — red text below date

**Empty state (no entries yet):**
- "No entries recorded for this week yet." + "Add your first entry" button

---

## PROMPT 6: Edit Plan Form (Draft Only)

Design a form for editing a draft production plan. Same layout as Create Plan (Prompt 2) but pre-filled with existing data.

**Differences from Create:**
- Page title: "Edit Plan — FG0000011" with "Draft" badge
- All fields pre-filled with current values
- Item selection shows the current item (editable — can change item in Draft)
- Materials section shows existing materials (can add/remove)
- Footer buttons: "Cancel" + "Save Changes" (primary)
- No "Create Plan" button
- Additional "Delete Plan" red outline button in header area with confirmation dialog

**Delete confirmation dialog:**
- "Delete Production Plan?"
- "This will permanently delete the draft plan for 'Mustard Kacchi Ghani 5 Ltr 4 Pcs'. This action cannot be undone."
- "Cancel" + "Delete" (red) buttons

---

## Component Reference

For Figma Make to maintain consistency, use these across all prompts:

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
