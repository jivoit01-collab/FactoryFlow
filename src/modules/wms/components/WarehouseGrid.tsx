/**
 * Renders one level of a warehouse as a labelled grid (Step 3).
 *
 * Used read-only for the designer's live preview and interactively in the
 * editor, where cells can be selected (click to toggle, shift-click for a
 * rectangular range) to apply bulk changes or group them into a zone. Cells are
 * tinted by their zone colour; the live occupancy colouring arrives in Step 5.
 *
 * Numbering: each cell carries its own code. When areas are defined every area
 * numbers independently from its own A-01 corner, so a single shared header
 * axis can never match them all (two side-by-side areas disagree on every row).
 * We therefore hide the global headers in that case, outline each area, and
 * badge each area's A-01 origin with its name. With no areas the whole grid
 * numbers from one origin, so the global headers do match and are shown.
 */
import { type CSSProperties, useMemo } from 'react';

import { cn } from '@/shared/utils';

import { axisLabel } from '../services/layout';
import type { LocationStatus, WarehouseNamingScheme } from '../types';

export interface GridCell {
  id: string;
  column: number;
  row: number;
  code: string;
  /** Purpose colour — the single fill tint for a cell. */
  purposeColor?: string | null;
  /** Area colour, drawn as an outline (not a fill) on the region's edges. */
  areaColor?: string | null;
  /** Which sides of this cell sit on its area's boundary (for the outline). */
  areaEdges?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  /** Whether the cell falls outside every numbered area (rendered muted). */
  outside?: boolean;
  enabled?: boolean;
  status?: LocationStatus;
}

/** A rectangular area. When any are supplied, global headers are hidden and each
 * area's A-01 origin is badged with its name (see file header). */
export interface GridArea {
  name?: string;
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
}

interface WarehouseGridProps {
  columns: number;
  rows: number;
  naming: WarehouseNamingScheme;
  cells: GridCell[];
  /** When non-empty, global headers are hidden and area origins are badged. */
  areas?: GridArea[];
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onCellClick?: (cell: GridCell, shiftKey: boolean) => void;
  /** Double-click a cell (e.g. to open its property editor). */
  onCellDoubleClick?: (cell: GridCell) => void;
  /** Click a column/row header to act on the whole axis (e.g. select it).
   * Only wired when the global headers are shown (i.e. no areas). */
  onHeaderClick?: (axis: 'column' | 'row', index: number) => void;
}

