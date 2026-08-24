import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PlanLine, PlanUnit } from '../types';
import { percent, pickUnit, qtyWithUnit, toNumber,UNIT_LABEL } from './format';

type SortKey = 'planned' | 'attainment' | 'code';

/**
 * The plan line by line, with what SAP says was actually produced against it.
 *
 * Plan and actual are both in the item's inventory unit (PCS for nearly every
 * SKU — single bottles, not cases), so the comparison needs no conversion. Cases
 * are shown alongside because that is what the floor counts in.
 */
export function PlanLinesTable({ lines, unit }: { lines: PlanLine[]; unit: PlanUnit }) {
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

    const plannedIn = (line: PlanLine) =>
      toNumber(
        pickUnit(
          { pieces: line.planned_qty, litres: line.planned_litres, cases: line.planned_cases },
          unit,
        ),
      );

    const sorted = [...filtered];
    if (sortKey === 'planned') {
      sorted.sort((a, b) => plannedIn(b) - plannedIn(a));
    } else if (sortKey === 'attainment') {
      sorted.sort((a, b) => Number(a.attainment_pct) - Number(b.attainment_pct));
    } else {
      sorted.sort((a, b) => a.item_code.localeCompare(b.item_code));
    }
    return sorted;
  }, [lines, search, sortKey, unit]);

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
              <th className="px-3 py-2 text-right font-medium">
                Planned ({UNIT_LABEL[unit]})
              </th>
              <th className="px-3 py-2 text-right font-medium">Per piece</th>
              <th className="px-3 py-2 text-right font-medium">
                Produced ({UNIT_LABEL[unit]})
              </th>
              <th className="px-3 py-2 text-right font-medium">Variance</th>
              <th className="px-3 py-2 text-right font-medium">Attainment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const attainment = Number(line.attainment_pct);
              const planned = toNumber(
                pickUnit(
                  {
                    pieces: line.planned_qty,
                    litres: line.planned_litres,
                    cases: line.planned_cases,
                  },
                  unit,
                ),
              );
              const produced = toNumber(
                pickUnit(
                  {
                    pieces: line.produced_qty,
                    litres: line.produced_litres,
                    cases: line.produced_cases,
                  },
                  unit,
                ),
              );
              const variance = produced - planned;
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
                    {qtyWithUnit(planned, unit)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {/* The conversion factor behind the number in this row, so a
                        litre figure can be checked against the SKU it came from. */}
                    {unit === 'LITRES' ? (
                      line.is_litre_item ? (
                        `${line.litres_per_unit} Ltr`
                      ) : (
                        <span
                          className="text-amber-600 dark:text-amber-400"
                          title="SAP does not flag this item as a litre item (U_IsLitre), so it contributes nothing to a litre total."
                        >
                          not litre
                        </span>
                      )
                    ) : unit === 'CASES' ? (
                      `${line.pieces_per_case} Pcs`
                    ) : (
                      '1 Pcs'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {qtyWithUnit(produced, unit)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono tabular-nums',
                      variance < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {variance > 0 ? '+' : ''}
                    {qtyWithUnit(variance, unit)}
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
