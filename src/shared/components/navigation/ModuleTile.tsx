import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { AccentKey } from '@/shared/components/dashboard/accents';
import { cn } from '@/shared/utils';

/**
 * The soft tile every hub page in the app is built from: a tinted icon chip, a
 * title under it, and an optional footer (stat pills, a badge) pinned to the
 * bottom so tiles in a row stay aligned however long their titles run.
 *
 * Pass `to` for a router link — middle-click and open-in-new-tab keep working —
 * or `onClick` when the target is not a route.
 */

/** Grid the tiles sit in: as many 230px columns as the page is wide. */
export function ModuleTileGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5', className)}>
      {children}
    </div>
  );
}

/** Heading above a tile grid — a quiet label with the count beside it. */
export function ModuleTileGroupLabel({ label, count }: { label: string; count?: number }) {
  return (
    <p className="text-sm text-muted-foreground">
      {label}
      {count !== undefined && <span className="tabular-nums"> ({count})</span>}
    </p>
  );
}

export interface ModuleTileProps {
  title: string;
  icon: ReactNode;
  /**
   * @deprecated Kept so the eleven hub pages that pass it need no edit, but it
   * no longer sets a colour.
   *
   * Tiles used to take one of twelve accent hues, which put a rainbow of
   * saturated chips on every hub page — and once the app took a company colour
   * those hues fought it. A navigation tile's identity is its label and its
   * icon; the chip colour carried no information, so it now follows the theme
   * and every tile on a page matches.
   *
   * Accents are still meaningful where colour IS the information — the charts
   * and KPI panels that read `ACCENTS[...].hex` are untouched.
   */
  accent?: AccentKey;
  /** Route to open. Renders a link; omit and pass `onClick` for anything else. */
  to?: string;
  onClick?: () => void;
  /** Pinned to the bottom of the tile, e.g. stat pills. */
  footer?: ReactNode;
  className?: string;
}

const TILE_CLASSES =
  'flex min-h-[112px] flex-col items-start gap-[18px] rounded-xl border bg-card p-[18px] text-left shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function ModuleTile({ title, icon, to, onClick, footer, className }: ModuleTileProps) {
  const body = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-primary/10 dark:bg-primary/15">
        <span className="text-primary">{icon}</span>
      </span>
      <span className="text-[15px] font-semibold leading-snug">{title}</span>
      {footer}
    </>
  );

  const classes = cn(TILE_CLASSES, 'hover:border-primary/40', className);

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {body}
    </button>
  );
}
