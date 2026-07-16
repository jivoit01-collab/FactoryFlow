import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { Accent } from './accents';

export interface KpiStatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  accent: Accent;
  onClick?: () => void;
  /** entrance stagger, in ms */
  delayMs?: number;
  className?: string;
}

/**
 * A single KPI stat tile — soft light wash, glowing accent halo, and a lift on
 * hover. The value sits *below* the label on its own line so long numbers can
 * never collide with the label.
 */
export function KpiStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
  delayMs = 0,
  className,
}: KpiStatProps) {
  const interactive = !!onClick;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm',
        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        accent.glow,
        interactive && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {/* soft colour wash */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60',
          accent.wash,
        )}
      />
      {/* glowing halo, blooms on hover */}
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-80',
          accent.iconBg,
        )}
      />
      {/* top accent bar */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80', accent.bar)} />

      <div className="relative z-10 flex items-center justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            accent.iconBg,
          )}
        >
          <Icon className={cn('h-5 w-5', accent.icon)} />
        </div>
        {interactive && (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </div>

      <div className="relative z-10 mt-4 min-w-0">
        <div className="truncate text-2xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="mt-0.5 truncate text-sm font-medium text-muted-foreground">{label}</div>
        {sub && <div className="mt-1 truncate text-xs text-muted-foreground/80">{sub}</div>}
      </div>
    </div>
  );
}
