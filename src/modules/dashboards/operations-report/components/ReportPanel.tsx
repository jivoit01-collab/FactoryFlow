import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { type AccentKey, ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

interface ReportPanelProps {
  title: string;
  /** One line under the title: what the panel counts, over what. */
  subtitle?: ReactNode;
  icon: LucideIcon;
  accent: AccentKey;
  /** Right of the header — a total, a legend. */
  aside?: ReactNode;
  className?: string;
  /** Drops the body padding, for a table that runs edge to edge. */
  flush?: boolean;
  children: ReactNode;
}

/**
 * The frame every block of the report wears. Flat — no lift on hover: this is
 * read at a desk and printed, not walked past, and a card that moves under the
 * pointer while somebody reads a table in it is a distraction.
 */
export function ReportPanel({
  title,
  subtitle,
  icon: Icon,
  accent,
  aside,
  className,
  flush,
  children,
}: ReportPanelProps) {
  const tone = ACCENTS[accent];

  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone.iconBg)}>
            <Icon className={cn('h-4 w-4', tone.icon)} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {aside && <div className="text-right text-sm">{aside}</div>}
      </header>
      <div className={cn(!flush && 'p-4')}>{children}</div>
    </section>
  );
}
