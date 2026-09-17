import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { type AccentKey, ACCENTS } from '@/shared/components/dashboard/accents';
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

export function ModuleTile({
  title,
  icon,
  accent = 'slate',
  to,
  onClick,
  footer,
  className,
}: ModuleTileProps) {
  const tone = ACCENTS[accent];

  const body = (
    <>
      <span className={cn('grid h-10 w-10 place-items-center rounded-[11px]', tone.iconBg)}>
        <span className={tone.icon}>{icon}</span>
      </span>
      <span className="text-[15px] font-semibold leading-snug">{title}</span>
      {footer}
    </>
  );

  const classes = cn(TILE_CLASSES, tone.glow, tone.borderHover, className);

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
