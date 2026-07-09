/**
 * Colour-coded warehouse map grid (Step 5).
 *
 * Display-only mirror of the physical layout: column letters across the top, row
 * labels down the side, each cell filled by its display-status colour with a
 * small occupancy bar. Hover shows a tooltip; click opens the detail panel;
 * search matches get a ring; filtered-out cells dim. A responsive card/list
 * fallback for narrow screens lives in the page, not here.
 */
import { useMemo } from 'react';

import { cn } from '@/shared/utils';

import { axisLabel } from '../services/layout';
import type { WarehouseNamingScheme } from '../types';
import { regionRadius, regionShapeAt } from './planRegion';

export interface MapCell {
  id: string;
  column: number;
  row: number;
  code: string;
  color: string;
  hatch?: boolean;
  occupancyPct: number;
  /** Whether the cell holds stock. Non-storage cells merge into a plan area. */
  storage?: boolean;
  /** Purpose id — merge key for joining adjacent non-storage cells. */
  purposeId?: string | null;
  /** Purpose name — labelled once at each merged region's top-left. */
  purposeName?: string | null;
  highlighted?: boolean;
  dimmed?: boolean;
  tooltip?: string;
  /** Move mode: a recommended putaway destination (shows a star + ring). */
  suggested?: boolean;
  /** Move mode: where the pallet being moved currently sits. */
  current?: boolean;
}

const HATCH =
  'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 4px, transparent 4px 8px)';

/** A rectangular area, used only to hide the (mismatched) global headers and
 * mark where each area's independent A-01 numbering begins. */
export interface MapArea {
  name: string;
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
}

interface WarehouseMapGridProps {
  columns: number;
  rows: number;
  naming: WarehouseNamingScheme;
  cells: MapCell[];
  areas?: MapArea[];
  onCellClick?: (id: string) => void;
}

