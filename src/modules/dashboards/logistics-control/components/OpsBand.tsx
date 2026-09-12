import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import type { WorkforceStrip } from '../types';
import { OpsPeople } from './OpsPeople';

/**
 * The bands this vocabulary knows how to paint.
 *
 * The first three are the Logistics board's; the last four are the Plant
 * board's. They live in one list because the hue is the band's identity across
 * the whole product — two boards inventing their own teal would be two teals.
 */
export type OpsDomain =
  | 'warehouse'
  | 'dispatch'
  | 'transport'
  | 'purchase'
  | 'store'
  | 'production'
  | 'shifting';

const DOMAIN_CLASS: Record<OpsDomain, string> = {
  warehouse: 'ops-b-warehouse',
  dispatch: 'ops-b-dispatch',
  transport: 'ops-b-transport',
  purchase: 'ops-b-purchase',
  store: 'ops-b-store',
  production: 'ops-b-production',
  shifting: 'ops-b-shifting',
};

export interface OpsBandProps {
  domain: OpsDomain;
  /** The vertical label on the rail. */
  title: string;
  /** The quieter half of the rail label — a warehouse code, a company pair. */
  scope?: string;
  /** Relative widths of the tiles, e.g. `1.1fr 1.1fr .95fr .95fr`. */
  columns: string;
  children: ReactNode;
  people?: WorkforceStrip;
  /** Replaces the tiles when the reader may not see this band. */
  unavailable?: string;
}

/**
 * One domain of the board: a coloured rail, its tiles, and who is on shift.
 *
 * The rail carries the band's hue at full strength and is the only place the
 * domain is named, so the tiles inside are free to stay white and let their
 * figures do the work. Every tint inside the band derives from the same hue —
 * composition is always the domain colour at different weights, never a second
 * palette — which is what lets a reader bind a bar to its section from across a
 * room.
 */
export function OpsBand({
  domain,
  title,
  scope,
  columns,
  children,
  people,
  unavailable,
}: OpsBandProps) {
  return (
    <section className={cn('ops-band', DOMAIN_CLASS[domain])}>
      <div className="ops-rail">
        <p>
          {title} {scope && <em>{scope}</em>}
        </p>
      </div>

      {unavailable ? (
        <div className="ops-groups" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ops-grp" style={{ gridTemplateRows: 'auto' }}>
            <p className="ops-note">{unavailable}</p>
          </div>
        </div>
      ) : (
        <div className="ops-groups" style={{ gridTemplateColumns: columns }}>
          {children}
        </div>
      )}

      {people ? (
        <OpsPeople strip={people} />
      ) : (
        <div className="ops-people">
          <p className="ops-note">Team figures need factory expense access.</p>
        </div>
      )}
    </section>
  );
}
