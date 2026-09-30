import { HandHelping, Pencil, Scale } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useSpareMovements } from '../../api';
import type { MaintenanceSpare } from '../../types';
import { StockLevelBadge } from './StockLevelBadge';
import { formatQty, historyLines, toNumber } from './storeFormat';

const HISTORY_LINES = 15;

/** One item: how many, where, what to do with it, and what happened to it. */
export function ItemDialog({
  spare,
  canManage,
  onGiveOut,
  onCount,
  onEdit,
  onOpenChange,
}: {
  spare: MaintenanceSpare;
  canManage: boolean;
  onGiveOut: () => void;
  onCount: () => void;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const movementsQuery = useSpareMovements({ spare: spare.id });
  const lines = historyLines(movementsQuery.data ?? []).slice(0, HISTORY_LINES);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{spare.name}</DialogTitle>
          <DialogDescription>
            {spare.storage_location ? `Kept at ${spare.storage_location}` : 'No place written'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-4xl font-bold tabular-nums',
              toNumber(spare.current_stock) < 0 && 'text-rose-600 dark:text-rose-400',
            )}
          >
            {formatQty(spare.current_stock)}
          </span>
          <span className="text-lg text-muted-foreground">{spare.uom}</span>
          <StockLevelBadge spare={spare} className="ml-2" />
        </div>

        {canManage && (
          <div className="grid grid-cols-3 gap-2">
            <Button size="lg" onClick={onGiveOut}>
              <HandHelping />
              Give out
            </Button>
            <Button size="lg" variant="outline" onClick={onCount}>
              <Scale />
              Count
            </Button>
            <Button size="lg" variant="outline" onClick={onEdit}>
              <Pencil />
              Edit
            </Button>
          </div>
        )}

        <section aria-label="History" className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
          {movementsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 dark:divide-border/60 dark:border-border">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-14 shrink-0 text-muted-foreground">{line.day}</span>
                  <span
                    className={cn(
                      'w-16 shrink-0 text-right font-semibold tabular-nums',
                      line.change < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {line.change < 0 ? '−' : '+'}
                    {formatQty(Math.abs(line.change))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{line.text}</span>
                    {line.by && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {line.by}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
