/**
 * Plan-area geometry for non-storage cells (paths, gates, cabins…).
 *
 * Non-storage cells render edge-to-edge with no gaps so that contiguous cells of
 * the same purpose read as one solid "plan area" on the warehouse editor and the
 * map. This helper answers, for a single cell, two rendering questions from its
 * neighbours: which sides sit on the region's boundary (so we can outline it),
 * and whether this cell is the region's top-left (so we label it exactly once).
 *
 * `mergeKeyAt` returns a stable key for a cell that should merge (a non-storage
 * purpose id) or `null` for a cell that stands alone (storage, empty, outside).
 * Same non-null key on an orthogonally-adjacent cell means "same region".
 */
export interface RegionEdges {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface RegionShape {
  /** True on the top-left cell of a region — the one place we draw its label. */
  labelHere: boolean;
  /** Sides that sit on the region's outer boundary (for the outline). */
  edges: RegionEdges;
}

export function regionShapeAt(
  mergeKeyAt: (column: number, row: number) => string | null,
  column: number,
  row: number,
): RegionShape {
  const key = mergeKeyAt(column, row);
  const same = (c: number, r: number) => key !== null && mergeKeyAt(c, r) === key;
  return {
    labelHere: key !== null && !same(column - 1, row) && !same(column, row - 1),
    edges: {
      top: !same(column, row - 1),
      bottom: !same(column, row + 1),
      left: !same(column - 1, row),
      right: !same(column + 1, row),
    },
  };
}

/**
 * CSS `border-radius` for a region cell: round only the *convex outer* corners
 * (both meeting sides are on the boundary), so a merged area gets smooth rounded
 * corners while its interior edges stay flush. Concave corners (L-shapes) stay
 * square, which reads correctly.
 */
export function regionRadius(edges: RegionEdges, radius = 7): string {
  const tl = edges.top && edges.left ? radius : 0;
  const tr = edges.top && edges.right ? radius : 0;
  const br = edges.bottom && edges.right ? radius : 0;
  const bl = edges.bottom && edges.left ? radius : 0;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}
