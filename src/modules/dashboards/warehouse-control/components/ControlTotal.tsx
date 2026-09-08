import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

export interface ControlTotalProps {
  icon: LucideIcon;
  value: string;
  label: string;
  /** Tint the figure when it is the number that needs acting on. */
  tone?: 'default' | 'danger';
  className?: string;
}

/**
 * A running total inside a panel.
 *
 * Deliberately quieter than the headline `ControlStat`: those are the board's
 * six decisions, these are context for the list directly beneath them, and a row
 * of full-weight tiles inside every panel would flatten that hierarchy.
 */
export function ControlTotal({
  icon: Icon,
  value,
  label,
  tone = 'default',
  className,
}: ControlTotalProps) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2', className)}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-semibold tabular-nums',
            tone === 'danger' && 'text-rose-600 dark:text-rose-400',
          )}
          title={value}
        >
          {value}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
