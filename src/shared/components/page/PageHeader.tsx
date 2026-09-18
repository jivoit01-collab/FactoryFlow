import { ChevronLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { type AccentKey, ACCENTS } from '@/shared/components/dashboard/accents';
import { cn } from '@/shared/utils';

/**
 * The head of a working page — the same one the Dashboards landing wears, so a
 * screen reached from the sidebar and a board reached from the tiles read as
 * one product: title at 3xl semibold, description under it, actions to the
 * right, and an optional tinted icon chip in the module's accent.
 *
 * Actions wrap rather than overflow: several buttons beside a long title do not
 * fit on a narrow window, and a non-wrapping row pushed the page into a
 * horizontal scroll.
 */
export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Tinted chip to the left of the title. */
  icon?: LucideIcon;
  accent?: AccentKey;
  /** Route for a quiet "back" link above the title. */
  backTo?: string;
  backLabel?: string;
  /** Badges or pills that qualify the title — rendered on the title line. */
  meta?: ReactNode;
  /** Buttons, to the right on a wide window and under the title on a narrow one. */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  accent = 'slate',
  backTo,
  backLabel = 'Back',
  meta,
  children,
  className,
}: PageHeaderProps) {
  const tone = ACCENTS[accent];

  return (
    <header className={cn('space-y-3', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {Icon && (
            <span
              className={cn(
                'mt-0.5 hidden h-11 w-11 shrink-0 place-items-center rounded-[13px] sm:grid',
                tone.iconBg,
              )}
            >
              <Icon className={cn('h-5 w-5', tone.icon)} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
              {meta}
            </div>
            {description && <p className="mt-1.5 max-w-3xl text-muted-foreground">{description}</p>}
          </div>
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>
        )}
      </div>
    </header>
  );
}

/**
 * A titled band within a page — used where one screen carries several blocks
 * (a queue above a history, KPIs above a table) and each needs naming without
 * competing with the page title.
 */
export function PageSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3.5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
