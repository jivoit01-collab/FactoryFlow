import { COMPANY_CODES } from '@/config/constants';
import {
  DASHBOARDS_PERMISSIONS,
  VEHICLE_MANAGEMENT_PERMISSIONS,
  WMS_ACCESS,
} from '@/config/permissions';

// ============================================================================
// Section permissions
// ============================================================================

/**
 * Each card is gated on its own right, so the wall degrades one card at a time
 * rather than going blank: a dispatch planner sees the dispatch and freight
 * cards, a warehouse operator sees the BH-BT card.
 *
 * Every right here already exists on the live database. Nothing on this board
 * introduces a new permission row, following the precedent set for the Packing
 * Material board — a new right would need creating on the live DB and granting
 * to groups before anybody could open the screen, and this board is a read-only
 * roll-up of numbers those groups can already see individually.
 */
export const LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
  DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
];

export const LOGISTICS_CONTROL_DISPATCH_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
];

export const LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS: readonly string[] = [
  VEHICLE_MANAGEMENT_PERMISSIONS.VIEW_DISPATCH_LINKING,
  DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
];

export const LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
];

export const LOGISTICS_CONTROL_SPACE_PERMISSIONS: readonly string[] = WMS_ACCESS;

/** Route/nav gate — holding any one card's right opens the board. */
export const LOGISTICS_CONTROL_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    ...LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS,
    ...LOGISTICS_CONTROL_DISPATCH_PERMISSIONS,
    ...LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS,
    ...LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS,
    ...LOGISTICS_CONTROL_SPACE_PERMISSIONS,
  ]),
];

// ============================================================================
// Scope — which warehouse, which companies
// ============================================================================

/**
 * The warehouse the board reports on.
 *
 * `BH-BT` (Bhakharpur New Basement) is the finished-goods floor dispatch runs
 * out of. It exists in exactly one company's chart of warehouses, hence the
 * pinned company below — read through any other schema the card comes back
 * empty rather than wrong, which is harder to notice on a wall.
 */
export const LOGISTICS_CONTROL_WAREHOUSE = 'BH-BT';

/** The company whose SAP schema holds `BH-BT`. */
export const LOGISTICS_CONTROL_WAREHOUSE_COMPANY: string = COMPANY_CODES.JIVO_OIL;

/**
 * The companies whose dispatch is ADDED together on this board.
 *
 * The card reads "Dispatch ( OIL | Mart )" and the pipe is not a comparison —
 * it is one combined figure. Which makes three things mandatory rather than
 * nice to have, and all three are silent when wrong:
 *
 *   1. Intercompany bills must come out. In August 2026, 66% of Oil's invoiced
 *      finished-goods pieces went to group companies; add both schemas raw and
 *      the board reports internal transfers as dispatch. The backend's
 *      `exclude_jivo_mart_transfer` strips Oil→Mart only, so the card filters on
 *      the full intercompany customer list instead.
 *   2. Counts must be de-duplicated, not summed. A docking is per company, so
 *      one truck carrying both companies' bills is two dockings under one
 *      vehicle arrival — see `dedupeVehicles` in `../utils`.
 *   3. Quantities must share a unit before they are added. Both schemas serve
 *      kilograms for dispatch weight, which is why this board totals kg and
 *      converts once at the edge.
 */
export const LOGISTICS_CONTROL_DISPATCH_COMPANIES: readonly string[] = [
  COMPANY_CODES.JIVO_OIL,
  COMPANY_CODES.JIVO_MART,
];

// ============================================================================
// Non-moving age bands
// ============================================================================

/**
 * Where non-moving starts, in days since the item last moved.
 *
 * Stock idle for less than this is not counted as non-moving at all — it is
 * simply stock. The mockup asked for "90-40 days old", written high-to-low;
 * read as the 40-90 band.
 *
 * Note 40 matches nothing else in the codebase: the Warehouse Control board
 * opens at 45, the Non-Moving dashboard's colour bands break at 45 and 30, and
 * its dropdown offers 0/15/30/45/90/180/365 without a 40. This board therefore
 * owns its own bands rather than moving three shared constants and changing
 * what every other screen shows.
 */
