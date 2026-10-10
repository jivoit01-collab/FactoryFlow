import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import {
  usePlanStockWarehouses,
  useSavePlanStockWarehouses,
} from '@/modules/dashboards/plant-board/api';
import { decimal, whole } from '@/modules/dashboards/plant-board/components/drills/format';
import { Button, Checkbox } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

/**
 * Which warehouses the month-plan drill counts as stock.
 *
 * Stored for the company, not the browser, so everybody opening the drill
 * reads the same "In stock". Nothing ticked is every warehouse — "count
 * nothing" is not a setting anybody means — and the panel says so rather than
 * saving an empty list.
 */
export function PlanStockSettings({ onDone }: { onDone: () => void }) {
  const setting = usePlanStockWarehouses();
  const save = useSavePlanStockWarehouses();
  // Null until somebody clicks: falls through to the saved choice.
  const [draft, setDraft] = useState<Set<string> | null>(null);

  const warehouses = setting.data?.warehouses ?? [];
  const saved = setting.data?.selected ?? null;
  const ticked = draft ?? new Set(saved ?? warehouses.map((w) => w.code));
  const everything = warehouses.length > 0 && warehouses.every((w) => ticked.has(w.code));

  const toggle = (code: string) => {
    const next = new Set(ticked);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setDraft(next);
  };

  const submit = () => {
    // Every warehouse ticked is stored as "all", so a warehouse that starts
    // holding finished goods later is counted without anybody re-ticking.
    const codes = everything ? null : [...ticked].sort();
    save.mutate(codes, { onSuccess: onDone });
  };

  const tickedTons = warehouses
    .filter((w) => ticked.has(w.code))
    .reduce((sum, w) => sum + w.tons, 0);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Warehouses counted as stock</h3>
        <p className="text-sm text-muted-foreground">
          The <span className="font-medium text-foreground">In stock</span> column and each SKU's
          warehouse list count only the warehouses ticked here. Saved for everybody in this company.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <Checkbox
              checked={everything}
              onCheckedChange={(on) => setDraft(new Set(on ? warehouses.map((w) => w.code) : []))}
              aria-label="All warehouses"
            />
            All warehouses
          </label>
          <span className="text-sm text-muted-foreground">
            {whole(ticked.size)} of {whole(warehouses.length)} ticked · {decimal(tickedTons)} t of
            finished goods
          </span>
        </div>

        {setting.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading warehouses from SAP…
          </div>
        ) : setting.isError ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {getErrorMessage(setting.error, 'The warehouses could not be read from SAP.')}
          </p>
        ) : (
          <ul className="divide-y">
            {warehouses.map((w) => (
              <li key={w.code}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/40',
                    ticked.has(w.code) && 'bg-violet-500/[0.04]',
                  )}
                >
                  <Checkbox
                    checked={ticked.has(w.code)}
                    onCheckedChange={() => toggle(w.code)}
                    aria-label={w.code}
                  />
                  <span className="w-20 shrink-0 font-medium">{w.code}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {w.name || '—'}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                    {whole(w.items)} SKU{w.items === 1 ? '' : 's'}
                  </span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                    {decimal(w.tons, 2)} t
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ticked.size === 0 && warehouses.length > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Nothing ticked counts every warehouse.
        </p>
      )}
      {save.isError && (
        <p className="text-sm text-destructive">
          {getErrorMessage(save.error, 'The setting could not be saved.')}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={save.isPending || setting.isLoading || setting.isError}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
