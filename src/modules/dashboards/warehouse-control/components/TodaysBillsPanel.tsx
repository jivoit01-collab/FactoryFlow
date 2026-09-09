import { ChevronRight, Droplets, FileText, Package, Truck } from 'lucide-react';

import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_MAX_RENDERED_ROWS } from '../constants';
import { SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { ControlLinkingBoard } from '../types';
import {
  compactText,
  formatCompactCurrency,
  formatCompanyChip,
  formatCount,
  formatDecimal,
} from '../utils/format';
import { useControlDetail } from './controlDetailContext';
import { ControlScrollList } from './ControlScrollList';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';
import { ControlTotal } from './ControlTotal';

export interface TodaysBillsPanelProps {
  board: ControlLinkingBoard;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  /** Grid placement, set by the board. */
  className?: string;
}

/**
 * One bill, with the truck it rides on.
 *
 * The vehicle number is the point of this row, so it sits on its own line with a
 * truck icon rather than being folded into the grey detail line — a reader
 * scanning for "which truck is this on" should not have to parse a sentence.
 *
 * A dispatched bill keeps its place here, tinted and badged: what has already
 * left is half of what a day's board is read for.
 *
 * The board is cross-company, so the row names the company it belongs to — two
 * invoice numbers on this list can be the same digits in different companies,
 * and the truck they share is one truck.
 */
function BillRow({
  bill,
  onSelect,
}: {
  bill: DispatchBill;
  onSelect: (bill: DispatchBill) => void;
}) {
  const vehicleNo = compactText(bill.plan.vehicle_no, `Vehicle #${bill.plan.vehicle_id ?? '?'}`);
  const isDispatched = bill.plan.booking_status === 'DISPATCHED';
  const company = formatCompanyChip(bill.company_code);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(bill)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none',
          // Gone out — kept on the board as a record, tinted so it does not read
          // as work still to do. The status badge says which.
          isDispatched && 'bg-emerald-50/50 dark:bg-emerald-950/20',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-semibold tabular-nums">#{bill.doc_num}</span>
            <StatusBadge status={bill.plan.booking_status} />
            {company && (
              <Badge variant="outline" className="shrink-0 px-1.5 font-normal">
                {company}
              </Badge>
            )}
          </div>
          <p className="truncate text-sm">{compactText(bill.card_name)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <Truck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate font-medium tracking-tight">{vehicleNo}</span>
            {bill.plan.transporter_name?.trim() && (
              <span className="truncate text-muted-foreground">
                · {bill.plan.transporter_name.trim()}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatCompactCurrency(bill.doc_total)}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatDecimal(bill.total_litres)} L
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    </li>
  );
}

/**
 * Today's bills that have a truck against them, and which truck that is.
 *
 * Only linked bills appear: this panel answers "what is going out today and on
 * what", so a bill with no vehicle belongs in Pending Links, not here. It reads
 * every company's bills, not the active one's — the dock is shared — and the
 * count in the header names how many of today's bills are still waiting.
 */
export function TodaysBillsPanel({
  board,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: TodaysBillsPanelProps) {
  const { showBill } = useControlDetail();
  // The whole day is listed and the box scrolls; the slice is only the ceiling.
  const visible = board.linkedBills.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hidden = board.linkedBills.length - visible.length;

  const meta = board.counts.dispatchedBillsToday
    ? `${formatCount(board.counts.linkedBillsToday)} on trucks · ${formatCount(board.counts.dispatchedBillsToday)} dispatched · ${formatCount(board.counts.unlinkedToday)} unlinked`
    : `${formatCount(board.counts.linkedBillsToday)} on trucks · ${formatCount(board.counts.unlinkedToday)} still unlinked`;

  return (
    <ControlSection
      className={className}
      id="todays-bills"
      title="Today's Bills"
      description="Bills dated today that have a vehicle, and which vehicle — every company, dispatched ones last"
      meta={meta}
      icon={FileText}
      accent={SECTION_ACCENT.bills}
      isFetching={isFetching && !loading}
      action={{ label: 'Bill linking', to: '/dispatch/bills-linking' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="The Bills Linking feed could not be read."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : visible.length === 0 ? (
        <ControlEmpty message="No bill dated today has a vehicle attached yet." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid shrink-0 grid-cols-3 gap-2">
            <ControlTotal
              icon={Droplets}
              value={`${formatDecimal(board.totals.litres)} L`}
              label="oil linked"
            />
            <ControlTotal
              icon={Package}
              value={formatCount(board.totals.boxes)}
              label="boxes to move"
            />
            <ControlTotal
              icon={Truck}
              value={formatCount(board.counts.trucksToday)}
              label="trucks carrying"
            />
          </div>

          <ControlScrollList grow>
            {visible.map((bill) => (
              <BillRow
                key={`${bill.company_code ?? ''}-${bill.doc_entry}`}
                bill={bill}
                onSelect={showBill}
              />
            ))}
          </ControlScrollList>

          {hidden > 0 && (
            <p className="shrink-0 text-xs text-muted-foreground">
              {formatCount(hidden)} beyond the first {formatCount(visible.length)} are not drawn —
              open Bill Linking for those.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