export const LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS = 40;

/** Where the second, open-ended band starts. */
export const LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS = 90;

/**
 * SAP item group the non-moving read is scoped to — `102`, finished goods.
 *
 * Passed to the endpoint, which puts it in its own SQL, so the board never
 * receives the rows it does not want. `0` would mean every group, which pulled
 * in the packaging lines described above and took the figure from 14 T to 243 T
 * on the strength of one bad case weight.
 */
export const LOGISTICS_CONTROL_NON_MOVING_ITEM_GROUP = 102;

// ============================================================================
// Dispatch target
// ============================================================================

/**
 * The month's dispatch target, in tonnes.
 *
 * A constant by decision: changing it is a code edit and a deploy. If that
 * becomes tiresome, `factory_expense.MonthlyBudget` is the house pattern for a
 * hand-entered monthly figure — per company, per month, with the useful
 * convention that a month with no row shows no variance rather than comparing
 * against zero.
 *
 * Set to 0 to hide the target and its variance entirely; the tile says the
 * target is unset rather than reporting 0 t and a −100% miss.
 */
export const LOGISTICS_CONTROL_MONTHLY_TARGET_TONNES = 0;

// ============================================================================
// Freight bill funnel — GRPO → AP → Payment
// ============================================================================

/**
 * The age bands on the freight funnel, in days.
 *
 * Each entry is the floor of an EXCLUSIVE window running up to the next one, so
 * these render as rows "0–14", "15–29", "30–44" and "45+". Every document lands
 * in exactly one row and the rows sum to the column total.
 *
 * All three feeds bucket on these same edges server-side, so a band here has a
 * bucket answering it — see `transporter_account_reader.AGE_BANDS`, which the
 * GRPO summary shares. Changing this list without changing that one leaves rows
 * that can only ever read zero, because no bucket lands in them.
 *
 * The 0 row is the fresh work in hand. It was left off at first on the argument
 * that a wall should show what is overdue rather than what is merely open, but
 * the three aged rows alone gave no sense of scale: nine invoices at 15+ days
 * reads very differently against forty fresh ones than against none.
 */
export const LOGISTICS_CONTROL_FUNNEL_AGE_BANDS: readonly number[] = [0, 15, 30, 45];

/**
 * The clock each funnel stage is aged from.
 *
 * Per stage, not total bill age: each column answers "how long has this waited
 * on THIS desk". A bilty dispatched sixty days ago whose GRPO was posted
 * yesterday reads as one day old in the AP column, because one day is how long
 * AP has had it. Total elapsed age is a different question and this board does
 * not answer it.
 */
export const LOGISTICS_CONTROL_FUNNEL_STAGES = ['GRPO', 'AP', 'PAYMENT'] as const;

// ============================================================================
// Stock in transit
// ============================================================================

/**
 * Transit age band edges, in days.
 *
 * Renders as "3 days", "4 - 7 days" and "> 7 days", so the first band is
 * everything up to and including 3, the second 4 to 7 inclusive, the third
 * strictly over 7. Note the backend's own reconciliation finding treats 7 as
 * inclusive on the wrong side; these edges are applied here so the three bands
 * are exhaustive and do not overlap.
 */
export const LOGISTICS_CONTROL_TRANSIT_FRESH_DAYS = 3;
export const LOGISTICS_CONTROL_TRANSIT_AGEING_DAYS = 7;

// ============================================================================
// Freight cost
// ============================================================================

/**
 * Loading cost per litre, in rupees — the figure written on the board's design.
 *
 * A constant because nothing in either repo holds a loading rate: there is no
 * loading/freight rate in Cost Master's code list, no rate field on
 * `Transporter`, and no match for a loading charge anywhere in the backend. So
 * this is the rate, and it lives here where it can be read and changed rather
 * than being buried in a component.
 *
 * The bilty half of Cost/Litre is real and comes from SAP; this is added to it.
 */
export const LOGISTICS_CONTROL_LOADING_COST_PER_LITRE = 0.8;

