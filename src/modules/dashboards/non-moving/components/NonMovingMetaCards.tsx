import { AlertTriangle, Clock, Package, ShieldAlert } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { NON_MOVING_ALL_STATUSES } from '../constants';
import type { MovementStatus } from '../utils/movementStatus';
import type { NonMovingStatusTotals, NonMovingTotals } from '../utils/nonMovingRows';

interface NonMovingMetaCardsProps {
  /** Totals per movement status, ignoring the status filter itself. */
  totals?: NonMovingStatusTotals;
  overall?: NonMovingTotals;
  activeStatuses?: MovementStatus[];
  onStatusSelect?: (statuses: MovementStatus[]) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function sameStatusSet(a: MovementStatus[] = [], b: MovementStatus[] = []): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

export function NonMovingMetaCards({
  totals,
  overall,
  activeStatuses = NON_MOVING_ALL_STATUSES,
  onStatusSelect,
}: NonMovingMetaCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      totals: overall,
      icon: Package,
      statuses: NON_MOVING_ALL_STATUSES,
    },
    {
      label: 'Recently Moved',
      totals: totals?.recent,
      icon: Clock,
      statuses: ['recent'],
    },
    {
      label: 'Slow Moving',
      totals: totals?.['slow-moving'],
      icon: AlertTriangle,
      statuses: ['slow-moving'],
    },
    {
      label: 'Non Moving',
      totals: totals?.['non-moving'],
      icon: ShieldAlert,
      statuses: ['non-moving'],
    },
  ] satisfies Array<{
    label: string;
    totals?: NonMovingTotals;
    icon: typeof Package;
    statuses: MovementStatus[];
  }>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isActive = sameStatusSet(activeStatuses, card.statuses);

        return (
          <Card
            key={card.label}
            role="button"
            tabIndex={0}
            className={cn(
              'cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20',
              isActive && 'border-primary/60 bg-primary/5',
            )}
            onClick={() => onStatusSelect?.([...card.statuses])}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onStatusSelect?.([...card.statuses]);
              }
            }}
            aria-pressed={isActive}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-primary/5 p-2">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">
                  {card.totals ? card.totals.item_count.toLocaleString('en-IN') : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.totals ? formatCurrency(card.totals.total_value) : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
