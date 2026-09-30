import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useLineCounts, useVoidCount } from '../api';
import { qty, when } from '../format';
import type { StockAuditLine } from '../types';

/** '10', '20', '-5' → '10 + 20 − 5'. */
function sum(values: string[]) {
  return values
    .map((value, index) => {
      const n = Number(value);
      const shown = qty(String(Math.abs(n)));
      if (index === 0) return n < 0 ? `−${shown}` : shown;
      return `${n < 0 ? '−' : '+'} ${shown}`;
    })
    .join(' ');
}

/**
 * Every count of one item, oldest first, and a way to take one back. A count
 * taken back stays on the list, struck through, so the trail is whole.
 */
export function CountHistoryDialog({
  auditId,
  line,
  canVoidAny,
  open,
  isOpenAudit,
  onClose,
}: {
  auditId: number;
  line: StockAuditLine | null;
  /** Audit managers may take back anybody's count. */
  canVoidAny: boolean;
  open: boolean;
  isOpenAudit: boolean;
  onClose: () => void;
}) {
  const counts = useLineCounts(auditId, open && line ? line.id : null);
  const voidCount = useVoidCount(auditId);

  const handleVoid = async (countId: number) => {
    try {
      await voidCount.mutateAsync(countId);
      toast.success('Count taken back');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The count was not taken back.'));
    }
  };

  // Added up here from the counts shown, so a count taken back is off the
  // total at once rather than when the row behind the dialog reloads.
  const live = (counts.data ?? []).filter((c) => !c.voided);
  const total = live.reduce((sum, c) => sum + Number(c.qty), 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono">{line?.item_code}</span> {line?.item_name}
          </DialogTitle>
          <DialogDescription>
            {live.length
              ? `${sum(live.map((c) => c.qty))} = ${qty(String(total))} ${line?.uom ?? ''} on hand`
              : 'Nothing on hand counted yet.'}
          </DialogDescription>
        </DialogHeader>

        {counts.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y text-sm">
            {(counts.data ?? []).map((count) => (
              <li key={count.id} className="flex items-center gap-3 py-2">
                <span
                  className={cn(
                    'w-20 text-right font-mono tabular-nums',
                    count.voided && 'text-muted-foreground line-through',
                  )}
                >
                  {Number(count.qty) >= 0 ? '+' : ''}
                  {qty(count.qty)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{count.note || '—'}</span>
                  <span className="block text-xs text-muted-foreground">
                    {count.counted_by} · {when(count.counted_at)}
                    {count.voided && ` · taken back by ${count.voided_by}`}
                  </span>
                </span>
                {isOpenAudit && !count.voided && (count.mine || canVoidAny) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoid(count.id)}
                    disabled={voidCount.isPending}
                  >
                    <Undo2 className="mr-1 h-4 w-4" /> Take back
                  </Button>
                )}
              </li>
            ))}
            {counts.data?.length === 0 && (
              <li className="py-6 text-center text-muted-foreground">No counts yet.</li>
            )}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
