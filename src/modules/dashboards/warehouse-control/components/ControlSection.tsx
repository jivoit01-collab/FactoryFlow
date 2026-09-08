import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

import type { ControlAccent } from '../constants/warehouse-control.theme';
import { ACCENTS } from '../constants/warehouse-control.theme';

export interface ControlSectionProps {
  /** Anchor target for the jump-to-section chips. */
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: ControlAccent;
  /** Short count/summary shown beside the title, e.g. "12 trucks". */
  meta?: string;
  isFetching?: boolean;
  /** Link to the full screen this panel summarises. */
  action?: { label: string; to: string };
  children: ReactNode;
  className?: string;
}

/**
 * The shell every panel shares.
 *
 * A coloured rule down the left edge carries the section's hue, so the reader
 * can tell the panels apart at a glance while scrolling on a phone. The header
 * wraps rather than truncating the action link, because a long title plus a link
 * does not fit on one line at phone width.
 */
export function ControlSection({
  id,
  title,
  description,
  icon: Icon,
  accent,
  meta,
  isFetching,
  action,
  children,
  className,
}: ControlSectionProps) {
  const accentClasses = ACCENTS[accent];

  return (
    <section
      id={id}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm scroll-mt-20',
        // A growing list needs a definite height to divide, and the grid needs a
        // row height to stretch its panels to. The floor stops a thin panel from
        // collapsing next to a full one; the ceiling stops a long list from
        // running the board off the screen — it scrolls inside instead. Both are
        // overridable per panel through `className` (twMerge keeps the last one).
        'min-h-[24rem] max-h-[36rem]',
        className,
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', accentClasses.rule)} />

      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b px-4 py-3 pl-5 sm:pl-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('shrink-0 rounded-lg p-2', accentClasses.chip)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold sm:text-lg">{title}</h3>
              {isFetching && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
            </div>
            {(meta || description) && (
              <p className="truncate text-xs text-muted-foreground" title={description}>
                {meta ?? description}
              </p>
            )}
          </div>
        </div>

        {action && (
          <Link
            to={action.to}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {/* A flex column, so a panel that opts in can hand its list the leftover
          height instead of leaving it blank under a short body. `min-h-0` is what
          lets that list scroll rather than pushing the card taller. */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 pl-5 sm:pl-6">{children}</div>
    </section>
  );
}
