import { CalendarOff, ExternalLink, PackageX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { NonMovingStatusBadge } from '@/modules/dashboards/non-moving/components';
import type { NonMovingItem, WarehouseGroup } from '@/modules/dashboards/non-moving/types';
import { getMovementStatus } from '@/modules/dashboards/non-moving/utils/movementStatus';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { MOVEMENT_AGE_TONE } from '../constants/warehouse-control.theme';
import { formatCompactCurrency, formatCount, formatCurrency, formatDay } from '../utils/format';
import { oldestDays } from '../utils/nonMovingAge';
import { DetailSection, DetailTotals } from './DetailPrimitives';

export interface NonMovingDetailDialogProps {
  warehouse: WarehouseGroup | null;
  ageDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ItemRow({ item }: { item: NonMovingItem }) {
  const days = item.days_since_last_movement;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.item_name || item.item_code}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.item_code}
          {item.sub_group ? ` · ${item.sub_group}` : ''}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs">
          <CalendarOff
            className={cn('h-3 w-3 shrink-0', MOVEMENT_AGE_TONE[getMovementStatus(days)])}
          />
          <span
            className={cn('font-semibold tabular-nums', MOVEMENT_AGE_TONE[getMovementStatus(days)])}
          >
            {formatCount(days)} days
          </span>
          <span className="truncate text-muted-foreground">
            {item.last_movement_date
              ? `· last moved ${formatDay(item.last_movement_date)}`
              : '· never moved'}
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{formatCompactCurrency(item.value)}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatCount(item.quantity)} qty
        </p>
      </div>
    </li>
  );
}

/**
 * Everything sitting in one warehouse, oldest first.
 *
 * The panel can only rank warehouses by value; this is where the question that
 * follows gets answered — which items, and how long each has stood still. Rows
 * are ordered by days rather than value because that is what makes a line worth
 * chasing: a cheap item untouched for a year is a clearer problem than an
 * expensive one that moved last week.
 */
export function NonMovingDetailDialog({
  warehouse,
  ageDays,
  open,
  onOpenChange,
}: NonMovingDetailDialogProps) {
  if (!warehouse) return null;

  const items = [...warehouse.items].sort(
    (a, b) => b.days_since_last_movement - a.days_since_last_movement || b.value - a.value,
  );
  const worst = oldestDays(warehouse.items);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <PackageX className="h-4 w-4" />
            </span>
            <span>{warehouse.warehouse_name?.trim() || warehouse.warehouse}</span>
            <Badge variant="outline">{warehouse.warehouse}</Badge>
            {worst > 0 && <NonMovingStatusBadge days={worst} />}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            No movement for more than {formatCount(ageDays)} days
          </p>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <DetailTotals
            items={[
              { label: 'Items', value: formatCount(warehouse.item_count) },
              { label: 'Quantity', value: formatCount(warehouse.total_quantity) },
              { label: 'Value', value: formatCurrency(warehouse.total_value) },
              { label: 'Oldest', value: `${formatCount(worst)} days` },
            ]}
          />

          <DetailSection
            title={`Items (${formatCount(items.length)}) — longest stuck first`}
            fields={[]}
          >
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                The backend returned no item breakdown for this warehouse.
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border">
                {items.map((item) => (
                  <ItemRow key={item.item_code} item={item} />
                ))}
              </ul>
            )}
          </DetailSection>

          <div className="flex justify-end pb-1">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboards/non-moving">
                Open the full report
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
