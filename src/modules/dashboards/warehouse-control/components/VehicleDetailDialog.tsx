import { ChevronRight, ExternalLink, Lock, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import type { ControlLinkedTruck } from '../types';
import {
  compactText,
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  formatDay,
  formatDecimal,
  formatWeight,
} from '../utils/format';
import { DetailSection, DetailTotals } from './DetailPrimitives';

export interface VehicleDetailDialogProps {
  truck: ControlLinkedTruck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drill from the truck into one of its bills. */
  onSelectBill: (bill: DispatchBill) => void;
}

/**
 * One truck in full: who is driving it, what it is carrying, and every bill on it.
 *
 * The bill list is the point of this dialog — a truck card in the panel can only
 * show bill numbers as badges, and the question that follows is always "what is
 * bill 4207". Each row drills into the bill dialog, which offers a way back here.
 */
export function VehicleDetailDialog({
  truck,
  open,
  onOpenChange,
  onSelectBill,
}: VehicleDetailDialogProps) {
  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Truck className="h-4 w-4" />
            </span>
            <span className="tracking-tight">{truck.vehicleNo}</span>
            {truck.isLocked && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Links frozen
              </Badge>
            )}
            {truck.companyCodes.map((code) => (
              <Badge key={code} variant="outline">
                {code}
              </Badge>
            ))}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {compactText(truck.transporterName, 'No transporter')}
            {truck.driverName ? ` · ${truck.driverName}` : ''}
          </p>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <DetailTotals
            items={[
              { label: 'Bills', value: formatCount(truck.bills.length) },
              { label: 'Litres', value: `${formatDecimal(truck.totals.litres)} L` },
              { label: 'Boxes', value: formatCount(truck.totals.boxes) },
              { label: 'Value', value: formatCurrency(truck.totals.amount) },
            ]}
          />

          <DetailSection
            title="Vehicle"
            fields={[
              { label: 'Vehicle no', value: truck.vehicleNo },
              { label: 'Transporter', value: truck.transporterName },
              { label: 'Driver', value: truck.driverName },
              { label: 'Weight', value: formatWeight(truck.totals.weight) },
              {
                label: 'Dispatch dates',
                value: truck.dispatchDates.map(formatDay).join(', '),
              },
              { label: 'Companies', value: truck.companyCodes.join(', ') },
            ]}
          />

          <DetailSection
            title={`Bills on this truck (${formatCount(truck.bills.length)})`}
            fields={[]}
          >
            <ul className="divide-y overflow-hidden rounded-lg border">
              {truck.bills.map((bill) => (
                <li key={bill.doc_entry}>
                  <button
                    type="button"
                    onClick={() => onSelectBill(bill)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">#{bill.doc_num}</span>
                        <StatusBadge status={bill.plan.booking_status} />
                      </div>
                      <p className="truncate text-sm">{compactText(bill.card_name)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {compactText(bill.city, 'No city')} · {formatDecimal(bill.total_litres)} L ·{' '}
                        {formatCount(bill.total_boxes)} boxes
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCompactCurrency(bill.doc_total)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </DetailSection>

          <div className="flex justify-end pb-1">
            <Button asChild variant="outline" size="sm">
              <Link to="/dispatch/vehicle-linking">
                Open in Vehicle Linking
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