export function WarehouseGrid({
  columns,
  rows,
  naming,
  cells,
  areas = [],
  selectable = false,
  selectedIds,
  onCellClick,
  onCellDoubleClick,
  onHeaderClick,
}: WarehouseGridProps) {
  const cellByPos = useMemo(() => {
    const map = new Map<string, GridCell>();
    for (const cell of cells) map.set(`${cell.column}:${cell.row}`, cell);
    return map;
  }, [cells]);

  const hasAreas = areas.length > 0;

  const columnLabels = useMemo(
    () => Array.from({ length: columns }, (_, c) => axisLabel(naming.columnStyle, c, columns)),
    [columns, naming.columnStyle],
  );
  const rowLabels = useMemo(
    () => Array.from({ length: rows }, (_, r) => axisLabel(naming.rowStyle, r, rows)),
    [rows, naming.rowStyle],
  );

  // The A-01 origin of each area = its top-left *named* cell (skipping
  // disabled/outside cells, which carry no code). Badged with the area name.
  const originLabelById = useMemo(() => {
    const map = new Map<string, string>();
    if (!hasAreas) return map;
    for (const area of areas) {
      let origin: GridCell | undefined;
      for (const cell of cells) {
        if (cell.outside || !cell.code) continue;
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
    ? `repeat(${columns}, minmax(2.75rem, 1fr))`
    : `auto repeat(${columns}, minmax(2.75rem, 1fr))`;

  return (
    <div className="overflow-auto rounded-md border bg-muted/20 p-3">
      <div className="grid gap-1" style={{ gridTemplateColumns }}>
        {/* Header row: empty corner + column labels (only when headers match) */}
        {!hasAreas && (
          <>
            <div />
            {columnLabels.map((label, c) => (
              <button
                key={`col-${c}`}
                type="button"
                disabled={!onHeaderClick}
                onClick={() => onHeaderClick?.('column', c)}
                className={cn(
                  'px-1 text-center text-xs font-semibold text-muted-foreground',
                  onHeaderClick && 'cursor-pointer rounded hover:bg-muted hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </>
        )}

        {/* Body rows */}
        {rowLabels.map((rowLabel, r) => (
          <Row
            key={`row-${r}`}
            rowLabel={rowLabel}
            showHeader={!hasAreas}
            row={r}
            columns={columns}
            cellByPos={cellByPos}
            originLabelById={originLabelById}
            selectable={selectable}
            selectedIds={selectedIds}
            onCellClick={onCellClick}
            onCellDoubleClick={onCellDoubleClick}
            onHeaderClick={onHeaderClick}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  rowLabel,
  showHeader,
  row,
  columns,
  cellByPos,
  originLabelById,
  selectable,
  selectedIds,
  onCellClick,
  onCellDoubleClick,
  onHeaderClick,
}: {
  rowLabel: string;
  showHeader: boolean;
  row: number;
  columns: number;
  cellByPos: Map<string, GridCell>;
  originLabelById: Map<string, string>;
  selectable: boolean;
  selectedIds?: ReadonlySet<string>;
  onCellClick?: (cell: GridCell, shiftKey: boolean) => void;
  onCellDoubleClick?: (cell: GridCell) => void;
  onHeaderClick?: (axis: 'column' | 'row', index: number) => void;
}) {
  return (
    <>
      {showHeader && (
        <button
          type="button"
          disabled={!onHeaderClick}
          onClick={() => onHeaderClick?.('row', row)}
          className={cn(
            'flex items-center pr-1 text-xs font-semibold text-muted-foreground',
            onHeaderClick && 'cursor-pointer rounded hover:bg-muted hover:text-foreground',
          )}
        >
          {rowLabel}
        </button>
      )}
      {Array.from({ length: columns }, (_, c) => {
        const cell = cellByPos.get(`${c}:${row}`);
        if (!cell) {
          return <div key={`empty-${c}-${row}`} className="h-10 rounded-sm border border-dashed border-border/50" />;
        }
        const selected = selectedIds?.has(cell.id) ?? false;
        const disabled = cell.enabled === false || cell.status === 'BLOCKED' || cell.status === 'DAMAGED';
        const originName = originLabelById.get(cell.id);
        const fill = cell.outside ? null : cell.purposeColor;
        const style: CSSProperties = {};
        if (fill) {
          style.backgroundColor = `${fill}55`;
          style.borderColor = fill;
        }
        // Draw the area boundary as an inset outline. Skipped when the cell is
        // selected so the selection ring stays visible (both use box-shadow).
        if (!selected && !cell.outside && cell.areaColor && cell.areaEdges) {
          const { top, right, bottom, left } = cell.areaEdges;
          const c = cell.areaColor;
          const shadows: string[] = [];
          if (top) shadows.push(`inset 0 2px 0 0 ${c}`);
          if (bottom) shadows.push(`inset 0 -2px 0 0 ${c}`);
          if (left) shadows.push(`inset 2px 0 0 0 ${c}`);
          if (right) shadows.push(`inset -2px 0 0 0 ${c}`);
          if (shadows.length) style.boxShadow = shadows.join(', ');
        }
        return (
          <button
            key={cell.id}
            type="button"
            title={
              cell.outside
                ? 'Outside the warehouse area'
                : originName
                  ? `${cell.code} · ${originName} — numbering starts here (A-01)`
                  : cell.code
            }
            disabled={!selectable}
            onClick={(event) => onCellClick?.(cell, event.shiftKey)}
            onDoubleClick={() => onCellDoubleClick?.(cell)}
            style={Object.keys(style).length ? style : undefined}
            className={cn(
              'relative flex h-10 items-center justify-center overflow-hidden rounded-sm border bg-background px-0.5 text-[10px] font-medium leading-none transition',
              selectable && 'cursor-pointer hover:ring-1 hover:ring-ring',
              selected && 'ring-2 ring-primary ring-offset-1',
              disabled && 'bg-muted text-muted-foreground line-through opacity-60',
              cell.outside && 'border-dashed bg-muted/40 text-muted-foreground/40',
            )}
          >
            {originName ? (
              <span className="absolute left-0.5 top-0.5 max-w-[92%] truncate rounded-sm bg-foreground/70 px-0.5 text-[7px] font-bold uppercase leading-tight text-background">
                ⌜ {originName}
              </span>
            ) : null}
            <span className="truncate">{cell.outside ? '·' : cell.code}</span>
          </button>
        );
      })}
    </>
  );
}
