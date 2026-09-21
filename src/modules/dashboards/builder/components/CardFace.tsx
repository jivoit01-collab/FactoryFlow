import { cn } from '@/shared/utils';

import { OpsGroup } from '../../logistics-control/components';
import type { BoardAccent, CardPayload } from '../types';
import { CardViz } from './CardViz';

/**
 * One card, drawn.
 *
 * The tile itself is `OpsGroup` — the same four-row tile (name, subtitle,
 * figure, visualisation) the Plant and Logistics boards are built from —
 * rather than a lookalike. Two tiles that are meant to read identically
 * across three boards should be one component, or they will drift the first
 * time somebody nudges a line-height.
 *
 * WHAT THIS FILE ADDS ON TOP OF IT
 * The hue, and the four ways a card can have nothing to show. `OpsGroup`
 * already distinguishes `loading` from `missing`; the board adds `withheld`
 * and `degraded`, which arrive as a null payload plus the card's key in one of
 * two lists on `meta`. Collapsing those into "no data" would be the exact
 * failure `control_boards/sections.py` exists to prevent: one of them sends an
 * operator to the server room and the other sends them to an administrator.
 */

/**
 * The hue classes. `ops-b-*` sets custom properties and nothing else, so
 * putting one on a card rather than on a band gives the tile the domain's
 * colours without any of the band's own geometry.
 */
const ACCENT_CLASS: Record<BoardAccent, string> = {
  warehouse: 'ops-b-warehouse',
  dispatch: 'ops-b-dispatch',
  transport: 'ops-b-transport',
  purchase: 'ops-b-purchase',
  store: 'ops-b-store',
  production: 'ops-b-production',
  shifting: 'ops-b-shifting',
};

/** Why a card is not showing a figure. Never conflated — see the docstring. */
export type CardAbsence = 'withheld' | 'degraded' | null;

const ABSENCE_REASON: Record<Exclude<CardAbsence, null>, string> = {
  withheld:
    'You do not hold the data right for this card. Ask an administrator for the matching Dashboards group.',
  degraded: 'This card could not be read just now. The source did not answer.',
};

export interface CardFaceProps {
  title: string;
  /**
   * The catalogue key, published to the DOM as `data-card`.
   *
   * For the handful of cards whose whole point is to look unlike a tile — the
   * section label is a coloured panel, not a figure with a blank where the
   * figure goes. Styling by key is narrow enough to be honest about: a card
   * that needs bespoke chrome says so here and in one CSS rule, rather than
   * every card gaining a `variant` field it will never set.
   */
  cardKey?: string;
  accent: BoardAccent;
  payload: CardPayload | null;
  absence: CardAbsence;
  loading?: boolean;
  /** Chrome the editor overlays — a remove button, a drag handle. */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardFace({
  title,
  cardKey,
  accent,
  payload,
  absence,
  loading = false,
  children,
  className,
  style,
}: CardFaceProps) {
  // Order matters. A card the reader may not see reads as withheld even while
  // the source is down, because whether somebody is allowed to see a tile has
  // nothing to do with whether the database is answering. Same ordering as
  // `SectionBuilder.section`, restated here because this is where a reader
  // actually meets the distinction.
  const missing = absence ? ABSENCE_REASON[absence] : (payload?.missing ?? undefined);

  return (
    <div
      className={cn('cbx-cell', ACCENT_CLASS[accent], className)}
      data-card={cardKey}
      style={style}
    >
      {children}
      <OpsGroup
        name={title}
        sub={payload?.sub ?? ''}
        value={payload?.value}
        unit={payload?.unit}
        tag={payload?.tag ? { label: payload.tag.label, tone: payload.tag.tone } : undefined}
        missing={missing}
        loading={loading}
        viz={
          payload?.viz && !missing ? (
            <>
              <CardViz viz={payload.viz} />
              {/* The card's own caption, under its visualisation. Only where
                  the card supplied one: a tile that needs a sentence to be
                  read is usually a tile answering two questions. */}
              {payload.note && <p className="cbx-note">{payload.note}</p>}
            </>
          ) : undefined
        }
      />
    </div>
  );
}

export { ACCENT_CLASS };
