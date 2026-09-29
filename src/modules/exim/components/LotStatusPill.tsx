import { IndianRupee } from 'lucide-react';

import { StatusPill } from '@/shared/components/page';
import { cn } from '@/shared/utils';

import type { LotStatus, PaymentStatus } from '../types';
import { LOT_STATUS_LABEL, LOT_STATUS_TONE, PAYMENT_STATUSES } from './lotStatus';

export function LotStatusPill({ status }: { status: LotStatus }) {
  return (
    <StatusPill tone={LOT_STATUS_TONE[status]} dot>
      {LOT_STATUS_LABEL[status]}
    </StatusPill>
  );
}

/** The paid / unpaid mark EXIM showed beside a lot on its way to the factory. */
export function PaymentMark({ status, payment }: { status: LotStatus; payment: PaymentStatus }) {
  if (!PAYMENT_STATUSES.includes(status)) return null;
  const paid = payment === 'PAID';
  return (
    // Labelled rather than carrying an sr-only span: that span is absolutely
    // positioned and, in a scrolling table, widens the whole page.
    <span
      title={paid ? 'Paid' : 'Unpaid'}
      role="img"
      aria-label={paid ? 'Paid' : 'Unpaid'}
      className={cn(
        'inline-flex h-5 w-5 items-center justify-center rounded-full',
        paid
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      )}
    >
      <IndianRupee className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}
