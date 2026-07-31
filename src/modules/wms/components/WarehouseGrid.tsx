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

import { axisLabelAt } from '../services/layout';
import type { LocationStatus, WarehouseNamingScheme } from '../types';
import { regionRadius, regionShapeAt } from './planRegion';

export interface GridCell {
  id: string;
  column: number;
  row: number;
  code: string;
  /** Purpose colour — the single fill tint for a cell. */
  purposeColor?: string | null;
  /** Whether the cell holds stock. Non-storage cells merge into a plan area. */
  storage?: boolean;
  /** Purpose id — the merge key: adjacent non-storage cells with the same id join. */
  purposeId?: string | null;
  /** Purpose name — labelled once at each merged region's top-left. */
  purposeName?: string | null;
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
  /** Force-hide the global coordinate headers even without areas (e.g. the
   * full-grid view, where cells show area-relative codes the axes can't match). */
  hideHeaders?: boolean;
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  /** Fit the whole grid into the available width (no horizontal scroll): columns
   * shrink to share the space and cells render compact. */
  fit?: boolean;
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
  hideHeaders = false,
  selectable = false,
  selectedIds,
  fit = false,
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
  // Coordinate headers are shown only when they can match the cell codes: no
  // areas (whole grid numbers from one origin) and not explicitly suppressed.
  const headersShown = !hasAreas && !hideHeaders;