// ============================================================================
// Workforce attribution
// ============================================================================

/**
 * Which people count against which card.
 *
 * A hand-kept list by decision, because the attribution does not exist in the
 * data: "Warehouse", "Despatch" and "Transportation" appear only as free-text
 * names in the org chart's seed constants, and the two department masters this
 * system runs on — `accounts.Department` (labour, cost rates, attendance) and
 * `employee_hierarchy.Department` (employees, salary) — are disjoint, with the
 * sections in neither. Note the org chart spells it *Despatch* while every
 * route spells it *Dispatch*, so an exact-name match on the wrong spelling
 * returns nothing at all.
 *
 * Names are matched case-insensitively against the labour department labels the
 * factory-expense board reports. Leave a list empty and that card's strip says
 * it is unassigned rather than showing a zero that looks like an answer.
 */
export const LOGISTICS_CONTROL_SECTION_DEPARTMENTS: Record<
  'warehouse' | 'dispatch' | 'transport',
  readonly string[]
> = {
  // BH-BT is the basement floor, so its labour is the gate's "Warehouse
  // Basement" department. Note the neighbouring names — "Warehouse Beverage"
  // and "Warehouse Gupta" are different floors and must not be folded in.
  warehouse: ['Warehouse Basement'],
  dispatch: [],
  transport: [],
};

/**
 * Which employee-directory departments count against which card.
 *
 * A separate list from the labour one above, because they are separate masters:
 * `accounts.Department` names the gate's labour intake, `employee_hierarchy
 * .Department` names the payroll, and the two are disjoint — the same section
 * can be spelled differently in each, or exist in only one.
 *
 * Every plausible spelling is listed rather than one canonical name. The org
 * chart says *Despatch* where every route says *Dispatch*, and transport is
 * variously *Transport*, *Transportation* and *Logistics*; matching is
 * case-insensitive on the department's name or code, so a list that names both
 * spellings costs nothing and a list that names one silently returns nobody.
 *
 * A section that matches no department falls back to the head count typed on
 * the settings screen — which is the only source this board had before, and
 * still the right answer where the directory has no such department at all.
 */
export const LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS: Record<
  'warehouse' | 'dispatch' | 'transport',
  readonly string[]
> = {
  warehouse: ['Warehouse', 'Warehouse Basement', 'Store', 'WH'],
  dispatch: ['Dispatch', 'Despatch', 'Sales Dispatch', 'Docking', 'DISP'],
  transport: ['Transport', 'Transportation', 'Logistics', 'Fleet', 'TRANS'],
};

/**
 * Days used to spread an annual salary onto one day.
 *
 * Employee salary is stored annual; labour cost is already a per-day rate. The
 * board shows both per day, so the annual figure is divided by this. 365 rather
 * than a working-day count, deliberately: the result is a rate of burn, not a
 * payslip, and no holiday calendar exists to make a working-day figure honest.
 */
export const LOGISTICS_CONTROL_SALARY_DAYS_PER_YEAR = 365;

// ============================================================================
// Refresh
// ============================================================================

/**
 * How often the wall re-reads, in milliseconds.
 *
 * Sixty seconds matches the Production Control board, which is the only other
 * screen that polls unattended. It is a ceiling rather than a target: three of
 * this board's feeds reach into SAP on every call — the open-bilty AP set fans
 * the whole backlog into one HANA query, the transfer reconciliation was built
 * as a scheduled drift report, and the bilty-GRPO queue takes a bill-header
 * snapshot per row — so those are polled on the slow interval below instead.
 */
export const LOGISTICS_CONTROL_REFRESH_MS = 60_000;

/**
 * Interval for the feeds that read SAP per row.
 *
 * Five minutes. These answer questions measured in days — how many freight
 * bills are older than a fortnight — so a fresher number buys nothing and costs
 * a HANA round-trip whose size grows with the backlog.
 */
export const LOGISTICS_CONTROL_SLOW_REFRESH_MS = 5 * 60_000;

/** React Query staleness. A wall wants fresh, not cached. */
export const LOGISTICS_CONTROL_STALE_TIME = 20_000;

