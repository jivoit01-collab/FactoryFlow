import { cn } from '@/shared/utils';

export type KpiTone = 'neutral' | 'ok' | 'warning' | 'critical';

const SURFACE: Record<KpiTone, string> = {
  neutral: 'bg-card border-border',
  ok: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  critical: 'border-destructive/30 bg-destructive/5',
};

const VALUE: Record<KpiTone, string> = {
  neutral: '',
  ok: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-destructive',
};

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Coloured only when it needs action, so a healthy plan reads quiet. */
  tone?: KpiTone;
  /** Omit to render a plain, non-interactive card. */
  onClick?: () => void;
  /** True when the table below is currently showing this card's subset. */
  active?: boolean;
  /** Explains what clicking does. Becomes the button's title and aria-label. */
  drillLabel?: string;
  className?: string;
}

/**
 * One headline number, optionally a way into the rows behind it.
 *
 * A KPI that cannot be opened is a dead end: it tells you 79 components are short
 * and leaves you to find them. So where a card represents a subset of a table on
 * the same screen, clicking it filters to exactly that subset, and clicking again
 * clears — a toggle rather than a one-way trip, because a filter you cannot undo
 * is worse than no filter.
 *
 * `active` matters as much as the click. Once a card has filtered the table, the
 * page is showing something narrower than its title claims, and the card that did
 * it has to be visibly the reason.
 *
 * Cards with nothing to drill into stay non-interactive rather than being given a
 * click that does nothing: one dead card teaches people the rest are unreliable.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
  active = false,
  drillLabel,
  className,
}: KpiCardProps) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', VALUE[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </>
  );

  if (!onClick) {
    return (
      <div className={cn('rounded-lg border p-3', SURFACE[tone], className)}>{body}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={drillLabel ?? `Show the rows behind ${label.toLowerCase()}`}
      aria-label={drillLabel ?? `Show the rows behind ${label.toLowerCase()}`}
      aria-pressed={active}
      className={cn(
        'rounded-lg border p-3 text-left transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        SURFACE[tone],
        active && 'ring-2 ring-primary ring-offset-1',
        className,
      )}
    >
      {body}
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary">
        {active ? 'Filtering · click to clear' : 'Click to view'}
      </p>
    </button>
  );
}

/** Consistent grid for a row of cards. */
export function KpiRow({
  children,
  columns = 4,
}: {
  children: React.ReactNode;
  columns?: 4 | 5;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3',
        columns === 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : 'lg:grid-cols-4',
      )}
    >
      {children}
    </div>
  );
}
