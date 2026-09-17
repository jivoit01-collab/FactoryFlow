import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * The hues this board borrows, named for what they mean HERE.
 *
 * Deliberately the operations vocabulary's existing three rather than three new
 * ones. Two boards inventing their own teal is two teals, and this screen runs
 * in the same room as the Logistics and Plant boards — a reader who has learned
 * that teal means "space" should not have to relearn it one screen over.
 *
 * So the mapping is by MEANING, not by the class's original name: output
 * borrows the dispatch blue because it is about goods moving, storage borrows
 * the warehouse teal because it is about space, and cost borrows the transport
 * violet because that is the remaining hue and money is not a condition.
 */
export type AdminDomain = 'output' | 'storage' | 'cost';

const DOMAIN_CLASS: Record<AdminDomain, string> = {
  output: 'ops-b-dispatch',
  storage: 'ops-b-warehouse',
  cost: 'ops-b-transport',
};

export interface AdminBandProps {
  domain: AdminDomain;
  /** The vertical label on the rail. */
  title: string;
  /** The quieter half of the rail label — a window, a warehouse pair. */
  scope?: string;
  /** Relative widths of the tiles. */
  columns?: string;
  children: ReactNode;
}

/**
 * One band of the board: a coloured rail and its tiles.
 *
 * `OpsBand` is not reused here for one structural reason: it always renders a
 * workforce strip, and this board has none — every figure on it is a plant
 * total, and a per-band head count would be a different board. Rather than pass
 * an empty strip and hide it in CSS, which leaves a real column of dead space
 * in the grid, this drops the third column entirely.
 *
 * Everything else — the rail, the tile cards, every tint inside them — is the
 * shared `ops-*` vocabulary untouched.
 */
export function AdminBand({ domain, title, scope, columns, children }: AdminBandProps) {
  return (
    <section className={cn('ops-band', 'adm-band', DOMAIN_CLASS[domain])}>
      <div className="ops-rail">
        <p>
          {title} {scope && <em>{scope}</em>}
        </p>
      </div>

      <div
        className="ops-groups"
        style={{ gridTemplateColumns: columns ?? 'repeat(2, minmax(0, 1fr))' }}
      >
        {children}
      </div>
    </section>
  );
}

export interface AdminCornerProps {
  /** What the small figure is — "Today", "Space used". */
  label: string;
  value: string;
  unit?: string;
  /** The line under it, giving the figure something to be measured against. */
  note?: string;
}

/**
 * The second figure in a tile's corner.
 *
 * Exists because two of this board's questions have two time scales at once:
 * "how much did we produce this month" and "how much today" are the same
 * question asked twice, and a reader wants both without a second tile.
 *
 * The note underneath is not decoration. A bare "42.8 T" answers nothing on its
 * own — it is only meaningful against the month's average, so the comparison
 * travels with the number.
 */
export function AdminCorner({ label, value, unit, note }: AdminCornerProps) {
  return (
    <div className="adm-corner">
      <em>{label}</em>
      <b>
        {value}
        {unit && <u>{unit}</u>}
      </b>
      {note && <s>{note}</s>}
    </div>
  );
}
