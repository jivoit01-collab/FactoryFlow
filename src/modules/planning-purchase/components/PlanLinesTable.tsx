import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PlanLine } from '../types';
import { percent, qty } from './format';

type SortKey = 'planned' | 'attainment' | 'code';

/**
 * The plan line by line, with what SAP says was actually produced against it.
 *
 * Plan and actual are both in the item's inventory unit (PCS for nearly every
 * SKU — single bottles, not cases), so the comparison needs no conversion. Cases
 * are shown alongside because that is what the floor counts in.
 */
export function PlanLinesTable({ lines }: { lines: PlanLine[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('planned');

  const rows = useMemo(() => {
    const token = search.trim().toLowerCase();
    const filtered = token
      ? lines.filter(
          (line) =>
            line.item_code.toLowerCase().includes(token) ||
            line.item_name.toLowerCase().includes(token),
        )
      : lines;

    const sorted = [...filtered];
    if (sortKey === 'planned') {
      sorted.sort((a, b) => Number(b.planned_qty) - Number(a.planned_qty));
    } else if (sortKey === 'attainment') {
      sorted.sort((a, b) => Number(a.attainment_pct) - Number(b.attainment_pct));
    } else {
      sorted.sort((a, b) => a.item_code.localeCompare(b.item_code));
    }
    return sorted;
  }, [lines, search, sortKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search SKU code or name"
          className="h-9 max-w-xs"
        />
        <div className="flex items-center gap-1 text-xs">
          {(
            [
              { key: 'planned', label: 'Largest plan' },
              { key: 'attainment', label: 'Furthest behind' },
              { key: 'code', label: 'Code' },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortKey(option.key)}
              className={cn(
                'rounded border px-2 py-1 transition-colors',
                sortKey === option.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} of {lines.length} SKUs
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-right font-medium">Planned</th>
              <th className="px-3 py-2 text-right font-medium">Cases</th>
              <th className="px-3 py-2 text-right font-medium">Produced</th>
              <th className="px-3 py-2 text-right font-medium">Variance</th>
              <th className="px-3 py-2 text-right font-medium">Attainment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const attainment = Number(line.attainment_pct);
              const variance = Number(line.variance_qty);
              return (
                <tr key={`${line.item_code}-${line.line_id}`} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{line.item_code}</span>
                      {!line.has_bom ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                          title="No production BOM in SAP — its materials cannot be exploded, so nothing is bought for it."
                        >
                          <AlertTriangle className="h-3 w-3" />
                          No BOM
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {line.item_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {qty(line.planned_qty)}
                    <span className="ml-1 text-[10px] text-muted-foreground">{line.uom}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {qty(line.planned_cases)}
                    <span className="ml-1 text-[10px]">@{line.pieces_per_case}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {qty(line.produced_qty)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono tabular-nums',
                      variance < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {variance > 0 ? '+' : ''}
                    {qty(variance)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        'font-mono text-xs font-semibold tabular-nums',
                        attainment >= 95
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : attainment >= 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-destructive',
                      )}
                    >
                      {percent(line.attainment_pct)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No SKUs match that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Produced comes from SAP goods receipts against production (OINM movement type
        59), in the same unit as the plan. It is what SAP and finance agree happened,
        not what was typed into a run sheet.
      </p>
    </div>
  );
}
