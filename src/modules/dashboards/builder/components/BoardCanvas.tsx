import { GripVertical, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/shared/utils';

import { DRAG_TYPE } from '../constants';
import type { BoardAccent, BoardDensity, BoardSurface, CardSpec, Placement } from '../types';
import { cellsOf, fits, footprintOf, occupancy } from '../utils';
import { CardFace } from './CardFace';

/**
 * The grid an author arranges, and the only place a card is ever moved.
 *
 * WHY NATIVE HTML5 DRAG AND DROP AND NOT A LIBRARY
 * The interaction here is small: pick a card up, drop it on a cell, snap. No
 * free positioning, no resize handles, no collision animation — the grid is
 * bounded and every footprint is fixed, so the hard parts a drag library
 * exists to solve are designed out rather than solved. Against that,
 * `node_modules` in this project is shared live with every other worktree, so
 * an install lands on colleagues mid-test-run. A dependency that earns its
 * place is worth that; one saving forty lines is not.
 *
 * WHAT THE GRID IS
 * `repeat(n, minmax(0, 1fr))` in both axes, with a zero floor on every track
 * for the reason `ops-board.css` spells out at length: a bare `1fr` is
 * `minmax(auto, 1fr)`, so its floor is its own content, and one card holding
 * something that cannot wrap grows its track and pushes the board past the
 * screen. On a wall board that is how the bottom row ends up off the display.
 *
 * EMPTY CELLS ARE REAL ELEMENTS
 * Every free cell is rendered as its own drop target rather than the drop
 * being computed from pointer coordinates against the container's box.
 * Coordinate maths has to re-derive the track sizes the browser already knows,
 * and gets them wrong the moment a gap, a border or a scrollbar changes.
 */

export interface BoardCanvasProps {
  placements: Placement[];
  catalogue: Map<string, CardSpec>;
  columns: number;
  rows: number;
  surface: BoardSurface;
  density: BoardDensity;
  /** The board's default hue, for a card that has not been given its own. */
  accent: BoardAccent;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onMove: (index: number, at: { column: number; row: number }) => void;
  onDropNew: (cardKey: string, at: { column: number; row: number }) => void;
  onRemove: (index: number) => void;
}

interface DragPayload {
  kind: 'new' | 'move';
  cardKey?: string;
  index?: number;
}

function readDrag(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_TYPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

export function BoardCanvas({
  placements,
  catalogue,
  columns,
  rows,
  surface,
  density,
  accent,
  selectedIndex,
  onSelect,
  onMove,
  onDropNew,
  onRemove,
}: BoardCanvasProps) {
  /**
   * What is being dragged right now.
   *
   * Held in state rather than read from `dataTransfer` during `dragover`,
   * because the drag data is deliberately unreadable there in most browsers —
   * only the TYPE is exposed until the drop. Without this the canvas could
   * not tell whether a hovered cell would accept the card, which is the whole
   * of the feedback an author gets while dragging.
   */
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [hover, setHover] = useState<{ column: number; row: number } | null>(null);

  const taken = useMemo(
    () => occupancy(placements, catalogue, dragging?.kind === 'move' ? dragging.index : -1),
    [placements, catalogue, dragging],
  );

  const draggedFootprint = useMemo(() => {
    if (!dragging) return null;
    const key =
      dragging.kind === 'new'
        ? dragging.cardKey
        : placements[dragging.index ?? -1]?.card_key;
    return key ? footprintOf(key, catalogue) : null;
  }, [dragging, placements, catalogue]);

  /** The cells a drop at `hover` would cover, for the preview outline. */
  const previewCells = useMemo(() => {
    if (!hover || !draggedFootprint) return new Set<string>();
    return new Set(cellsOf(hover, draggedFootprint));
  }, [hover, draggedFootprint]);

  const wouldFit =
    hover && draggedFootprint
      ? fits(hover, draggedFootprint, { columns, rows }, taken)
      : false;

  const endDrag = () => {
    setDragging(null);
    setHover(null);
  };

  const handleDrop = (event: React.DragEvent, at: { column: number; row: number }) => {
    event.preventDefault();
    const payload = readDrag(event) ?? dragging;
    endDrag();
    if (!payload) return;

    const key =
      payload.kind === 'new' ? payload.cardKey : placements[payload.index ?? -1]?.card_key;
    if (!key) return;

    const footprint = footprintOf(key, catalogue);
    const without = occupancy(
      placements,
      catalogue,
      payload.kind === 'move' ? payload.index : -1,
    );
    // Refused rather than nudged to the nearest free spot. A card that lands
    // somewhere the author did not aim is worse than one that does not land:
    // on a board being arranged deliberately, "it moved somewhere" is a
    // change they then have to find and undo.
    if (!fits(at, footprint, { columns, rows }, without)) return;

    if (payload.kind === 'new' && payload.cardKey) onDropNew(payload.cardKey, at);
    if (payload.kind === 'move' && payload.index !== undefined) onMove(payload.index, at);
  };

  /**
   * The free cells, as drop targets.
   *
   * Built with `Array.from` rather than a pair of counting loops: the lint
   * rule that forbids mutating a value used in JSX is right here, and the
   * declarative version is also the one that reads as "every cell of the
   * grid, minus the occupied ones".
   */
  const cells = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const key = `${column},${row}`;
      const occupiedByOther =
        taken.has(key) &&
        !(dragging?.kind === 'move' && taken.get(key) === dragging.index);
      if (occupiedByOther) return null;

      const inPreview = previewCells.has(key);
      return (
        <div
          key={`cell-${key}`}
          className={cn('cbx-slot', inPreview && (wouldFit ? 'cbx-slot-ok' : 'cbx-slot-no'))}
          style={{ gridColumn: column + 1, gridRow: row + 1 }}
          onDragEnter={() => setHover({ column, row })}
          onDragOver={(event) => {
            // Preventing the default is what makes an element a drop target
            // at all. Done for every cell, valid or not, so an invalid one
            // can show WHY rather than silently refusing the cursor.
            if (event.dataTransfer.types.includes(DRAG_TYPE)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = wouldFit ? 'move' : 'none';
            }
          }}
          onDrop={(event) => handleDrop(event, { column, row })}
        />
      );
    }),
  ).flat();

  return (
    <div
      /*
       * `ops-board` is what makes a tile in here look like a tile.
       *
       * It is not decoration: that class is the scoped ROOT of the shared
       * stylesheet, defining `--u` (every size on a card is a multiple of
       * it), the `--r-head`/`--r-sub`/`--r-value` row heights `.ops-grp` lays
       * itself out with, and the ink and condition colours. Without it every
       * card here collapses to a row of unstyled text while looking, in the
       * CSS, as though it should work. The viewer gets it from its own root;
       * the editor has to put it on the canvas.
       */
      className={cn('ops-board cbx-canvas', `cbx-s-${surface}`, `cbx-d-${density}`)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
      onDragLeave={(event) => {
        // Only when the pointer has genuinely left the canvas: `dragleave`
        // fires on every child boundary crossed, so without this the preview
        // flickers off between adjacent cells.
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setHover(null);
      }}
      onDragEnd={endDrag}
      onDrop={endDrag}
    >
      {cells}

      {placements.map((placement, index) => {
        const spec = catalogue.get(placement.card_key);
        const footprint = footprintOf(placement.card_key, catalogue);
        const isDragging = dragging?.kind === 'move' && dragging.index === index;

        return (
          <div
            key={placement.id ?? `${placement.card_key}-${index}`}
            className={cn(
              'cbx-placed',
              selectedIndex === index && 'cbx-selected',
              isDragging && 'cbx-ghost',
            )}
            style={{
              gridColumn: `${placement.column + 1} / span ${footprint.columns}`,
              gridRow: `${placement.row + 1} / span ${footprint.rows}`,
            }}
            onClick={() => onSelect(index)}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                DRAG_TYPE,
                JSON.stringify({ kind: 'move', index }),
              );
              event.dataTransfer.effectAllowed = 'move';
              setDragging({ kind: 'move', index });
            }}
            onDragEnd={endDrag}
          >
            <CardFace
              title={placement.title || spec?.title || placement.card_key}
              cardKey={placement.card_key}
              accent={(placement.accent || accent) as BoardAccent}
              /*
               * The editor shows a PLACEHOLDER, never live figures.
               *
               * Arranging a board would otherwise re-run a dozen queries on
               * every drag, against a database shared by fourteen others.
               * Preview is what the viewer is for; the editor's job is shape,
               * hue and position, all of which are visible without a number.
               */
              payload={{
                value: '—',
                unit: '',
                sub: spec?.summary ?? '',
                tag: null,
                viz: null,
                note: '',
                missing: null,
              }}
              absence={null}
            />

            <div className="cbx-card-tools">
              <span className="cbx-drag" aria-hidden>
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <button
                type="button"
                aria-label={`Remove ${placement.title || spec?.title || placement.card_key}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(index);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {placements.length === 0 && (
        <p className="cbx-canvas-empty">
          Drag a card from the left, or double-click one to drop it in the first
          free cell.
        </p>
      )}
    </div>
  );
}
