import type { StatusTone } from '@/shared/components/page';

import type { BomStatus, ChangeRequestList, RequestFilters } from '../api/bom-changes.api';

export const STATUS_TONE: Record<BomStatus, StatusTone> = {
  PENDING: 'info',
  L1_APPROVED: 'progress',
  L2_APPROVED: 'progress',
  L3_APPROVED: 'progress',
  SAP_PUSHED: 'done',
  REJECTED: 'blocked',
  CANCELLED: 'neutral',
};

const IN_APPROVAL: BomStatus[] = ['L1_APPROVED', 'L2_APPROVED', 'L3_APPROVED'];
const OPEN: BomStatus[] = ['PENDING', ...IN_APPROVAL];

export interface RequestTab {
  id: string;
  label: string;
  filters: RequestFilters;
  /** Statuses whose counts add up to the tab's badge; empty = use `count`. */
  statuses: BomStatus[];
  /** Shown only to someone who signs a level. */
  approversOnly?: boolean;
}

/** The list's tabs, in the portal approvals page's order: my turn first. */
export const REQUEST_TABS: readonly RequestTab[] = [
  {
    id: 'my-turn',
    label: 'My turn',
    filters: { actionable: true },
    statuses: [],
    approversOnly: true,
  },
  { id: 'open', label: 'Open', filters: { status: OPEN.join(',') }, statuses: OPEN },
  { id: 'pending', label: 'Pending', filters: { status: 'PENDING' }, statuses: ['PENDING'] },
  {
    id: 'in-approval',
    label: 'In approval',
    filters: { status: IN_APPROVAL.join(',') },
    statuses: IN_APPROVAL,
  },
  { id: 'pushed', label: 'In SAP', filters: { status: 'SAP_PUSHED' }, statuses: ['SAP_PUSHED'] },
  { id: 'rejected', label: 'Rejected', filters: { status: 'REJECTED' }, statuses: ['REJECTED'] },
  {
    id: 'cancelled',
    label: 'Cancelled',
    filters: { status: 'CANCELLED' },
    statuses: ['CANCELLED'],
  },
  { id: 'mine', label: 'Raised by me', filters: { mine: true }, statuses: [] },
  { id: 'all', label: 'All', filters: {}, statuses: [] },
];

/** The number on a tab, from the list's `counts` (null when the counts cannot say). */
export function tabCount(
  tab: RequestTab,
  counts: ChangeRequestList['counts'] | undefined,
): number | null {
  if (!counts) return null;
  if (tab.id === 'my-turn') return counts.ACTIONABLE ?? 0;
  if (tab.id === 'all') {
    return Object.entries(counts)
      .filter(([key]) => key !== 'ACTIONABLE')
      .reduce((sum, [, value]) => sum + (value ?? 0), 0);
  }
  if (tab.statuses.length === 0) return null;
  return tab.statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
}
