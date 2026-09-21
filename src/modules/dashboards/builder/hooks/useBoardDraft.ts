import { useCallback, useMemo, useState } from 'react';

import type { BoardDetail, BoardDraft, CardSpec, Placement } from '../types';
import { firstFreeCell, footprintOf, occupancy, partitionByFit } from '../utils';

/**
 * The board being arranged, held locally until it is saved.
 *
 * WHY THE EDITOR IS NOT LIVE
 * Every change here is local. Nothing reaches the server until the author
 * presses Save. Two reasons, and the second is the one that decided it:
 *
 * 1. A drag is rarely one change — moving a card past its neighbour is a
 *    sequence of positions, most of them arrangements nobody wants saved.
 * 2. The server validates the WHOLE layout and rejects overlaps outright, so
 *    an autosaving editor would have to either send invalid intermediate
 *    states or serialise its requests behind the pointer. Holding a draft and
 *    sending one finished arrangement avoids both.
 *
 * The cost is an unsaved-changes state, which the page is responsible for
 * making visible.
 */

export interface UseBoardDraft {
  draft: BoardDraft;
  dirty: boolean;
  /** Cards dropped by the last shrink, so the page can say what went. */
  spilled: Placement[];
  patch: (patch: Partial<BoardDraft>) => void;
  addCard: (spec: CardSpec, at?: { column: number; row: number }) => boolean;
  moveCard: (index: number, at: { column: number; row: number }) => void;
  removeCard: (index: number) => void;
  patchCard: (index: number, patch: Partial<Placement>) => void;
  reset: (board: BoardDetail) => void;
  clearSpilled: () => void;
}

function draftFrom(board: BoardDetail): BoardDraft {
  return {
    name: board.name,
    description: board.description,
    mode: board.mode,
    columns: board.columns,
    rows: board.rows,
    surface: board.surface,
    density: board.density,
    accent: board.accent,
    show_heading: board.show_heading,
    in_carousel: board.in_carousel,
    placements: board.placements.map((placement) => ({
      ...placement,
      title: placement.title ?? '',
      accent: placement.accent ?? '',
      options: placement.options ?? {},
    })),
  };
}

export function useBoardDraft(
  initial: BoardDraft,
  catalogue: Map<string, CardSpec>,
  limits: { max_rows: Record<string, number> },
): UseBoardDraft {
  const [draft, setDraft] = useState<BoardDraft>(initial);
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initial));
  const [spilled, setSpilled] = useState<Placement[]>([]);

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline]);

  const patch = useCallback(
    (incoming: Partial<BoardDraft>) => {
      setDraft((current) => {
        const next = { ...current, ...incoming };

        // Switching to a wall board can put the current height over that
        // mode's ceiling. Clamped rather than refused: the author asked for a
        // wall board, and telling them they cannot have one until they first
        // remove two rows is a worse answer than giving them one the right
        // height and saying which cards came off.
        const ceiling = limits.max_rows[next.mode] ?? next.rows;
        if (next.rows > ceiling) next.rows = ceiling;

        // A smaller grid can orphan cards. Keep what fits, hand back what
        // does not — never silently delete, and never block the resize.
        if (next.columns < current.columns || next.rows < current.rows) {
          const { kept, dropped } = partitionByFit(next.placements, catalogue, {
            columns: next.columns,
            rows: next.rows,
          });
          if (dropped.length > 0) {
            next.placements = kept;
            setSpilled(dropped);
          }
        }
        return next;
      });
    },
    [catalogue, limits],
  );

  const addCard = useCallback(
    (spec: CardSpec, at?: { column: number; row: number }) => {
      let placed = false;
      setDraft((current) => {
        const taken = occupancy(current.placements, catalogue);
        const footprint = { columns: spec.columns, rows: spec.rows };
        const grid = { columns: current.columns, rows: current.rows };
        const cell = at ?? firstFreeCell(footprint, grid, taken);
        if (!cell) return current;

        placed = true;
        return {
          ...current,
          placements: [
            ...current.placements,
            {
              card_key: spec.key,
              card_title: spec.title,
              column: cell.column,
              row: cell.row,
              columns: spec.columns,
              rows: spec.rows,
              title: '',
              // Empty means "inherit the board's" rather than a copy of the
              // card's own default, so changing the board's colour later
              // moves every card that never asked for a different one.
              accent: '',
              options: Object.fromEntries(
                spec.options.map((option) => [option.key, option.default]),
              ),
            },
          ],
        };
      });
      return placed;
    },
    [catalogue],
  );

  const moveCard = useCallback(
    (index: number, at: { column: number; row: number }) => {
      setDraft((current) => {
        const placements = current.placements.map((placement, position) =>
          position === index ? { ...placement, ...at } : placement,
        );
        return { ...current, placements };
      });
    },
    [],
  );

  const removeCard = useCallback((index: number) => {
    setDraft((current) => ({
      ...current,
      placements: current.placements.filter((_, position) => position !== index),
    }));
  }, []);

  const patchCard = useCallback((index: number, incoming: Partial<Placement>) => {
    setDraft((current) => ({
      ...current,
      placements: current.placements.map((placement, position) =>
        position === index ? { ...placement, ...incoming } : placement,
      ),
    }));
  }, []);

  const reset = useCallback((board: BoardDetail) => {
    const next = draftFrom(board);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setSpilled([]);
  }, []);

  return {
    draft,
    dirty,
    spilled,
    patch,
    addCard,
    moveCard,
    removeCard,
    patchCard,
    reset,
    clearSpilled: () => setSpilled([]),
  };
}

export { draftFrom, footprintOf };
