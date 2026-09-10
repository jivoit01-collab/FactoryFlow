import { History, Loader2 } from 'lucide-react';

import type { PFMovement, PFMovementAction } from '@/modules/warehouse/api';
import { usePFMovementDetail } from '@/modules/warehouse/api';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

const ACTION_LABELS: Record<PFMovementAction, { label: string; cls: string }> = {
  CREATED: { label: 'Recorded', cls: 'bg-blue-100 text-blue-800' },
  UPDATED: { label: 'Corrected', cls: 'bg-amber-100 text-amber-800' },
  CANCELLED: { label: 'Retracted', cls: 'bg-red-100 text-red-800' },
  RESTORED: { label: 'Put back', cls: 'bg-green-100 text-green-800' },
};

export interface MovementHistoryDialogProps {
  movement: PFMovement | null;
  onClose: () => void;
}

/**
 * Everything that has happened to one declaration, newest first.
 *
 * Each row shows the totals as the document stood *after* that change, which is
 * what makes a correction readable — "680 pcs, was 240" rather than a bare
 * "edited".
 */
export function MovementHistoryDialog({ movement, onClose }: MovementHistoryDialogProps) {
  const { data, isLoading } = usePFMovementDetail(movement?.id ?? null);

  return (
    <Dialog open={!!movement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {movement?.entry_no}
          </DialogTitle>
          <DialogDescription>
            {movement?.from_warehouse} → {movement?.destination_display}
            {movement?.to_warehouse_name ? ` (${movement.to_warehouse_name})` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the history…
          </p>
        ) : !data?.history.length ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">To godown</th>
                  <th className="px-3 py-2 text-right">Items</th>
                  <th className="px-3 py-2 text-right">Pieces</th>
                  <th className="px-3 py-2 text-right">Ltr</th>
                  <th className="px-3 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((event) => {
                  const action = ACTION_LABELS[event.action];
                  return (
                    <tr key={event.id} className="border-b align-top hover:bg-muted/50">
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(event.changed_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={action.cls}>{action.label}</Badge>
                        {event.note && (
                          <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </td>
                      {/* "Dispatch" where the event recorded no godown, so a
                          switch reads as "was going to BH-BT, now a dispatch"
                          rather than as a destination that just emptied. */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                        {event.to_warehouse ||
                          (event.destination_kind === 'DISPATCH' ? 'Dispatch' : '—')}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {event.line_count}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {event.total_pieces.toLocaleString()}
                      </td>
                      {/* Events filed before the register moved to pieces carry
                          no piece total — a box total cannot be converted
                          without the per-line pack sizes an event never stored.
                          An em dash says so rather than implying zero. */}
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {Number(event.total_litres) > 0
                          ? Number(event.total_litres).toLocaleString(undefined, {
                              maximumFractionDigits: 3,
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2">{event.changed_by_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
