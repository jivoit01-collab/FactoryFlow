import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * The two bands, named for what they mean HERE.
 *
 * Deliberately two of the operations vocabulary's existing hues rather than two
 * new ones. This board runs in the same room as the Plant, Logistics and Admin
 * boards — and in the same carousel — so a reader who has learned what a colour
 * means must not have to relearn it one screen over.
 *
 * The mapping is by MEANING, not by the class's original name, which is the
 * precedent `AdminBand` set:
 *
 *  - `rolls` borrows the **production indigo**, because the directory is the
 *    plant's own people — the ones on the payroll, who are here tomorrow too.
 *  - `gate` borrows the **purchase teal**, because contract labour is bought in
 *    from outside for the day, which is the same relationship the purchase band
 *    has to material. The plant's own vocabulary already splits its workforce
 *    exactly this way: "on the payroll, or hired in".
 *
 * Green, amber and red are not used by either band. They are reserved across
 * the whole system for CONDITION, and neither a head count nor a gate count is
 * a condition — nobody is alarmed that 249 people work here.
 */
export type HrDomain = 'rolls' | 'gate';

const DOMAIN_CLASS: Record<HrDomain, string> = {
  rolls: 'ops-b-production',
  gate: 'ops-b-purchase',
};

export interface HrBandProps {
  domain: HrDomain;
  /** The vertical label on the rail. */
  title: string;
  /**
   * The quieter half of the rail label.
   *
   * Carries the SCOPE on this board, which matters more here than anywhere
   * else: one band is group-wide and the other follows the company switcher, so
   * a reader comparing the two numbers needs to see which is which without
   * being told. "All plants" against "Jivo Oil" says it in two words.
   */
  scope?: string;
  /** Relative widths of the tiles. Every track must be `minmax(0, …)`. */
  columns?: string;
  /** Why the band is empty, when it is. Replaces the tiles entirely. */
  unavailable?: string;
  children: ReactNode;
}

/**
 * One band of the board: a coloured rail and its tiles.
 *
 * `OpsBand` is not reused, for the same structural reason `AdminBand` does not
 * reuse it: it always renders a workforce strip down the right-hand side. On a
 * board whose entire subject is the workforce that strip would be a second,
 * quieter head count sitting beside the real one, taken from a different source
 * (the figures an operator types into the Plant board's settings) and free to
 * disagree with it. Two head counts on one screen is the one thing this board
 * must not show. So the third column is dropped rather than hidden — hiding it
 * in CSS leaves a real column of dead space in the grid.
 *
 * Everything else — the rail, the tile cards, every tint inside them — is the
 * shared `ops-*` vocabulary untouched.
 */
export function HrBand({ domain, title, scope, columns, children, unavailable }: HrBandProps) {
  return (
    <section className={cn('ops-band', 'hr-band', DOMAIN_CLASS[domain])}>
      <div className="ops-rail">
        <p>
          {title} {scope && <em>{scope}</em>}
        </p>
      </div>

      {unavailable ? (
        <div className="ops-groups" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="ops-grp" style={{ gridTemplateRows: 'auto' }}>
            <p className="ops-note">{unavailable}</p>
          </div>
        </div>
      ) : (
        <div
          className="ops-groups"
          style={{ gridTemplateColumns: columns ?? 'repeat(3, minmax(0, 1fr))' }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
