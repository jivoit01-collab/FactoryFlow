import { AlertTriangle, Link2, Lock, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { useLinkDispatchVehicle, useUnlinkDispatchVehicle } from '@/modules/vehicle-management/api';
import { DispatchLinkingSheet } from '@/modules/vehicle-management/components';
import type { DispatchVehicleLinkPayload } from '@/modules/vehicle-management/types';
import { Badge, Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { getErrorMessage } from '@/shared/utils/error';

import { WAREHOUSE_CONTROL_PREVIEW_ROWS } from '../constants';
import { SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { ControlLinkedTruck, ControlLinkingBoard } from '../types';
import { compactText, formatCompactCurrency, formatCount, formatDecimal } from '../utils/format';
import { ControlSection } from './ControlSection';
import { ControlEmpty, ControlError, ControlSkeletonRows } from './ControlStates';

export interface VehicleLinkingSectionProps {
  board: ControlLinkingBoard;
  /** Today, as `yyyy-MM-dd` — decides which pending rows read as overdue. */
  date: string;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
}

/** One truck: its plate, who is driving it, and what it is carrying. */
function TruckCard({ truck }: { truck: ControlLinkedTruck }) {
  const billWord = truck.bills.length === 1 ? 'bill' : 'bills';

  return (
    <li className="rounded-lg border p-3 transition-colors hover:border-foreground/20">
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
          {truck.isLocked && (
            <Badge variant="outline" className="gap-1 px-1.5" title="Links frozen by a gate-in">
              <Lock className="h-3 w-3" />
            </Badge>
          )}
          <Badge variant="secondary" className="tabular-nums">
            {formatCount(truck.bills.length)} {billWord}
          </Badge>
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
    </li>
  );
}

interface PendingRowProps {
  bill: DispatchBill;
  today: string;
  canEdit: boolean;
  onLink: (bill: DispatchBill) => void;
}

function PendingRow({ bill, today, canEdit, onLink }: PendingRowProps) {
  const dispatchDate = bill.plan.dispatch_date ?? '';
  const isOverdue = Boolean(dispatchDate) && dispatchDate < today;

  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40',
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
        <p className="truncate text-xs text-muted-foreground">
          {compactText(dispatchDate, 'unscheduled')} · {compactText(bill.city, 'No city')} ·{' '}
          {formatDecimal(bill.total_litres)} L
        </p>
      </div>
      {canEdit && (
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => onLink(bill)}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Link
        </Button>
      )}
    </li>
  );
}

/**
 * The linking half of the board: trucks already loaded for today, and the queue
 * of bills still waiting for one.
 *
 * Both panels live here so they share a single linking sheet and one read of the
 * bills feed. The queue is where a planner acts, so its rows carry a Link button
 * straight through to the same form the Vehicle Linking page uses.
 */
export function VehicleLinkingSection({
  board,
  date,
  loading,
  isFetching,
  error,
  onRetry,
}: VehicleLinkingSectionProps) {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.DISPATCH_VEHICLE_LINKING);

  const linkMutation = useLinkDispatchVehicle();
  const unlinkMutation = useUnlinkDispatchVehicle();

  const [selectedBill, setSelectedBill] = useState<DispatchBill | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openSheet = (bill: DispatchBill) => {
    setSelectedBill(bill);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedBill(null);
  };

  const handleSave = async (docEntry: number, payload: DispatchVehicleLinkPayload) => {
    try {
      await linkMutation.mutateAsync({ docEntry, payload });
      toast.success('Vehicle linked to dispatch plan');
      closeSheet();
    } catch (saveError) {
      // Surface the backend guard message (e.g. "vehicle is already inside — add
      // bills from the Inside Vehicle page") so the planner knows the next step.
      toast.error(getErrorMessage(saveError, 'Failed to link vehicle'));
    }
  };

  const handleUnlink = async (docEntry: number) => {
    try {
      await unlinkMutation.mutateAsync({ docEntry });
      toast.success('Vehicle unlinked. The booking is back to Pending.');
      closeSheet();
    } catch (unlinkError) {
      toast.error(getErrorMessage(unlinkError, 'Failed to unlink vehicle'));
    }
  };

  const visibleTrucks = board.trucks.slice(0, WAREHOUSE_CONTROL_PREVIEW_ROWS);
  const hiddenTrucks = board.trucks.length - visibleTrucks.length;
  const visiblePending = board.pending.slice(0, WAREHOUSE_CONTROL_PREVIEW_ROWS);
  const hiddenPending = board.pending.length - visiblePending.length;

  const trucksMeta = `${formatCount(board.counts.trucksToday)} trucks · ${formatCount(
    board.counts.linkedBillsToday,
  )} bills linked`;
  const pendingMeta = board.counts.pendingOverdue
    ? `${formatCount(board.counts.pendingOverdue)} overdue · ${formatCount(board.counts.pendingToday)} today`
    : `${formatCount(board.counts.pendingToday)} today · ${formatCount(board.counts.pendingUpcoming)} upcoming`;

  return (
    <>
      <ControlSection
        id="vehicle-linking"
        title="Vehicle Linking"
        description="Trucks loaded for today and the bills riding on each"
        meta={trucksMeta}
        icon={Truck}
        accent={SECTION_ACCENT.linking}
        isFetching={isFetching && !loading}
        action={{ label: 'Linking page', to: '/dispatch/vehicle-linking' }}
      >
        {error ? (
          <ControlError
            error={error}
            fallback="The vehicle linking feed could not be read."
            onRetry={onRetry}
          />
        ) : loading ? (
          <ControlSkeletonRows rows={3} />
        ) : visibleTrucks.length === 0 ? (
          <ControlEmpty message="No vehicle has been linked for today yet." />
        ) : (
          <div className="space-y-3">
            <ul className="grid gap-2 2xl:grid-cols-2">
              {visibleTrucks.map((truck) => (
                <TruckCard key={truck.vehicleId} truck={truck} />
              ))}
            </ul>
            {hiddenTrucks > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {formatCount(visibleTrucks.length)} of {formatCount(board.trucks.length)}{' '}
                trucks — open the Linking page for the rest.
              </p>
            )}
          </div>
        )}
      </ControlSection>

      <ControlSection
        id="pending-linkings"
        title="Pending Linkings"
        description="Dated bills with no vehicle — overdue first, then today, then upcoming"
        meta={pendingMeta}
        icon={Link2}
        accent={SECTION_ACCENT.pending}
        isFetching={isFetching && !loading}
        action={{ label: 'Bill linking', to: '/dispatch/bills-linking' }}
      >
        {error ? (
          <ControlError
            error={error}
            fallback="The vehicle linking feed could not be read."
            onRetry={onRetry}
          />
        ) : loading ? (
          <ControlSkeletonRows rows={4} />
        ) : visiblePending.length === 0 ? (
          <ControlEmpty message="Every dated bill already has a vehicle." />
        ) : (
          <div className="space-y-3">
            <ul className="divide-y overflow-hidden rounded-lg border">
              {visiblePending.map((bill) => (
                <PendingRow
                  key={bill.doc_entry}
                  bill={bill}
                  today={date}
                  canEdit={canEdit}
                  onLink={openSheet}
                />
              ))}
            </ul>
            {hiddenPending > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {formatCount(visiblePending.length)} of {formatCount(board.pending.length)}{' '}
                pending bills — open Bill Linking for the rest.
              </p>
            )}
          </div>
        )}
      </ControlSection>

      <DispatchLinkingSheet
        bill={selectedBill}
        selectedBills={selectedBill ? [selectedBill] : []}
        open={isSheetOpen}
        isSaving={linkMutation.isPending}
        isUnlinking={unlinkMutation.isPending}
        onOpenChange={(open) => (open ? setIsSheetOpen(true) : closeSheet())}
        onSave={handleSave}
        onUnlink={handleUnlink}
      />
    </>
  );
}