/**
 * Safety ceiling on rows pulled into a client-side roll-up.
 *
 * The pending-bill feed's own ceiling is 2000 and it slices *after* ordering by
 * dispatch date descending, which drops the oldest and most overdue bills first
 * — precisely the ones a control board exists to show. When a feed reports more
 * than this the card says so rather than quietly totalling a truncated set.
 */
export const LOGISTICS_CONTROL_MAX_ROLLUP_ROWS = 2000;

// ============================================================================
// Panel hues
// ============================================================================

/**
 * Which hue each panel owns, from the shared control palette.
 *
 * Deliberately the same vocabulary as the Warehouse Control and Production
 * Control boards — `ACCENTS` in
 * `warehouse-control/constants/warehouse-control.theme` — rather than a palette
 * of this board's own. Three control boards that look like three different
 * products teach the reader three layouts; sharing the hues means "indigo is
 * space, amber is ageing" is learned once and holds everywhere.
 *
 * Hues are matched to what the section is ABOUT, not to the order the panels
 * appear in: indigo already means pallet space on the warehouse board, sky
 * already means bills, and amber already means something has been sitting too
 * long. Reusing those associations is the whole point.
 */
export const LOGISTICS_PANEL_ACCENT = {
  warehouse: 'indigo',
  dispatch: 'sky',
  freight: 'amber',
  workforce: 'emerald',
} as const;

/**
 * SAP item groups the board counts — finished goods only.
 *
 * `102` is `FINISHED`. Applied as a SQL filter on the occupancy query rather
 * than trimmed client-side, so the tonnage, the row counts and the disclosure
 * counters all describe the same set.
 *
 * Deliberately not 105 `PACKAGING MATERIAL`: BH-BT holds 10 packaging lines
 * worth an apparent 229 T, nearly all of it one shrink-film SKU whose
 * `U_Gross_Weight` is 32.5 kg for a single piece of film. Packing material is
 * not stock on hand, and that one row would be 43% of the figure.
 *
 * 107 `TRADING ITEMS` and 115 `SEMI FINISHED GOODS` are the plant's other
 * finished-ish groups and hold nothing in BH-BT today, so naming them would
 * change no number — add them here if that changes.
 */
export const LOGISTICS_CONTROL_STOCK_ITEM_GROUPS: readonly number[] = [102];

// ============================================================================
// Freight account — what SAP says is owed to the hauliers
// ============================================================================

/**
 * How far back the freight-payments figure looks, in days.
 *
 * A month, because that is the rhythm freight is actually settled on: a weekly
 * window on these books swings between nothing and a large clearing run, which
 * on a wall reads as the plant having stopped paying its hauliers rather than
 * as a payment cycle.
 */
export const LOGISTICS_CONTROL_FREIGHT_PAYMENT_DAYS = 30;

/**
 * How often the freight account is re-read, in milliseconds.
 *
 * Deliberately much slower than the dispatch feeds. An A/P invoice is posted
 * and a payment is released a few times a day, not a few times a minute, and
 * each poll costs the shared SAP box three HANA aggregates per company. Fast
 * enough that a payment released this morning is on the wall before lunch.
 */
export const LOGISTICS_CONTROL_FREIGHT_REFRESH_MS = 5 * 60 * 1000;

/**
 * How far back Cost per litre looks, in days.
 *
 * NOT month-to-date, which is what this tile tried first and what made it blank
 * every September until somebody caught up on paperwork. Freight is typed onto
 * a bilty days to weeks after the truck leaves, so on the 12th of a month the
 * current month has tonnes dispatched and almost nothing priced — and a rate
 * divided over the little that was priced is a worse answer than no rate,
 * because it is the rate of whichever few consignments got typed first.
 *
 * Sixty days is long enough to be mostly settled and short enough to still be
 * this season's rate. The tile prints the window it used, because a figure
 * whose period is assumed is a figure somebody will eventually compare against
 * a month and find wrong.
 */
export const LOGISTICS_CONTROL_COST_LITRE_WINDOW_DAYS = 60;
