import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Checkbox, Input } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import type { BOMLineSourceOption, BOMRequestLine } from '../types';
import { formatQty as fmt, toStorableQty } from '../utils/qty';

/**
 * Where the approved quantity is coming out of.
 *
 * The line's own consumption warehouse is shown but never offered: its stock is
 * already at the line and was subtracted from the requirement when the request
 * was raised. Offering it back is how 1,016 tins came to be approved when the
 * store held one.
 */
export function BOMSourcePickerDialog({
  line,
  open,
  initial,
  onOpenChange,
  onConfirm,
}: {
  line: BOMRequestLine | null;
  open: boolean;
  initial: { warehouse: string; qty: number }[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (picked: { warehouse: string; qty: number }[]) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({});

  const options: BOMLineSourceOption[] = useMemo(
    () => line?.source_options ?? [],
    [line],
  );
  const required = line ? parseFloat(line.required_qty) : 0;

  useEffect(() => {
    if (!open) return;
    if (initial.length > 0) {
      setDraft(Object.fromEntries(initial.map((s) => [s.warehouse, s.qty])));
      return;
    }
    // Nothing chosen yet — most often a line the approver had rejected and is
    // coming back to. Fill from the fullest godown down so the common case is
    // a glance and a confirm, not a row of typed numbers.
    let outstanding = required;
    const prefilled: Record<string, number> = {};
    for (const option of options) {
      if (outstanding <= 0) break;
      const take = toStorableQty(Math.min(outstanding, option.available));
      if (take > 0) {
        prefilled[option.warehouse] = take;
        outstanding -= take;
      }
    }
    setDraft(prefilled);
    // `initial` is rebuilt on every render of the parent; keying the reset on
    // the dialog opening keeps it from wiping what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, line?.id]);

  const allocated = Object.values(draft).reduce((sum, qty) => sum + (qty || 0), 0);
  const short = Math.max(0, required - allocated);
  const overAllocated = options.some(
    (option) => (draft[option.warehouse] ?? 0) > option.available,
  );

  const setQty = (warehouse: string, qty: number, available: number) => {
    const capped = toStorableQty(Math.min(Math.max(qty, 0), available));
    setDraft((prev) => {
      const next = { ...prev };
      if (capped <= 0) delete next[warehouse];
      else next[warehouse] = capped;
      return next;
    });
  };

  // Ticking a godown takes as much of the outstanding requirement as it holds,
  // so the common case — fill from here — is one click.
  const toggle = (option: BOMLineSourceOption, checked: boolean) => {
    if (!checked) {
      setQty(option.warehouse, 0, option.available);
      return;
    }
    const outstanding = Math.max(0, required - allocated);
    setQty(option.warehouse, Math.min(outstanding, option.available), option.available);
  };

  if (!line) return null;

  const consumption = line.consumption_warehouse;
  const atConsumption = line.at_consumption ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Draw {line.item_code} from which godown?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{line.item_name}</p>
            <p className="text-sm text-muted-foreground">
              This run needs {fmt(required)} {line.uom}.
            </p>
            {consumption && atConsumption > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {fmt(atConsumption)} {line.uom} is already at the line in{' '}
                <strong>{consumption}</strong> and has been taken off this request —
                the store is not being asked to fetch it.
              </p>
            )}
          </div>

          {options.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-amber-800 dark:text-amber-300">
                No godown holds {line.item_code} outside{' '}
                {consumption || 'the line'}. There is nothing for the store to
                fetch — reject the line, or have the stock transferred in first.
              </p>
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {options.map((option) => {
                const qty = draft[option.warehouse] ?? 0;
                const spokenFor = option.claimed > 0;
                return (
                  <div
                    key={option.warehouse}
                    className="flex items-center gap-3 p-3"
                  >
                    <Checkbox
                      checked={qty > 0}
                      disabled={option.available <= 0}
                      onCheckedChange={(checked) => toggle(option, checked === true)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{option.warehouse}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(option.available)} available
                        {spokenFor && (
                          <>
                            {' '}
                            &middot; {fmt(option.on_hand)} on hand,{' '}
                            {fmt(option.claimed)} held by another run
                          </>
                        )}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={option.available}
                      step="0.001"
                      className="w-28 h-8 text-sm"
                      value={qty || ''}
                      disabled={option.available <= 0}
                      onChange={(e) =>
                        setQty(
                          option.warehouse,
                          parseFloat(e.target.value) || 0,
                          option.available,
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Drawing {fmt(allocated)} of {fmt(required)} {line.uom}
            </span>
            {short > 0 ? (
              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
              >
                short by {fmt(short)}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30"
              >
                covered in full
              </Badge>
            )}
          </div>

          {short > 0 && allocated > 0 && (
            <p className="text-xs text-muted-foreground">
              Approving less than the request leaves the line partially approved.
              Production can ask for the balance with &ldquo;Request shortfall&rdquo;
              once this is settled.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={allocated <= 0 || overAllocated}
            onClick={() =>
              onConfirm(
                Object.entries(draft)
                  .filter(([, qty]) => qty > 0)
                  .map(([warehouse, qty]) => ({ warehouse, qty })),
              )
            }
          >
            Approve {fmt(allocated)} {line.uom}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
