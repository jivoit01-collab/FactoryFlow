/**
 * Renders one level of a warehouse as a labelled grid (Step 3).
 *
 * Used read-only for the designer's live preview and interactively in the
 * editor, where cells can be selected (click to toggle, shift-click for a
 * rectangular range) to apply bulk changes or group them into a zone. Cells are
 * tinted by their zone colour; the live occupancy colouring arrives in Step 5.
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

interface WarehouseGridProps {
  columns: number;
  rows: number;
  naming: WarehouseNamingScheme;
  cells: GridCell[];
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onCellClick?: (cell: GridCell, shiftKey: boolean) => void;
  /** Double-click a cell (e.g. to open its property editor). */
  onCellDoubleClick?: (cell: GridCell) => void;
  /** Click a column/row header to act on the whole axis (e.g. select it). */
  onHeaderClick?: (axis: 'column' | 'row', index: number) => void;
}

export function WarehouseGrid({
  columns,
  rows,
  naming,
  cells,
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

  const columnLabels = useMemo(
    () => Array.from({ length: columns }, (_, c) => axisLabel(naming.columnStyle, c, columns)),
    [columns, naming.columnStyle],
  );
  const rowLabels = useMemo(
    () => Array.from({ length: rows }, (_, r) => axisLabel(naming.rowStyle, r, rows)),
    [rows, naming.rowStyle],
  );

  return (
    <div className="overflow-auto rounded-md border bg-muted/20 p-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${columns}, minmax(2.75rem, 1fr))` }}
      >
        {/* Header row: empty corner + column labels */}
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

        {/* Body rows */}
        {rowLabels.map((rowLabel, r) => (
          <Row
            key={`row-${r}`}
            rowLabel={rowLabel}
            row={r}
            columns={columns}
            cellByPos={cellByPos}
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
  row,
  columns,
  cellByPos,
  selectable,
  selectedIds,
  onCellClick,
  onCellDoubleClick,
  onHeaderClick,
}: {
  rowLabel: string;
  row: number;
  columns: number;
  cellByPos: Map<string, GridCell>;
  selectable: boolean;
  selectedIds?: ReadonlySet<string>;
  onCellClick?: (cell: GridCell, shiftKey: boolean) => void;
  onCellDoubleClick?: (cell: GridCell) => void;
  onHeaderClick?: (axis: 'column' | 'row', index: number) => void;
}) {
  return (
    <>
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
      {Array.from({ length: columns }, (_, c) => {
        const cell = cellByPos.get(`${c}:${row}`);
        if (!cell) {
          return <div key={`empty-${c}-${row}`} className="h-10 rounded-sm border border-dashed border-border/50" />;
        }
        const selected = selectedIds?.has(cell.id) ?? false;
        const disabled = cell.enabled === false || cell.status === 'BLOCKED' || cell.status === 'DAMAGED';
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
            title={cell.outside ? 'Outside the warehouse area' : cell.code}
            disabled={!selectable}
            onClick={(event) => onCellClick?.(cell, event.shiftKey)}
            onDoubleClick={() => onCellDoubleClick?.(cell)}
            style={Object.keys(style).length ? style : undefined}
            className={cn(
              'flex h-10 items-center justify-center overflow-hidden rounded-sm border bg-background px-0.5 text-[10px] font-medium leading-none transition',
              selectable && 'cursor-pointer hover:ring-1 hover:ring-ring',
              selected && 'ring-2 ring-primary ring-offset-1',
              disabled && 'bg-muted text-muted-foreground line-through opacity-60',
              cell.outside && 'border-dashed bg-muted/40 text-muted-foreground/40',
            )}
          >
            <span className="truncate">{cell.outside ? '·' : cell.code}</span>
          </button>
        );
      })}
    </>
  );
}
