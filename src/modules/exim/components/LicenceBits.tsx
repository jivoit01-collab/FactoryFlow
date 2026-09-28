/**
 * The small pieces every licence screen shares: the status pill, and the
 * validity date with its warning.
 */
import { StatusPill } from '@/shared/components/page';
import { formatDay } from '@/shared/utils';

import type { LicenceStatus } from '../types';
import { daysUntil } from '../utils';

export function LicenceStatusPill({ status }: { status: LicenceStatus }) {
  return (
    <StatusPill tone={status === 'OPEN' ? 'progress' : 'neutral'} dot>
      {status === 'OPEN' ? 'Open' : 'Closed'}
    </StatusPill>
  );
}

/** How close a validity date is, for an open licence: gone, or under a month. */
export function ValidityChip({ date, status }: { date: string; status: LicenceStatus }) {
  if (status !== 'OPEN') return null;
  const days = daysUntil(date);
  if (days === null || days > 30) return null;
  if (days < 0) return <StatusPill tone="blocked">Expired</StatusPill>;
  return <StatusPill tone="warn">{days === 0 ? 'Today' : `${days}d left`}</StatusPill>;
}

export function ValidityCell({ date, status }: { date: string; status: LicenceStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {formatDay(date)}
      <ValidityChip date={date} status={status} />
    </span>
  );
}
