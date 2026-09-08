import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Droplets,
  IndianRupee,
  Weight,
} from 'lucide-react';

import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_MAX_RENDERED_ROWS } from '../constants';
import { SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { ControlScheduledQueue } from '../types';
import {
  compactText,
  formatCompactCurrency,
  formatCount,
  formatDecimal,
  formatTons,
} from '../utils/format';
import { useControlDetail } from './controlDetailContext';
import { ControlScrollList } from './ControlScrollList';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';
import { ControlTotal } from './ControlTotal';

export interface PendingLinksPanelProps {
  queue: ControlScheduledQueue;
  /** Today, as `yyyy-MM-dd` — decides which rows read as overdue. */
  date: string;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  /** Grid placement, set by the board. */
  className?: string;
}

interface PendingRowProps {
  bill: DispatchBill;
  today: string;
  onSelect: (bill: DispatchBill) => void;
}

/**
 * One scheduled bill still waiting for a truck.
 *
 * The whole row opens the bill. Linking is deliberately not offered here — it
 * belongs on the Bills Linking page this panel links out to, where the planner
 * has the vehicle list, the transporter picker and the rest of the form to hand.
 */
function PendingRow({ bill, today, onSelect }: PendingRowProps) {
  const dispatchDate = bill.plan.dispatch_date ?? '';
  const isOverdue = Boolean(dispatchDate) && dispatchDate < today;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(bill)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none',
          isOverdue && 'bg-rose-50/60 dark:bg-rose-950/20',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums">#{bill.doc_num}</span>
            <StatusBadge status={bill.plan.booking_status} />
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>
          <p className="truncate text-sm">{compactText(bill.card_name)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {compactText(dispatchDate, 'no date')} · {formatDecimal(bill.total_litres)} L ·{' '}
              {formatCompactCurrency(bill.doc_total)}
            </span>
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

/**
 * Bills with a dispatch date filled in that are still waiting for a vehicle.
 *
 * Read from the Dispatch Plans feed, so this panel counts exactly the bills that
 * page lists — the question is whether the plan has been acted on, which is a
 * plan question, not a linking one. Overdue rows come first and are tinted,
 * because a date that has already passed is the only thing here that is a
 * problem rather than a schedule. Cancelled bookings are left out; nobody is
 * waiting on them.
 */
export function PendingLinksPanel({
  queue,
  date,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: PendingLinksPanelProps) {
  const { showBill } = useControlDetail();

  // The whole queue is listed and the box scrolls; the slice is only the ceiling.
  const visible = queue.rows.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hidden = queue.rows.length - visible.length;

  // Lead with the total, then only the buckets that are actually populated.
  // The old line showed two of the three, so a queue with upcoming bills in it
  // had a header that did not add up to the rows underneath.
  const meta = [
    `${formatCount(queue.counts.total)} waiting`,
    queue.counts.overdue > 0 ? `${formatCount(queue.counts.overdue)} overdue` : '',
    queue.counts.today > 0 ? `${formatCount(queue.counts.today)} due today` : '',
    queue.counts.upcoming > 0 ? `${formatCount(queue.counts.upcoming)} upcoming` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ControlSection
      className={className}
      id="pending-linkings"
      title="Pending Links"
      description="Bills with a dispatch date filled in that are still waiting for a vehicle"
      meta={meta}
      icon={CalendarClock}
      accent={SECTION_ACCENT.pending}
      isFetching={isFetching && !loading}
      action={{ label: 'Dispatch plans', to: '/dispatch/plans' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="The Dispatch Plans feed could not be read."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : visible.length === 0 ? (
        <ControlEmpty message="Every scheduled bill already has a vehicle." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* What the backlog adds up to. A queue of 72 bills means nothing until
              you know whether it is a truckload or a fortnight's work. */}
          <div className="grid shrink-0 grid-cols-3 gap-2">
            <ControlTotal
              icon={Droplets}
              value={`${formatDecimal(queue.totals.litres)} L`}
              label="pending litres"
              tone="danger"
            />
            <ControlTotal
              icon={Weight}
              value={formatTons(queue.totals.weightKg)}
              label="pending tonnes"
              tone="danger"
            />
            <ControlTotal
              icon={IndianRupee}
              value={formatCompactCurrency(queue.totals.amount)}
              label="pending value"
              tone="danger"
            />
          </div>

          <ControlScrollList grow>
            {visible.map((bill) => (
              <PendingRow
                key={`${bill.company_code ?? ''}-${bill.doc_entry}`}
                bill={bill}
                today={date}
                onSelect={showBill}
              />
            ))}
          </ControlScrollList>

          <div className="shrink-0 space-y-1 text-xs text-muted-foreground">
            {queue.counts.alreadyBooked > 0 && (
              <p>
                {formatCount(queue.counts.alreadyBooked)} more scheduled bill
                {queue.counts.alreadyBooked === 1 ? '' : 's'} already have a truck — see Vehicle
                Linking.
              </p>
            )}
            {hidden > 0 && (
              <p>
                {formatCount(hidden)} beyond the first {formatCount(visible.length)} are not drawn —
                open Dispatch Plans for those.
              </p>
            )}
          </div>
        </div>
      )}
    </ControlSection>
  );
}