export function WarehouseMapGrid({
  columns,
  rows,
  naming,
  cells,
  areas = [],
  onCellClick,
}: WarehouseMapGridProps) {
  const cellByPos = useMemo(() => {
    const map = new Map<string, MapCell>();
    for (const cell of cells) map.set(`${cell.column}:${cell.row}`, cell);
    return map;
  }, [cells]);

  const columnLabels = useMemo(
    () => Array.from({ length: columns }, (_, c) => axisLabel(naming.columnStyle, c, columns)),
    [columns, naming.columnStyle],
  );
  const rowLabels = useMemo(
    () => Array.from({ length: rows }, (_, r) => axisLabel(naming.rowStyle, r, rows)),
    [rows, naming.rowStyle],
  );

  // Each area numbers independently from its own top-left corner, so a single
  // set of grid-wide headers can never match every area's codes. When areas
  // exist we hide those headers and instead badge each area's A-01 origin —
  // the actual top-left *named* cell of the area (skipping disabled/outside
  // cells, which carry no code).
  const hasAreas = areas.length > 0;
  const originLabelById = useMemo(() => {
    const map = new Map<string, string>();
    if (!hasAreas) return map;
    for (const area of areas) {
      let origin: MapCell | undefined;
      for (const cell of cells) {
        if (!cell.code) continue;
        if (
          cell.column < area.startColumn ||
          cell.column > area.endColumn ||
          cell.row < area.startRow ||
          cell.row > area.endRow
        )
          continue;
        if (
          !origin ||
          cell.row < origin.row ||
          (cell.row === origin.row && cell.column < origin.column)
        )
          origin = cell;
      }
      if (origin) map.set(origin.id, area.name || 'Area');
    }
    return map;
  }, [areas, cells, hasAreas]);

  const gridTemplateColumns = hasAreas
    ? `repeat(${columns}, minmax(3rem, 1fr))`
    : `auto repeat(${columns}, minmax(3rem, 1fr))`;

  // Merge key for a cell: its purpose id when non-storage (so adjacent cells of
  // the same purpose join into one plan area), else null (stands alone).
  const mergeKeyAt = (column: number, r: number): string | null => {
    const cc = cellByPos.get(`${column}:${r}`);
    if (!cc || cc.storage !== false) return null;
    return cc.purposeId ?? '__nostock__';
  };

  return (
    <div className="overflow-auto rounded-md border bg-muted/20 p-3">
      {/* gap-0 so non-storage plan areas merge seamlessly; boxes re-create their
          spacing with a small margin instead. */}
      <div className="grid gap-0" style={{ gridTemplateColumns }}>
        {!hasAreas && (
          <>
            <div />
            {columnLabels.map((label, c) => (
              <div
                key={`col-${c}`}
                className="mx-0.5 px-1 text-center text-xs font-semibold text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </>
        )}

        {rowLabels.map((rowLabel, r) => (
          <div key={`row-${r}`} className="contents">
            {!hasAreas && (
              <div className="my-0.5 flex items-center pr-1 text-xs font-semibold text-muted-foreground">
                {rowLabel}
              </div>
            )}
            {Array.from({ length: columns }, (_, c) => {
              const cell = cellByPos.get(`${c}:${r}`);
              if (!cell) {
                return (
                  <div key={`empty-${c}-${r}`} className="m-0.5 h-12 rounded-sm border border-dashed border-border/40" />
                );
              }

              // Non-storage cells render edge-to-edge; contiguous same-purpose
              // cells merge into one solid, named plan area.
              if (cell.storage === false) {
                const shape = regionShapeAt(mergeKeyAt, c, r);
                // A soft inset outline only on the region's outer edges keeps the
                // interior seamless; a faint inner highlight adds a crisp lift.
                const line = 'rgba(15,23,42,0.24)';
                const shadows: string[] = ['inset 0 1px 0 0 rgba(255,255,255,0.18)'];
                if (shape.edges.top) shadows.push(`inset 0 1.5px 0 0 ${line}`);
                if (shape.edges.bottom) shadows.push(`inset 0 -1.5px 0 0 ${line}`);
                if (shape.edges.left) shadows.push(`inset 1.5px 0 0 0 ${line}`);
                if (shape.edges.right) shadows.push(`inset -1.5px 0 0 0 ${line}`);
                return (
                  <button
                    key={cell.id}
                    type="button"
                    title={cell.tooltip ?? cell.purposeName ?? 'Non-storage area'}
                    onClick={() => onCellClick?.(cell.id)}
                    style={{
                      backgroundColor: cell.color,
                      backgroundImage: cell.hatch ? HATCH : undefined,
                      borderRadius: regionRadius(shape.edges),
                      boxShadow: shadows.join(', '),
                    }}
                    className={cn(
                      'relative flex h-12 items-center justify-center overflow-visible px-0.5 transition',
                      'hover:brightness-[1.06]',
                      cell.dimmed && 'opacity-25',
                    )}
                  >
                    {shape.labelHere && cell.purposeName ? (
                      <span
                        className={cn(
                          'pointer-events-none absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-white shadow-sm',
                          // Wide regions let the label run across; narrow ones clip it.
                          shape.edges.right ? 'max-w-[calc(100%-0.5rem)] truncate' : 'whitespace-nowrap',
                        )}
                      >
                        {cell.purposeName}
                      </span>
                    ) : null}
                  </button>
                );
              }

              const fill = Math.max(0, Math.min(100, cell.occupancyPct));
              return (
                <button
                  key={cell.id}
                  type="button"
                  title={cell.tooltip ?? cell.code}
                  onClick={() => onCellClick?.(cell.id)}
                  style={{
                    backgroundColor: cell.color,
                    backgroundImage: cell.hatch ? HATCH : undefined,
                  }}
                  className={cn(
                    'relative m-0.5 flex h-12 flex-col items-center justify-center overflow-hidden rounded-md border border-black/10 px-0.5 text-[10px] font-semibold leading-none text-white/95 shadow-sm transition',
                    'hover:ring-2 hover:ring-foreground/40',
                    cell.highlighted && 'ring-2 ring-foreground ring-offset-1',
                    cell.suggested && 'ring-2 ring-emerald-500 ring-offset-1',
                    cell.current && 'outline outline-2 outline-dashed outline-sky-400',
                    cell.dimmed && 'opacity-25',
                  )}
                >
                  {cell.suggested ? (
                    <span className="absolute right-0.5 top-0.5 text-[9px] leading-none text-emerald-50 drop-shadow">
                      ★
                    </span>
                  ) : null}
                  {cell.current ? (
                    <span className="absolute left-0.5 top-0.5 rounded-sm bg-sky-500/90 px-0.5 text-[7px] font-bold leading-tight text-white">
                      HERE
                    </span>
                  ) : originLabelById.has(cell.id) ? (
                    <span
                      className="absolute left-0.5 top-0.5 max-w-[92%] truncate rounded-sm bg-black/55 px-0.5 text-[7px] font-bold uppercase leading-tight text-white"
                      title={`${originLabelById.get(cell.id)} — numbering starts here (A-01)`}
                    >
                      ⌜ {originLabelById.get(cell.id)}
                    </span>
                  ) : null}
                  <span className="truncate drop-shadow-sm">{cell.code}</span>
                  <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20">
                    <span className="block h-full bg-white/70" style={{ width: `${fill}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
