import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { ControlAccent } from '../constants/warehouse-control.theme';
import { ACCENTS } from '../constants/warehouse-control.theme';
import { ControlSkeletonBar } from './ControlStates';

export interface ControlStatProps {
  label: string;
  value: string;
  /** Secondary line — a unit, a share, or what the number is measured against. */
  hint?: string;
  icon: LucideIcon;
  accent?: ControlAccent;
  /** Draw the value in the accent hue. Reserve it for numbers that need action. */
  emphasise?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * One headline number.
 *
 * The value is the loudest thing in the tile and the label sits above it in
 * small caps, so a row of these reads as a line of numbers rather than a line of
 * words. Sized to stay legible at phone width, where four of them sit two-up.
 */
export function ControlStat({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'slate',
  emphasise = false,
  loading = false,
  className,
}: ControlStatProps) {
  const accentClasses = ACCENTS[accent];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 sm:p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn('shrink-0 rounded-md p-1.5', accentClasses.chip)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      {loading ? (
        <ControlSkeletonBar className="mt-2 h-7 w-20" />
      ) : (
        <p
          className={cn(
            'mt-1 truncate text-xl font-bold leading-tight tabular-nums sm:text-2xl',
            emphasise && accentClasses.text,
          )}
          title={value}
        >
          {value}
        </p>
      )}

      {hint && !loading && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
