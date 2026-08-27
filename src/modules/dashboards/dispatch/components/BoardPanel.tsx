import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

export interface BoardPanelProps {
  title: string;
  icon?: LucideIcon;
  /** Accent hex for the icon chip and the hairline above the title. */
  hex?: string;
  /** Right-hand slot — counts, badges, a legend. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Drop the inner padding when the child paints edge to edge (lists). */
  flush?: boolean;
}

/**
 * The wall's one surface: a translucent slab on the dark ground with a coloured
 * hairline on top. Panels are `min-h-0` flex columns so a list inside can own
 * the leftover height and scroll itself rather than pushing the board past the
 * screen — nothing below the fold exists on a wall display.
 */
export function BoardPanel({
  title,
  icon: Icon,
  hex,
  aside,
  children,
  className,
  flush,
}: BoardPanelProps) {
  return (
    <section
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]',
        className,
      )}
    >
      {hex && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)` }}
        />
      )}

      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${hex ?? '#94a3b8'}1f` }}
            >
              <Icon className="h-4 w-4" style={{ color: hex ?? '#94a3b8' }} />
            </span>
          )}
          <h2 className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            {title}
          </h2>
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>

      <div className={cn('flex min-h-0 flex-1 flex-col', flush ? 'px-0 pb-0' : 'px-4 pb-4')}>
        {children}
      </div>
    </section>
  );
}

/** A small stat chip for a panel header — "12 waiting", "3 late". */
export function PanelBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/5 text-slate-300',
    good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    warn: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    bad: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  } as const;

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** What a panel shows when its query came back with nothing. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
