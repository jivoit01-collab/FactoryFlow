// ============================================================================
// Executive Overview (All-in-One "Command Centre") — static config
// ============================================================================
//
// Visual vocabulary (accent palette, KpiStat) now lives in the shared dashboard
// component library; this file re-exports it for local imports and adds the
// module-directory metadata (accents + blurbs keyed by nav path).

import { type Accent, type AccentKey,ACCENTS } from '@/shared/components/dashboard';

export { type Accent, type AccentKey, ACCENTS, formatCount } from '@/shared/components/dashboard';

/** React Query stale time for the live overview KPI sections (60s). */
export const OVERVIEW_STALE_TIME = 60_000;

/**
 * Top-level nav paths that should NOT appear as a module card on the overview
 * (self-reference, generic home, and non-process utilities).
 */
export const MODULE_DIRECTORY_EXCLUDE: readonly string[] = [
  '/',
  '/dashboards',
  '/settings',
  '/notifications',
];

/** Accent key per module, keyed by exact path first, then by path root. */
const MODULE_ACCENT_KEYS: Record<string, AccentKey> = {
  '/dispatch': 'teal',
  '/qc': 'emerald',
  '/production': 'sky',
  '/maintenance': 'orange',
  '/warehouse': 'amber',
  '/warehouse-ops': 'amber',
  '/wms': 'amber',
  '/barcode': 'violet',
  '/marketplace': 'pink',
  '/gate': 'blue',
  '/finance': 'rose',
  '/labour': 'cyan',
  '/admin': 'slate',
  '/vehicle-management': 'indigo',
};

/** One-line blurb per module, keyed by exact top-level path. */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  '/dispatch': 'Docking, dispatch plans, bilty GRPO & transporter invoices',
  '/qc': 'Arrival-slip, production & line-clearance quality inspections',
  '/production': 'Planning, execution runs, OEE, downtime, waste & cost reports',
  '/maintenance': 'Assets, work orders, PM, work permits, spares & fire safety',
  '/warehouse': 'FG receipts, BOM requests, BST & warehouse analytics',
  '/warehouse-ops': 'Receive, pick, outbound, transfer, count & warehouse map',
  '/wms': 'Warehouses, stock, batches, orders, transfers & billing',
  '/barcode': 'Pallet & box lifecycle, dispatch scanning & traceability',
  '/marketplace': 'Marketplace inward, packing, outward, returns & reconciliation',
  '/gate': 'Vehicle arrivals, gate-in variants, gatepass & person entries',
  '/finance': 'Credit notes, debit notes & AP invoice postings',
  '/labour': 'Shift-wise labour counting, verification & gate batches',
  '/admin': 'Docking scan-skip & partial-dispatch approvals',
  '/vehicle-management': 'Vehicles, drivers, transporters & dispatch linking',
};

/** Resolve the accent bundle for a nav path. */
export function accentForPath(path: string): Accent {
  const root = `/${path.split('/')[1] ?? ''}`;
  const key = MODULE_ACCENT_KEYS[path] ?? MODULE_ACCENT_KEYS[root] ?? 'slate';
  return ACCENTS[key];
}

/** Resolve a short description for a nav path, falling back to a generic line. */
export function moduleDescription(path: string, title: string): string {
  const root = `/${path.split('/')[1] ?? ''}`;
  return MODULE_DESCRIPTIONS[path] ?? MODULE_DESCRIPTIONS[root] ?? `Open the ${title} module`;
}
