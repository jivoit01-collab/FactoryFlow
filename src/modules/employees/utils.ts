/**
 * Formatting and tree helpers shared by every screen in the module.
 *
 * Money is the interesting part. Salary figures here are annual and Indian, so
 * they are grouped Indian-style (₹7,20,000, not ₹720,000) and abbreviated in
 * lakh and crore where space is short — because "₹7.2L" is what somebody
 * actually says, and a KPI tile that reads "₹72,00,000" makes people count
 * digits. The full figure is always available on the detail screens; the
 * abbreviation is only ever used where the exact rupee does not change a
 * decision.
 *
 * Everything takes the API's strings (DRF sends decimals as strings, to avoid
 * the float rounding that would quietly change somebody's pay) and is
 * defensive about nulls, because `null` from this API means "not yours to see".
 */
import type { OrgTreeNode, SalaryRevisionSummary } from './types';

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function toNumber(amount: string | number | null | undefined): number | null {
  if (amount === null || amount === undefined || amount === '') return null;
  const value = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(value) ? value : null;
}

/** The full figure, grouped: `₹7,20,000`. Returns `—` for nothing. */
export function money(
  amount: string | number | null | undefined,
  currency: string | null = 'INR',
): string {
  const value = toNumber(amount);
  if (value === null) return '—';
  if (!currency || currency === 'INR') return `₹${INR.format(value)}`;
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
}

/**
 * The short figure, for tiles and chart axes: `₹7.2L`, `₹1.24Cr`.
 *
 * Lakh and crore rather than K and M, because that is how the numbers are said
 * in the office this runs in.
 */
export function moneyShort(
  amount: string | number | null | undefined,
  currency: string | null = 'INR',
): string {
  const value = toNumber(amount);
  if (value === null) return '—';
  if (currency && currency !== 'INR') return money(value, currency);
  const absolute = Math.abs(value);
  if (absolute >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (absolute >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (absolute >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${INR.format(value)}`;
}

/** `+₹1,20,000 · 20%`, or `—` when there is nothing to compare against. */
export function changeLabel(revision: SalaryRevisionSummary | null | undefined): string {
  if (!revision || revision.change_amount === null) return '—';
  const change = toNumber(revision.change_amount);
  if (change === null) return '—';
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const percent =
    revision.change_percent === null || revision.change_percent === undefined
      ? null
      : `${Math.abs(revision.change_percent).toFixed(1)}%`;
  const amount = money(Math.abs(change));
  return percent ? `${sign}${amount} · ${percent}` : `${sign}${amount}`;
}

/** `01 Apr 2026`. The one date format used across the module. */
export function dateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** `Apr 2026` — for a timeline heading, where the day is noise. */
export function monthLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** `3 days ago`, `5 months ago` — relative, for audit and timeline rows. */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2629800, 'month'],
    [31557600, 'year'],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let chosen: [number, Intl.RelativeTimeFormatUnit] = units[0];
  for (const unit of units) {
    if (seconds >= unit[0]) chosen = unit;
  }
  return formatter.format(-Math.round(seconds / chosen[0]), chosen[1]);
}

/** Years and months since a date: `5y 4m`, for tenure. */
export function tenure(joiningDate: string | null | undefined): string {
  if (!joiningDate) return '—';
  const start = new Date(joiningDate);
  if (Number.isNaN(start.getTime())) return '—';
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return 'starts soon';
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return `${remainder}m`;
  if (remainder === 0) return `${years}y`;
  return `${years}y ${remainder}m`;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Every node in the forest, depth-first. */
export function flattenTree(nodes: OrgTreeNode[]): OrgTreeNode[] {
  const out: OrgTreeNode[] = [];
  const walk = (list: OrgTreeNode[]) => {
    list.forEach((node) => {
      out.push(node);
      walk(node.children);
    });
  };
  walk(nodes);
  return out;
}

/** Whether a node matches what somebody typed into the chart's search box. */
export function nodeMatches(node: OrgTreeNode, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return (
    node.full_name.toLowerCase().includes(needle) ||
    node.employee_code.toLowerCase().includes(needle) ||
    (node.job_title ?? '').toLowerCase().includes(needle) ||
    (node.designation_name ?? '').toLowerCase().includes(needle) ||
    (node.department_name ?? '').toLowerCase().includes(needle)
  );
}

/**
 * The ids that have to be open for every match to be on screen.
 *
 * A search that finds somebody eight levels down is useless if the branches
 * above them are collapsed, so the chart expands the ancestors of every match
 * — and only those, leaving the rest of a four-thousand-person tree shut.
 */
export function idsToRevealMatches(nodes: OrgTreeNode[], query: string): Set<number> {
  const reveal = new Set<number>();
  if (!query.trim()) return reveal;

  const walk = (node: OrgTreeNode, ancestors: number[]): boolean => {
    const selfMatches = nodeMatches(node, query);
    let childMatches = false;
    node.children.forEach((child) => {
      if (walk(child, [...ancestors, node.id])) childMatches = true;
    });
    if (selfMatches || childMatches) {
      ancestors.forEach((id) => reveal.add(id));
      if (childMatches) reveal.add(node.id);
      return true;
    }
    return false;
  };

  nodes.forEach((root) => walk(root, []));
  return reveal;
}

/**
 * Ids of the branches to open for `depth` levels of expansion.
 *
 * `depth` counts *branches opened*, not cards shown: opening one level shows
 * the roots' children, so `depth` levels of branches puts `depth + 1` levels of
 * people on screen. The "expand to L3" control means the third level of people
 * is visible.
 */
export function idsToDepth(nodes: OrgTreeNode[], depth: number): Set<number> {
  const open = new Set<number>();
  const walk = (list: OrgTreeNode[], level: number) => {
    list.forEach((node) => {
      if (level < depth) {
        open.add(node.id);
        walk(node.children, level + 1);
      }
    });
  };
  walk(nodes, 0);
  return open;
}

/** How many levels the forest runs to. */
export function treeDepth(nodes: OrgTreeNode[]): number {
  let deepest = 0;
  const walk = (list: OrgTreeNode[], level: number) => {
    list.forEach((node) => {
      deepest = Math.max(deepest, level);
      walk(node.children, level + 1);
    });
  };
  walk(nodes, 1);
  return deepest;
}