  const columnLabels = useMemo(
    () => Array.from({ length: columns }, (_, c) => axisLabelAt(naming.columnStyle, c, columns, naming.columnReversed)),
    [columns, naming.columnStyle, naming.columnReversed],
  );
  const rowLabels = useMemo(
    () => Array.from({ length: rows }, (_, r) => axisLabelAt(naming.rowStyle, r, rows, naming.rowReversed)),
    [rows, naming.rowStyle, naming.rowReversed],
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

  // In fit mode columns collapse to share the width (minmax(0,…)) so the whole
  // grid stays on screen; otherwise they keep a readable minimum and scroll.
  const cellTrack = fit ? 'minmax(0, 1fr)' : 'minmax(2.75rem, 1fr)';
  const gridTemplateColumns = headersShown
    ? `auto repeat(${columns}, ${cellTrack})`
    : `repeat(${columns}, ${cellTrack})`;

  return (
    // Padding lives on the outer (non-scrolling) box so the frozen headers can
    // stick flush to the scroll edge without scrolled cells peeking above/beside
    // them. The inner box is the actual scrollport.
    <div className="rounded-md border bg-muted/20 p-3">
      <div className={fit ? 'overflow-hidden' : 'overflow-auto'}>
        {/* gap-0 so non-storage plan areas can merge seamlessly; boxes re-create
            their spacing with a small margin instead. */}
        <div className="grid gap-0" style={{ gridTemplateColumns }}>
          {/* Header row: empty corner + column labels (only when headers match) */}
        {headersShown && (
          <>
            {/* Corner: frozen on both axes so it always covers the top-left. */}
            <div className="sticky left-0 top-0 z-40 bg-background" />
            {columnLabels.map((label, c) => (
              <button
                key={`col-${c}`}
                type="button"
                disabled={!onHeaderClick}
                onClick={() => onHeaderClick?.('column', c)}
                className={cn(
                  'sticky top-0 z-30 bg-background px-1 pb-1 text-center text-xs font-semibold text-muted-foreground',
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
            showHeader={headersShown}
            row={r}
            columns={columns}
            cellByPos={cellByPos}
            originLabelById={originLabelById}
            selectable={selectable}
            selectedIds={selectedIds}
            fit={fit}
            onCellClick={onCellClick}
            onCellDoubleClick={onCellDoubleClick}
            onHeaderClick={onHeaderClick}
          />
        ))}
        </div>
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
  fit,
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
  fit?: boolean;
  onCellClick?: (cell: GridCell, shiftKey: boolean) => void;
  onCellDoubleClick?: (cell: GridCell) => void;
  onHeaderClick?: (axis: 'column' | 'row', index: number) => void;
}) {
  // Fit mode shrinks each cell so 30+ rows/columns fit without scrolling.
  const cellHeight = fit ? 'h-6' : 'h-10';
  const regionMinHeight = fit ? 'min-h-[1.5rem]' : 'min-h-[2.5rem]';
  // Merge key for a cell: its purpose id when non-storage (so adjacent cells of
  // the same purpose join into one plan area), else null (stands alone).
  const mergeKeyAt = (column: number, r: number): string | null => {
    const cc = cellByPos.get(`${column}:${r}`);
    if (!cc || cc.outside || cc.storage !== false) return null;
    return cc.purposeId ?? '__nostock__';
  };
  return (
    <>
      {showHeader && (
        <button
          type="button"
          disabled={!onHeaderClick}
          onClick={() => onHeaderClick?.('row', row)}
          className={cn(
            'sticky left-0 z-20 flex items-center bg-background pr-1 text-xs font-semibold text-muted-foreground',
            onHeaderClick && 'cursor-pointer rounded hover:bg-muted hover:text-foreground',
          )}
        >
          {rowLabel}
        </button>
      )}
      {Array.from({ length: columns }, (_, c) => {
        const cell = cellByPos.get(`${c}:${row}`);
        if (!cell) {
          return <div key={`empty-${c}-${row}`} className={cn('m-0.5 rounded-sm border border-dashed border-border/50', cellHeight)} />;
        }
        const selected = selectedIds?.has(cell.id) ?? false;

        // Non-storage cells render edge-to-edge; contiguous same-purpose cells
        // merge into one solid, named plan area (paths, gates, cabins…).
        if (!cell.outside && cell.storage === false) {
          const shape = regionShapeAt(mergeKeyAt, c, row);
          const color = cell.purposeColor ?? '#94a3b8';
          const regionStyle: CSSProperties = {
            backgroundColor: color,
            borderRadius: regionRadius(shape.edges),
          };
          if (!selected) {
            // Outline ONLY the region's outer edges so the interior stays fully
            // seamless (no striping between merged cells); a faint highlight on
            // the top edge adds a crisp lift.
            const line = 'rgba(15,23,42,0.22)';
            const shadows: string[] = [];
            if (shape.edges.top) shadows.push('inset 0 1px 0 0 rgba(255,255,255,0.2)', `inset 0 1.5px 0 0 ${line}`);
            if (shape.edges.bottom) shadows.push(`inset 0 -1.5px 0 0 ${line}`);
            if (shape.edges.left) shadows.push(`inset 1.5px 0 0 0 ${line}`);
            if (shape.edges.right) shadows.push(`inset -1.5px 0 0 0 ${line}`);
            if (shadows.length) regionStyle.boxShadow = shadows.join(', ');
          }
          return (
            <button
              key={cell.id}
              type="button"
              title={cell.purposeName ?? 'Non-storage area'}
              disabled={!selectable}
              onClick={(event) => onCellClick?.(cell, event.shiftKey)}
              onDoubleClick={() => onCellDoubleClick?.(cell)}
              style={regionStyle}
              className={cn(
                // min-height (not fixed h-10) so the cell stretches to fill the
                // row — otherwise the boxes' margin makes rows taller and the
                // region shows horizontal gaps between its cells.
                'relative flex items-center justify-center overflow-visible px-0.5 transition',
                regionMinHeight,
                selectable && 'cursor-pointer hover:brightness-[1.06]',
                selected && 'z-10 ring-2 ring-primary ring-offset-1',
                cell.enabled === false && 'opacity-60',
              )}
            >
              {shape.labelHere && cell.purposeName ? (
                <span
                  className={cn(
                    'pointer-events-none absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-white shadow-sm',
                    // A wide (horizontal) region lets its label run across it; a
                    // narrow one keeps the label clipped so it can't spill over.
                    shape.edges.right ? 'max-w-[calc(100%-0.5rem)] truncate' : 'whitespace-nowrap',
                  )}
                >
                  {cell.purposeName}
                </span>
              ) : null}
            </button>
          );
        }

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
              'relative m-0.5 flex items-center justify-center overflow-hidden rounded-md border bg-background px-0.5 font-medium leading-none shadow-sm transition',
              cellHeight,
              fit ? 'text-[8px]' : 'text-[10px]',
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
