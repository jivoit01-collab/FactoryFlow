import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { type AccentKey, ACCENTS } from '@/shared/components/dashboard/accents';
import { cn } from '@/shared/utils';

/**
 * The quiet counterpart to `KpiStat`: a flat stat card for the strip above a
 * working list, where a row of glowing, lifting KPI tiles would shout over the
 * table that is the actual job. Same tinted chip as the hub tiles, so a page
 * of numbers still belongs to the same product.
 */
export interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small qualifier under the value — a unit, a share, a second figure. */
  sub?: ReactNode;
  icon?: LucideIcon;
  accent?: AccentKey;
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'slate',
  to,
  onClick,
  className,
}: StatTileProps) {
  const tone = ACCENTS[accent];
  const interactive = !!(to || onClick);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone.iconBg)}>
            <Icon className={cn('h-4 w-4', tone.icon)} />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </>
  );

  const classes = cn(
    'block rounded-xl border bg-card p-4 text-left shadow-sm',
    interactive &&
      'transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    interactive && tone.borderHover,
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cn(classes, 'w-full')} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

/** The row those tiles sit in: as many 180px columns as the page is wide. */
export function StatTileRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5', className)}>
      {children}
    </div>
  );
}
