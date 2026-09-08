import { CheckCircle2, ChevronRight, Lock, Truck } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { WAREHOUSE_CONTROL_MAX_RENDERED_ROWS } from '../constants';
import { SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { ControlLinkedTruck, ControlLinkingBoard } from '../types';
import { compactText, formatCompactCurrency, formatCount, formatDecimal } from '../utils/format';
import { useControlDetail } from './controlDetailContext';
import { ControlScrollList } from './ControlScrollList';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';

export interface VehicleLinkingPanelProps {
  board: ControlLinkingBoard;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  /** Grid placement, set by the board. */
  className?: string;
}

/** One truck: its plate, who is driving it, and what it is carrying. */
function TruckCard({
  truck,
  onSelect,
}: {
  truck: ControlLinkedTruck;
  onSelect: (truck: ControlLinkedTruck) => void;
}) {
  const billWord = truck.bills.length === 1 ? 'bill' : 'bills';

  return (
    <li>
      {/* The whole card is the target — the bill badges inside stay plain text
          so there is no button nested in a button; drilling into a bill happens
          in the vehicle dialog this opens. */}
      <button
        type="button"
        onClick={() => onSelect(truck)}
        className={cn(
          'w-full rounded-lg border p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:border-foreground/30 focus-visible:outline-none',
          // A truck that has left is a record, not a task — muted, but still legible.
          truck.isDispatched &&
            'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{truck.vehicleNo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {compactText(truck.transporterName, 'No transporter')}
                {truck.driverName ? ` · ${truck.driverName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {truck.isDispatched ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-3 w-3" />
                Dispatched
              </Badge>
            ) : (
              truck.dispatchedBills > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                >
                  {formatCount(truck.dispatchedBills)} gone
                </Badge>
              )
            )}
            {truck.isLocked && (
              <Badge variant="outline" className="gap-1 px-1.5" title="Links frozen by a gate-in">
                <Lock className="h-3 w-3" />
              </Badge>
            )}
            <Badge variant="secondary" className="tabular-nums">
              {formatCount(truck.bills.length)} {billWord}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t pt-2.5 text-center">
          <div>
            <dt className="text-[11px] text-muted-foreground">Litres</dt>
            <dd className="truncate text-sm font-semibold tabular-nums">
              {formatDecimal(truck.totals.litres)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Boxes</dt>
            <dd className="truncate text-sm font-semibold tabular-nums">
              {formatCount(truck.totals.boxes)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Value</dt>
            <dd className="truncate text-sm font-semibold tabular-nums">
              {formatCompactCurrency(truck.totals.amount)}
            </dd>
          </div>
        </dl>

        <div className="mt-2 flex flex-wrap gap-1">
          {truck.bills.map((bill) => (
            <Badge key={bill.doc_entry} variant="outline" className="font-normal tabular-nums">
              #{bill.doc_num}
            </Badge>
          ))}
        </div>
      </button>
    </li>
  );
}

/**
 * The vehicles carrying today's work, each with the bills attached to it.
 *
 * Only trucks that actually hold a bill appear — a vehicle with nothing booked
 * onto it is not part of today. This is the transpose of Today's Bills: same
 * feed, same set, folded on the vehicle instead of the bill, because "what is on
 * this truck" and "which truck is this bill on" are both asked on the floor.
 */
export function VehicleLinkingPanel({
  board,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: VehicleLinkingPanelProps) {
  const { showVehicle } = useControlDetail();
  // Every truck is listed and the box scrolls; the slice is only the ceiling.
  const visible = board.trucks.slice(0, WAREHOUSE_CONTROL_MAX_RENDERED_ROWS);
  const hidden = board.trucks.length - visible.length;

  const meta = board.counts.dispatchedTrucksToday
    ? `${formatCount(board.counts.trucksToday)} trucks · ${formatCount(board.counts.dispatchedTrucksToday)} dispatched · ${formatCount(board.counts.linkedBillsToday)} bills`
    : `${formatCount(board.counts.trucksToday)} trucks · ${formatCount(board.counts.linkedBillsToday)} bills attached`;

  return (
    <ControlSection
      className={className}
      id="vehicle-linking"
      title="Vehicle Linking"
      description="Vehicles carrying today's bills — still loading first, dispatched last"
      meta={meta}
      icon={Truck}
      accent={SECTION_ACCENT.linking}
      isFetching={isFetching && !loading}
      action={{ label: 'Linking page', to: '/dispatch/vehicle-linking' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="The Bills Linking feed could not be read."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={3} />
      ) : visible.length === 0 ? (
        <ControlEmpty message="No vehicle has bills attached for today yet." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ControlScrollList as="plain" grow className="p-2">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {visible.map((truck) => (
                <TruckCard key={truck.vehicleId} truck={truck} onSelect={showVehicle} />
              ))}
            </ul>
          </ControlScrollList>
          {hidden > 0 && (
            <p className="shrink-0 text-xs text-muted-foreground">
              {formatCount(hidden)} beyond the first {formatCount(visible.length)} are not drawn —
              open the Linking page for those.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
