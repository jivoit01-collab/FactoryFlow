import { History, Loader2 } from 'lucide-react';

import type { RawMaterialStockAction, RawMaterialStockRow } from '@/modules/warehouse/api';
import { useRMStockDetail } from '@/modules/warehouse/api';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

const ACTION_LABELS: Record<RawMaterialStockAction, { label: string; cls: string }> = {
  CREATED: { label: 'First set', cls: 'bg-blue-100 text-blue-800' },
  UPDATED: { label: 'Changed', cls: 'bg-amber-100 text-amber-800' },
  REMOVED: { label: 'Removed', cls: 'bg-red-100 text-red-800' },
  RESTORED: { label: 'Back on register', cls: 'bg-green-100 text-green-800' },
};

export interface StockHistoryDialogProps {
  row: RawMaterialStockRow | null;
  onClose: () => void;
}

/** Every quantity this item has been set to in this warehouse, newest first. */
export function StockHistoryDialog({ row, onClose }: StockHistoryDialogProps) {
  const { data, isLoading } = useRMStockDetail(row?.id ?? null);

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {row?.item_code} in {row?.warehouse_code}
          </DialogTitle>
          <DialogDescription>{row?.item_name}</DialogDescription>
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
                  <th className="px-3 py-2 text-right">Was</th>
                  <th className="px-3 py-2 text-right">Set to</th>
                  <th className="px-3 py-2">As of</th>
                  <th className="px-3 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((entry) => {
                  const action = ACTION_LABELS[entry.action];
                  const delta = entry.qty_delta == null ? null : Number(entry.qty_delta);
                  return (
                    <tr key={entry.id} className="border-b align-top hover:bg-muted/50">
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(entry.changed_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={action.cls}>{action.label}</Badge>
                        {entry.remarks && (
                          <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                            {entry.remarks}
                          </p>
                        )}
                      </td>
                      {/* An em dash, not 0: before the first entry there was no
                          figure at all, which is not the same as a figure of zero. */}
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {entry.previous_qty ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {entry.qty}
                        {delta != null && delta !== 0 && (
                          <span
                            className={`ml-2 text-xs ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{entry.as_of_date ?? '—'}</td>
                      <td className="px-3 py-2">{entry.changed_by_name || '—'}</td>
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
