/**
 * The small pieces the tank farm screens share: an oil's colour dot and name,
 * the segmented switch the screens flip their view with, and the bar a level
 * is drawn as in a table.
 */
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import { resolveColor } from './farm';

/** An oil's colour, as a dot. Decorative: the oil is always named beside it. */
export function OilDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3 w-3 shrink-0 rounded-full border border-black/10', className)}
      style={{ backgroundColor: resolveColor(color) }}
    />
  );
}

/** An oil by code and name, with its colour. */
export function OilLabel({
  code,
  name,
  color,
}: {
  code?: string | null;
  name?: string | null;
  color?: string | null;
}) {
  if (!code && !name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <OilDot color={color} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{name || code}</span>
        {name && code && name !== code && (
          <span className="block font-mono text-xs text-muted-foreground">{code}</span>
        )}
      </span>
    </span>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * A row of mutually exclusive buttons: the unit, the view, a grouping. With
 * `iconOnly`, each option shows its icon and carries its label for a screen
 * reader and a tooltip.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  iconOnly,
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  /** What the group chooses, for a screen reader. */
  label: string;
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex rounded-lg border p-0.5', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {!iconOnly && option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A level as a bar and a percentage, painted the oil's colour. */
export function FillBar({
  pct,
  color,
  className,
}: {
  pct: number;
  color?: string | null;
  className?: string;
}) {
  const width = Math.min(Math.max(pct, 0), 100);
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: resolveColor(color) }}
        />
      </span>
      <span className="w-12 text-right text-xs font-medium tabular-nums">
        {pct.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%
      </span>
    </span>
  );
}
